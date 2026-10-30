import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from './engine.mjs';
function setup(count=2){let time=1000;const game=new Game({now:()=>time,durations:{write:40,vote:20,reveal:10,pause:60}});const seats=[game.action({action:'create',name:'Host'})];for(let i=1;i<count;i++)seats.push(game.action({action:'join',code:seats[0].code,name:'Player '+i}));const r=game.room(seats[0].code);const action=(i,action,extra={})=>game.action({...seats[i],action,...extra});action(0,'start');return {game,r,seats,action,advance:n=>{time+=n;game.tick(r);},setTime:n=>{time=n;}};}
test('five-round duel: private four-choice ballots, scoring, winner, and rematch',()=>{const {r,action,advance}=setup();for(let n=1;n<=5;n++){assert.equal(r.round,n);action(0,'submit',{text:'Host bluff '+n});action(1,'submit',{text:'Other bluff '+n});assert.equal(r.phase,'vote');for(let i=0;i<2;i++){const s=action(i,'state');assert.equal(s.options.length,4);assert(!('truth'in s));assert(!('correct'in s));for(const o of s.options)assert.deepEqual(Object.keys(o).sort(),['id','text']);assert(!s.options.some(o=>o.text===(i?'Other bluff ':'Host bluff ')+n));}
 const truth=r.options.find(o=>o.truth);const hostBluff=r.options.find(o=>o.authors.includes(r.players[0].id));action(0,'vote',{choice:truth.id});action(1,'vote',{choice:hostBluff.id});assert.equal(r.phase,'reveal');assert.equal(r.players[0].score,1500*n);assert.equal(r.players[1].score,0);advance(10);}
assert.equal(r.phase,'finished');assert.deepEqual(action(0,'state').winners,[r.players[0].id]);action(0,'start');assert.equal(r.phase,'write');assert.equal(r.round,1);assert(r.players.every(p=>p.score===0));});
test('eight players finish five rounds and tie fairly',()=>{const {r,action,advance,game}=setup(8);assert.throws(()=>game.join(r.code,'Ninth'),/full/);for(let n=0;n<5;n++){for(let i=0;i<8;i++)action(i,'submit',{text:'Bluff '+i});for(let i=0;i<8;i++){const own=r.options.find(o=>o.authors.includes(r.players[i].id));assert(!r.choices[r.players[i].id].includes(own.id));action(i,'vote',{choice:r.options.find(o=>o.truth).id});}advance(10);}assert.equal(r.phase,'finished');assert.equal(action(0,'state').winners.length,8);assert(r.players.every(p=>p.score===5000));});
test('identical bluffs merge; authors cannot vote for their shared answer',()=>{const {r,action}=setup(3);action(0,'submit',{text:'A strange idea'});action(1,'submit',{text:'a strange idea!'});action(2,'submit',{text:'Another idea'});const o=r.options.find(o=>o.authors.length===2);assert(o);for(let i=0;i<2;i++)assert.throws(()=>action(i,'vote',{choice:o.id}),/available/);action(2,'vote',{choice:o.id});action(0,'vote',{choice:r.options.find(o=>o.truth).id});action(1,'vote',{choice:r.options.find(o=>o.truth).id});assert.equal(r.players[0].score,1500);assert.equal(r.players[1].score,1500);});
test('recognized correct submissions skip voting and never double award',()=>{const {r,action,advance}=setup();action(0,'submit',{text:r.q.truth.toUpperCase()});action(1,'submit',{text:'A bluff'});assert.equal(action(0,'state').foundTruth,true);assert.throws(()=>action(0,'vote',{choice:r.options[0].id}),/already found/);action(1,'vote',{choice:r.options[0].id});assert.equal(r.players[0].score,1000);for(let i=0;i<5;i++)action(0,'state');assert.equal(r.players[0].score,1000);advance(10);assert.equal(r.players[0].score,1000);});
test('decoy collisions retain player ownership and keep four choices',()=>{const {r,action}=setup();const d=r.q.decoys[0];action(0,'submit',{text:d});action(1,'submit',{text:'Novel answer'});assert.equal(r.options.filter(o=>o.text===d).length,1);assert.equal(r.options.find(o=>o.text===d).authors[0],r.players[0].id);assert.equal(action(1,'state').options.length,4);});
test('missed deadlines advance and late actions are rejected',()=>{const {r,action,advance}=setup();advance(40);assert.equal(r.phase,'vote');assert.throws(()=>action(0,'submit',{text:'Late'}),/closed/);advance(20);assert.equal(r.phase,'reveal');assert(r.players.every(p=>p.score===0));assert.throws(()=>action(0,'vote',{choice:'bad'}),/closed/);advance(10);assert.equal(r.round,2);});
test('host transfer, pause, reconnect, and incomplete match',()=>{const {game,r,action,setTime,advance}=setup();setTime(12000);action(1,'state');assert.equal(r.host,r.players[1].id);setTime(13000);action(0,'state');assert.equal(r.players[0].lastSeen,13000);setTime(24000);action(1,'state');assert.equal(r.phase,'paused');assert.equal(r.host,r.players[1].id);action(0,'state');assert.equal(r.phase,'write');assert.equal(r.round,2);setTime(40000);game.tick(r);assert.equal(r.phase,'vote');advance(20);assert.equal(r.phase,'reveal');advance(10);assert.equal(r.phase,'paused');advance(60);assert.equal(r.phase,'incomplete');});
test('late joins wait, authentication works, repeat actions cannot alter answers',()=>{const {game,r,action}=setup();const late=game.join(r.code,'Late guest');const s=game.action({...late,action:'state'});assert.equal(s.spectator,true);assert.throws(()=>game.action({...late,action:'submit',text:'No'}),/closed/);assert.throws(()=>game.action({code:r.code,token:'bad',action:'state'}),/seat/);assert.throws(()=>action(1,'start'),/host/);action(0,'submit',{text:'Locked'});assert.throws(()=>action(0,'submit',{text:'Changed'}),/locked/);assert.equal(action(0,'state').submission,'Locked');assert.throws(()=>action(1,'submit',{text:' '.repeat(3)}),/answer/);});

