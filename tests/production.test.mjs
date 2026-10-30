import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,readdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import {pathToFileURL} from 'node:url';
import {blobsFixture,client} from './helpers.mjs';
import {createBlobRepository} from '../lib/blob-repository.mjs';

test('production frontend preserves design and calls the standard function directly',async()=>{
 for(const file of ['index.html','style.css'])assert.equal(await readFile('dist/'+file,'utf8'),await readFile('public/'+file,'utf8'));
 const app=await readFile('dist/app.js','utf8');assert(app.includes("fetch('/.netlify/functions/game'"));assert(!app.includes("fetch('/api'"));
 const config=await readFile('netlify.toml','utf8');assert(!config.includes('redirects'));assert(!config.includes('config.path'));
 assert.deepEqual((await readdir('netlify/functions')).sort(),['game.ts']);
 const source=await readFile('netlify/functions/game.ts','utf8');assert(!source.includes('config.path'));assert(!source.includes('export const config'));
 const build=JSON.parse(await readFile('artifacts/build-summary.json','utf8'));assert.equal(build.functions.length,1);assert.equal(build.functions[0].name,'game');
});

test('packaged Netlify function loads and completes a three-round two-player game with SDK storage',async()=>{
 const tmp=await mkdtemp(path.join(os.tmpdir(),'rumble-function-'));
 execFileSync('python3',['-c','import sys,zipfile; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])',path.resolve('artifacts/functions/game.zip'),tmp]);
 const metadata=JSON.parse(await readFile(path.join(tmp,'___netlify-metadata.json'),'utf8'));assert(metadata);
 const fixture=await blobsFixture();const oldNow=Date.now;const oldContext=globalThis.netlifyBlobsContext;let time=100000;
 try{
  globalThis.netlifyBlobsContext=Buffer.from(JSON.stringify(fixture.context)).toString('base64');Date.now=()=>time;
  const {default:handler}=await import(pathToFileURL(path.join(tmp,'netlify/functions/game.mjs')));
  const call=client(handler);const repository=createBlobRepository(fixture.store);
  const hostResult=await call('create',{}, {name:'Production Host',settings:{rounds:3,bluffTime:20,voteTime:10,bots:0}});assert.equal(hostResult.status,200,JSON.stringify(hostResult.data));const host=hostResult.data;
  const guest=(await call('join',{code:host.code},{name:'Production Guest'})).data;
  const start=await call('start',host);assert.equal(start.data.totalRounds,3);
  for(let round=1;round<=3;round++){
   assert.equal((await call('state',host)).data.round,round);
   await call('submit',host,{text:'A convincing fake '+round});await call('submit',guest,{text:'A different fake '+round});
   const room=(await repository.read(host.code)).room;
   await call('vote',host,{choice:room.options.find(o=>o.truth).id});
   await call('vote',guest,{choice:room.options.find(o=>o.authors.includes(room.players[0].id)).id});
   const reveal=(await call('state',host)).data;assert.equal(reveal.phase,'reveal');assert.equal(reveal.players.find(p=>p.id===reveal.me).score,round*1500);
   time+=5000;await call('state',host);await call('state',guest);time+=5000;await call('state',host);await call('state',guest);
  }
  const final=(await call('state',host)).data;assert.equal(final.phase,'finished');assert.equal(final.players.find(p=>p.id===final.me).score,4500);assert.equal(final.players.find(p=>p.id!==final.me).score,0);assert.deepEqual(final.winners,[final.me]);assert.equal(final.questionBank.remaining,497);
 }finally{Date.now=oldNow;if(oldContext===undefined)delete globalThis.netlifyBlobsContext;else globalThis.netlifyBlobsContext=oldContext;await fixture.close();await rm(tmp,{recursive:true,force:true});}
});
