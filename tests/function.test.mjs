import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createGameHandler} from '../lib/function-service.mjs';
import {createBlobRepository} from '../lib/blob-repository.mjs';
import {client,memoryRepository,blobsFixture} from './helpers.mjs';

async function completeThreeRounds(repository,{concurrent=true}={}){
 let time=100000;const handler=createGameHandler({repository,now:()=>time});const call=client(handler);
 const host=(await call('create',{}, {name:'Host',settings:{rounds:3,bluffTime:20,voteTime:10,bots:0}})).data;
 const guest=(await call('join',{code:host.code},{name:'Guest'})).data;
 assert.equal((await call('start',host)).data.totalRounds,3);
 for(let round=1;round<=3;round++){
  const before=(await call('state',host)).data;assert.equal(before.round,round);assert.equal(before.phase,'write');
  assert.equal((await call('submit',host,{text:'Host fake '+round})).status,200);
  const privateState=await call('submit',guest,{text:'Guest fake '+round});assert.equal(privateState.data.phase,'vote');
  const authoritative=(await repository.read(host.code)).room;const truth=authoritative.options.find(o=>o.truth).id;const bluff=authoritative.options.find(o=>o.authors.includes(authoritative.players[0].id)).id;
  const payload=(await call('state',guest)).data;assert(!('truth'in payload));assert(payload.options.every(o=>Object.keys(o).sort().join(',')==='id,text'));
  const voteId=randomUUID();if(concurrent)await Promise.all([call('vote',host,{choice:truth}),call('vote',guest,{choice:bluff,requestId:voteId})]);else{await call('vote',host,{choice:truth});await call('vote',guest,{choice:bluff,requestId:voteId});}
  // An HTTP retry must replay its committed result and never reapply scoring.
  assert.equal((await call('vote',guest,{choice:bluff,requestId:voteId})).status,200);
  const reveal=(await call('state',host)).data;assert.equal(reveal.phase,'reveal');assert.equal(reveal.players.find(p=>p.id===reveal.me).score,1500*round);
  time+=5000;await call('state',host);await call('state',guest);time+=5000;await call('state',host);await call('state',guest);
 }
 const final=(await call('state',host)).data;assert.equal(final.phase,'finished');assert.equal(final.players.find(p=>p.id===final.me).score,4500);assert.equal(final.players.find(p=>p.id!==final.me).score,0);assert.deepEqual(final.winners,[final.me]);assert.equal(final.questionBank.remaining,497);
 return {winner:'Host',hostScore:4500,guestScore:0,rounds:3};
}
test('full three-round two-player HTTP game, concurrent votes, scoring and winner',async()=>{await completeThreeRounds(memoryRepository());});
test('full three-round HTTP game through the real Netlify Blobs SDK and local Blobs server',async()=>{const fixture=await blobsFixture();try{await completeThreeRounds(createBlobRepository(fixture.store),{concurrent:false});}finally{await fixture.close();}});
test('parallel joins never exceed capacity; updates survive cold handler instances',async()=>{
 const repository=memoryRepository();const host=(await client(createGameHandler({repository}))('create',{}, {name:'Host'})).data;
 const results=await Promise.all(Array.from({length:12},(_,i)=>client(createGameHandler({repository}))('join',{code:host.code},{name:'Guest '+i})));
 assert.equal(results.filter(r=>r.status===200).length,7);assert.equal((await repository.read(host.code)).room.players.length,8);
});
test('idempotent creates and joins share one room and seat',async()=>{
 const repository=memoryRepository();const call=client(createGameHandler({repository}));const requestId=randomUUID();
 const results=await Promise.all([call('create',{}, {name:'Host',requestId}),call('create',{}, {name:'Host',requestId})]);assert.deepEqual(results[0].data,results[1].data);assert.equal(repository.records.size,1);
 const host=results[0].data;const joinId=randomUUID();const joins=await Promise.all([call('join',{code:host.code},{name:'Guest',requestId:joinId}),call('join',{code:host.code},{name:'Guest',requestId:joinId})]);assert.deepEqual(joins[0].data,joins[1].data);assert.equal((await repository.read(host.code)).room.players.length,2);
 assert.equal((await call('join',{code:host.code},{name:'Someone else',requestId:joinId})).status,409);
});
test('conditional conflicts never return uncommitted success',async()=>{
 const repository=memoryRepository();const call=client(createGameHandler({repository,maxAttempts:2}));const host=(await call('create',{}, {name:'Host'})).data;
 const blocked=client(createGameHandler({repository:{...repository,write:async()=>false},maxAttempts:2}));assert.equal((await blocked('join',{code:host.code},{name:'Guest'})).status,409);assert.equal((await repository.read(host.code)).room.players.length,1);
});
test('catch-up advances missed deadlines and pauses without a background process',async()=>{
 let time=0;const repository=memoryRepository(),call=client(createGameHandler({repository,now:()=>time}));const host=(await call('create',{}, {name:'Host',settings:{rounds:3,bluffTime:20,voteTime:10,bots:1}})).data;await call('start',host);
 time=120000;const result=(await call('state',host)).data;assert.equal(result.phase,'incomplete');assert(result.players.some(p=>p.bot));
});
test('HTTP method, JSON, size, origin, authentication and room expiry are checked',async()=>{
 let time=0;const repository=memoryRepository(),handler=createGameHandler({repository,now:()=>time}),call=client(handler);
 assert.equal((await handler(new Request('https://test.netlify.app/.netlify/functions/game'))).status,405);
 assert.equal((await handler(new Request('https://test.netlify.app/.netlify/functions/game',{method:'POST',body:'bad'}))).status,400);
 assert.equal((await handler(new Request('https://test.netlify.app/.netlify/functions/game',{method:'POST',body:'x'.repeat(5000)}))).status,413);
 assert.equal((await handler(new Request('https://test.netlify.app/.netlify/functions/game',{method:'POST',headers:{origin:'https://evil.example'},body:'{}'}))).status,403);
 const host=(await call('create',{}, {name:'Host'})).data;assert.equal((await call('state',{...host,token:'invalid'})).status,400);time=86400001;assert.equal((await call('state',host)).status,404);
});
test('SDK adapter requests strong reads and conditional-only writes',async()=>{
 const calls=[];const repo=createBlobRepository({getWithMetadata:async(...args)=>{calls.push(args);return {data:{code:'ABC234'},etag:'v1'};},setJSON:async(...args)=>{calls.push(args);return {modified:true};}});
 await repo.read('ABC234');await repo.write('ABC234',{},null);await repo.write('ABC234',{},'v1');assert.equal(calls[0][1].consistency,'strong');assert.deepEqual(calls[1][2],{onlyIfNew:true});assert.deepEqual(calls[2][2],{onlyIfMatch:'v1'});
});