test('the bank has exactly 500 unique valid prompts in the approved category split',async()=>{
 const {default:bank}=await import('./questions.mjs');const {norm}=await import('./engine.mjs');
 assert.equal(bank.length,500);assert.equal(new Set(bank.map(q=>q.id)).size,500);assert.equal(new Set(bank.map(q=>norm(q.question))).size,500);
 const counts=bank.reduce((a,q)=>(a[q.category]=(a[q.category]||0)+1,a),{});assert.deepEqual(counts,{funny:150,tricky:150,general:100,riddle:100});
 for(const q of bank){assert(q.question.length>15,q.question);assert(q.truth.length>0);assert(q.decoys.length>=4,q.question);assert.equal(new Set(q.decoys.map(norm)).size,q.decoys.length,q.question);const correct=[q.truth,...q.aliases].map(norm);assert(q.decoys.every(d=>!correct.includes(norm(d))),q.question);}
});
test('all 500 questions play once across 100 complete mixed-category matches, then require reset',()=>{
 const {game,r,action,advance}=setup();const seen=new Set();
 for(let match=0;match<100;match++){
  if(match)action(0,'start');assert.equal(new Set(r.deck.map(q=>q.category)).size,4);
  for(let round=0;round<5;round++){
   assert(!seen.has(r.q.id),'Repeated question: '+r.q.question);seen.add(r.q.id);
   action(0,'submit',{text:r.q.truth});action(1,'submit',{text:r.q.truth});assert.equal(r.phase,'reveal');advance(10);
  }
  assert.equal(r.phase,'finished');
 }
 assert.equal(seen.size,500);assert.equal(action(0,'state').questionBank.remaining,0);
 assert.throws(()=>action(0,'start'),/reset question history/);assert.throws(()=>action(1,'resetQuestions'),/host/);
 action(0,'resetQuestions');assert.equal(action(0,'state').questionBank.remaining,500);action(0,'start');assert.equal(r.round,1);assert.equal(r.phase,'write');assert.equal(game.available(r).length,495);
});
test('question history persists through save/reload and cannot reset prematurely',()=>{
 const {game,r,seats,action}=setup();assert.throws(()=>action(0,'resetQuestions'),/Finish/);
 r.phase='finished';assert.throws(()=>action(0,'resetQuestions'),/Unused/);
 const restored=new Game({now:()=>1000});restored.rooms=new Map(JSON.parse(JSON.stringify([...game.rooms])));
 assert.equal(restored.available(restored.room(r.code)).length,495);const before=new Set(r.deck.map(q=>q.id));restored.action({...seats[0],action:'start'});assert(restored.room(r.code).deck.every(q=>!before.has(q.id)));
});
test('every question supports two matching bluffs, shared correct submissions, and eight missing submissions',async()=>{
 const {default:bank}=await import('./questions.mjs');const {norm}=await import('./engine.mjs');
 for(const q of bank){
  for(const scenario of ['duplicate','correct','timeout']){
   const count=scenario==='timeout'?8:2;const {r,action,advance}=setup(count);r.q=q;
   if(scenario==='timeout')advance(40);else for(let i=0;i<count;i++)action(i,'submit',{text:scenario==='correct'?q.truth:'Same invented bluff'});
   if(scenario==='correct'){assert.equal(r.phase,'reveal');assert(r.players.every(p=>p.score===1000));continue;}
   assert.equal(r.phase,'vote');
   for(let i=0;i<count;i++){const s=action(i,'state');assert(s.options.length>=4,q.question);assert.equal(new Set(s.options.map(o=>norm(o.text))).size,s.options.length,q.question);assert(!s.options.some(o=>o.text==='Same invented bluff'));}
  }
 }
});
test('normalization preserves mathematical signs, decimal points, and fractions',async()=>{
 const {norm}=await import('./engine.mjs');assert.notEqual(norm('-10'),norm('10'));assert.notEqual(norm('1/2'),norm('12'));assert.notEqual(norm('0.25'),norm('025'));assert.equal(norm('BALL!'),norm('ball'));assert.equal(norm('−10'),norm('-10'));
});
test('wordplay anagrams use exactly the supplied letters',async()=>{const {default:bank}=await import('./questions.mjs');for(const q of bank){const match=q.question.match(/^Rearrange ([A-Z]+) /);if(match)assert.equal([...q.truth.toLowerCase()].sort().join(''),[...match[1].toLowerCase()].sort().join(''),q.question);}});

test('settings validate all choices and prevent invalid or excessive bot counts',()=>{
 for(const settings of [{rounds:4},{bluffTime:0},{voteTime:999},{bots:8},{bots:-1},{bots:1.5},{rounds:'5'},null])assert.throws(()=>new Game().create('Host',settings));
 const game=new Game(),seat=game.create('Host',{bots:7}),r=game.room(seat.code);assert.equal(r.players.length,8);assert.equal(r.players.filter(p=>p.bot).length,7);assert.throws(()=>game.join(r.code,'Ninth'),/full/);assert.throws(()=>game.action({code:r.code,token:r.players[1].token,action:'start'}),/seat/);
});
test('only the human host can configure idle rooms; settings lock during gameplay',()=>{
 const game=new Game();const host=game.create('Host'),guest=game.join(host.code,'Guest');
 assert.throws(()=>game.action({...guest,action:'configure',settings:{bots:1}}),/host/);
 assert.throws(()=>game.action({...host,action:'configure',settings:{bots:7}}),/6 bot seats/);
 const s=game.action({...host,action:'configure',settings:{rounds:3,bluffTime:20,voteTime:10,bots:1}});assert.equal(s.settings.rounds,3);assert.equal(s.players.length,3);
 game.action({...host,action:'start'});assert.throws(()=>game.action({...host,action:'configure',settings:{rounds:10}}),/locked/);
});
test('3, 5, 7, and 10 round matches finish at the selected round with correct scores',()=>{
 for(const rounds of [3,5,7,10]){let time=0;const game=new Game({now:()=>time,durations:{write:40,vote:20,reveal:1,pause:60}});const a=game.create('A',{rounds}),b=game.join(a.code,'B');game.action({...a,action:'start'});const r=game.room(a.code);assert.equal(r.deck.length,rounds);for(let i=1;i<=rounds;i++){assert.equal(r.round,i);game.action({...a,action:'submit',text:r.q.truth});game.action({...b,action:'submit',text:r.q.truth});time++;game.tick(r);}assert.equal(r.phase,'finished');assert(r.players.every(p=>p.score===rounds*1000));assert.equal(game.action({...a,action:'state'}).totalRounds,rounds);}
});
test('configured bluff and vote timers apply precisely and survive serialization',()=>{
 let time=100;const game=new Game({now:()=>time});const a=game.create('A',{bluffTime:90,voteTime:45}),b=game.join(a.code,'B');game.action({...a,action:'start'});const r=game.room(a.code);assert.equal(r.deadline-time,90000);game.action({...a,action:'submit',text:'A bluff'});game.action({...b,action:'submit',text:'B bluff'});assert.equal(r.deadline-time,45000);
 const restored=new Game({now:()=>time});restored.rooms=new Map(JSON.parse(JSON.stringify([...game.rooms])));assert.equal(restored.action({...a,action:'state'}).settings.voteTime,45);time+=45000;restored.tick(restored.room(a.code));assert.equal(restored.room(a.code).phase,'reveal');
});
test('solo humans can complete a full match with one or seven bots; bot votes use only eligible choices',()=>{
 for(const bots of [1,7]){let time=0;const game=new Game({now:()=>time,durations:{write:40,vote:20,reveal:10,pause:60}});const seat=game.create('Human',{rounds:3,bots});game.action({...seat,action:'start'});const r=game.room(seat.code);
 for(let round=1;round<=3;round++){game.action({...seat,action:'submit',text:'Human invention'});time+=20;game.action({...seat,action:'state'});assert.equal(r.phase,'vote');for(const p of r.players.filter(p=>p.bot)){assert(r.submissions[p.id]);assert(!r.submissions[p.id].correct);const payload=game.action({...seat,action:'state'});assert(!('token'in payload.players.find(x=>x.id===p.id)));}
 game.action({...seat,action:'vote',choice:r.choices[r.players[0].id][0]});time+=10;game.action({...seat,action:'state'});assert.equal(r.phase,'reveal');for(const p of r.players.filter(p=>p.bot)){assert(r.choices[p.id].includes(r.votes[p.id]));assert(!r.options.find(o=>o.id===r.votes[p.id]).authors.includes(p.id));}time+=10;game.action({...seat,action:'state'});}
 assert.equal(r.phase,'finished');assert.equal(game.action({...seat,action:'state'}).winners.length>=1,true);
 }
});
test('bots never become host and cannot continue without a connected human',()=>{
 let time=0;const game=new Game({now:()=>time,durations:{write:40,vote:20,reveal:10,pause:60}});const seat=game.create('Host',{bots:1});game.action({...seat,action:'start'});const r=game.room(seat.code);time=11000;game.tick(r);assert.equal(r.host,r.players[0].id);time+=20;game.tick(r);time+=10;game.tick(r);assert.equal(r.phase,'paused');time+=60;game.tick(r);assert.equal(r.phase,'incomplete');
});
test('remaining questions require a shorter match before an explicit reset',async()=>{
 const {default:bank}=await import('./questions.mjs');const game=new Game();const seat=game.create('Host',{rounds:10,bots:1}),r=game.room(seat.code);r.usedQuestionIds=bank.slice(0,493).map(q=>q.id);assert.throws(()=>game.action({...seat,action:'start'}),/fewer rounds/);assert.throws(()=>game.action({...seat,action:'resetQuestions'}),/shorter match/);game.action({...seat,action:'configure',settings:{rounds:7,bots:1}});game.action({...seat,action:'start'});assert.equal(r.deck.length,7);assert.equal(game.available(r).length,0);
});
test('editing settings after a match returns to a fresh lobby and keeps question history',()=>{
 const {game,r,action}=setup();r.phase='finished';const used=r.usedQuestionIds.length;const s=action(0,'configure',{settings:{bots:1,rounds:3}});assert.equal(s.phase,'lobby');assert.equal(s.players.length,3);assert.equal(s.totalRounds,3);assert.equal(r.usedQuestionIds.length,used);assert(r.players.every(p=>p.score===0));
});
