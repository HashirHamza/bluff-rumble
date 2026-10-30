import {randomBytes,randomInt} from 'node:crypto';
import questions from './questions.mjs';
export const norm=s=>{const text=String(s).normalize('NFKC').replace(/[−–]/g,'-').trim().toLowerCase();return /^[-+]?\d/.test(text)?text.replace(/[^\p{L}\p{N}./%+-]/gu,''):text.replace(/[^\p{L}\p{N}]/gu,'');};
const id=()=>randomBytes(16).toString('hex');
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=randomInt(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;};
const fail=message=>{throw new Error(message);};
export const DEFAULT_SETTINGS=Object.freeze({rounds:5,bluffTime:40,voteTime:20,bots:0});
export function validateSettings(input={}){
 if(!input||typeof input!=='object'||Array.isArray(input))fail('Choose valid game settings.');
 const s={...DEFAULT_SETTINGS,...input};
 for(const [key,allowed] of Object.entries({rounds:[3,5,7,10],bluffTime:[20,40,60,90],voteTime:[10,20,30,45]}))if(!allowed.includes(s[key]))fail(`Invalid ${key} setting.`);
 if(!Number.isInteger(s.bots)||s.bots<0||s.bots>7)fail('Choose between 0 and 7 computer players.');
 return {rounds:s.rounds,bluffTime:s.bluffTime,voteTime:s.voteTime,bots:s.bots};
}
export class Game {
 constructor({now=()=>Date.now(),durations={write:40000,vote:20000,reveal:10000,pause:60000}}={}){this.rooms=new Map();this.now=now;this.d=durations;}
 player(name){name=String(name||'').trim();if(!name||name.length>20)fail('Enter a name between 1 and 20 characters.');return {id:id(),token:id(),name,score:0,lastSeen:this.now()};}
 settings(r){return r.settings||{...DEFAULT_SETTINGS};}
 setBots(r,count){const humans=r.players.filter(p=>!p.bot);if(humans.length+count>8)fail(`Only ${8-humans.length} bot seats are available with ${humans.length} human players.`);const existing=r.players.filter(p=>p.bot).slice(0,count);r.players=[...humans,...existing];let n=1;while(r.players.filter(p=>p.bot).length<count){let name;do{name='Rumble Bot '+n++;}while(r.players.some(p=>p.name.toLowerCase()===name.toLowerCase()));r.players.push({...this.player(name),bot:true});}}
 create(name,settings={}){const p=this.player(name),s=validateSettings(settings);let code;do{code=Array.from({length:6},()=> 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[randomInt(32)]).join('');}while(this.rooms.has(code));const r={code,players:[p],host:p.id,phase:'lobby',round:0,settings:s,created:this.now(),updated:this.now()};this.setBots(r,s.bots);this.rooms.set(code,r);return {code,token:p.token};}
 join(code,name){const r=this.room(code),p=this.player(name);if(r.players.length>=8)fail('This room is full (8 players). Ask the host to reduce bots before joining.');if(r.players.some(x=>x.name.toLowerCase()===p.name.toLowerCase()))fail('That name is already taken.');p.waiting=!['lobby','finished','incomplete'].includes(r.phase);r.players.push(p);return {code:r.code,token:p.token};}
 room(code){const r=this.rooms.get(String(code||'').toUpperCase());if(!r)fail('Room not found. Check the room code.');return r;}
 auth(r,token){const p=r.players.find(p=>p.token===token&&!p.bot);if(!p)fail('Your seat could not be found. Join the room again.');return p;}
 online(p){return !!p.bot||this.now()-p.lastSeen<10000;}
 active(r){return r.players.filter(p=>r.roster?.includes(p.id));}
 canContinue(r){const active=this.active(r).filter(p=>this.online(p));return active.length>=2&&active.some(p=>!p.bot);}
 history(r){if(!r.usedQuestionIds){const oldDeck=r.deck||[];r.usedQuestionIds=questions.filter(q=>oldDeck.some(old=>norm(old.question)===norm(q.question))).map(q=>q.id);}return new Set(r.usedQuestionIds);}
 available(r){const used=this.history(r);return questions.filter(q=>!used.has(q.id));}
 configure(r,p,input){if(p.id!==r.host)fail('Only the host can change game settings.');if(!['lobby','finished','incomplete'].includes(r.phase))fail('Settings are locked during a match.');const s=validateSettings(input);this.setBots(r,s.bots);r.settings=s;if(r.phase!=='lobby'){r.phase='lobby';r.round=0;r.roster=undefined;r.deck=[];r.matchSettings=undefined;r.submissions={};r.votes={};r.players.forEach(p=>{p.score=0;p.waiting=false;});}}
 start(r,p){
  if(p.id!==r.host)fail('Only the host can start the game.');if(!['lobby','finished','incomplete'].includes(r.phase))fail('A game is already running.');
  const players=r.players.filter(p=>this.online(p));if(players.length<2)fail('At least 2 players are needed. Invite a friend or add a bot.');
  const settings=this.settings(r);let remaining=this.available(r);if(remaining.length<settings.rounds)fail(`Only ${remaining.length} unused questions remain. Choose fewer rounds, or reset question history when fewer than 3 remain.`);
  const deck=[];
  for(const category of shuffle(['funny','tricky','general','riddle'])){if(deck.length>=settings.rounds)break;const pool=remaining.filter(q=>q.category===category);if(pool.length){const pick=shuffle(pool)[0];deck.push(pick);remaining=remaining.filter(q=>q.id!==pick.id);}}
  while(deck.length<settings.rounds){const counts=remaining.reduce((a,q)=>(a[q.category]=(a[q.category]||0)+1,a),{});const category=Object.keys(counts).sort((a,b)=>counts[b]-counts[a])[0];const pick=shuffle(remaining.filter(q=>q.category===category))[0];deck.push(pick);remaining=remaining.filter(q=>q.id!==pick.id);}

  r.players=players;players.forEach(p=>{p.score=0;p.waiting=false;});r.roster=players.map(p=>p.id);r.usedQuestionIds.push(...deck.map(q=>q.id));r.deck=shuffle(deck);r.matchSettings={...settings};r.round=0;this.next(r);
 }
 resetQuestions(r,p){if(p.id!==r.host)fail('Only the host can reset question history.');if(!['lobby','finished','incomplete'].includes(r.phase))fail('Finish the current match before resetting.');if(this.available(r).length>=3)fail('Unused questions are still available. Choose a shorter match.');r.usedQuestionIds=[];}
 duration(r,phase){const s=r.matchSettings||this.settings(r);return phase==='write'?this.d.write*s.bluffTime/40:this.d.vote*s.voteTime/20;}
 scheduleBots(r,phase){const span=this.duration(r,phase);r.botDue={};for(const p of this.active(r).filter(p=>p.bot))r.botDue[p.id]=this.now()+Math.max(1,Math.floor(span*(.15+randomInt(35)/100)));}
 next(r){r.round++;r.q=r.deck[r.round-1];r.phase='write';r.deadline=this.now()+this.duration(r,'write');r.submissions={};r.votes={};r.choices={};r.results=null;this.scheduleBots(r,'write');}
 submit(r,p,text){if(r.phase!=='write'||!r.roster.includes(p.id))fail('The writing phase is closed.');if(r.submissions[p.id])fail('Your answer is already locked.');text=String(text||'').trim().replace(/\s+/g,' ');if(text.length<1||text.length>100||!norm(text))fail('Write an answer between 1 and 100 characters.');const correct=[r.q.truth,...r.q.aliases].some(t=>norm(t)===norm(text));r.submissions[p.id]={text,correct};this.tick(r);}
 ballot(r){r.phase='vote';r.deadline=this.now()+this.duration(r,'vote');const opts=[{id:id(),text:r.q.truth,truth:true,authors:[]}];for(const p of this.active(r)){const s=r.submissions[p.id];if(!s||s.correct)continue;let o=opts.find(o=>norm(o.text)===norm(s.text));if(!o){o={id:id(),text:s.text,authors:[]};opts.push(o);}o.authors.push(p.id);}
  const accepted=[r.q.truth,...r.q.aliases].map(norm);const pool=shuffle(r.q.decoys.filter(d=>!accepted.includes(norm(d))&&!opts.some(o=>norm(o.text)===norm(d))));
  for(const p of this.active(r)){let eligible=opts.filter(o=>!o.authors.includes(p.id));for(const text of pool){if(eligible.length>=4)break;let o=opts.find(o=>!o.truth&&!o.authors.length&&norm(o.text)===norm(text));if(!o){o={id:id(),text,authors:[]};opts.push(o);}if(!eligible.some(x=>x.id===o.id))eligible.push(o);}r.choices[p.id]=shuffle(eligible).map(o=>o.id);}
  r.options=opts;this.scheduleBots(r,'vote');
 }
 vote(r,p,choice){if(r.phase!=='vote'||!r.roster.includes(p.id))fail('The voting phase is closed.');if(r.submissions[p.id]?.correct)fail('You already found the truth.');if(r.votes[p.id])fail('Your vote is already locked.');if(!r.choices[p.id]?.includes(choice))fail('Choose one of your available answers.');r.votes[p.id]=choice;this.tick(r);}
 botActions(r){
  if(!['write','vote'].includes(r.phase))return;
  for(const p of this.active(r).filter(p=>p.bot)){
   if(this.now()<(r.botDue?.[p.id]??Infinity))continue;
   if(r.phase==='write'&&!r.submissions[p.id]){const used=Object.values(r.submissions).map(s=>norm(s.text));const pool=r.q.decoys.filter(d=>![r.q.truth,...r.q.aliases].some(a=>norm(a)===norm(d)));const fresh=pool.filter(d=>!used.includes(norm(d)));r.submissions[p.id]={text:shuffle(fresh.length?fresh:pool)[0],correct:false};}
   else if(r.phase==='vote'&&!r.votes[p.id]){const choices=r.choices[p.id]||[];if(choices.length)r.votes[p.id]=choices[randomInt(choices.length)];}
  }
 }
 reveal(r){const gains={};for(const p of this.active(r)){gains[p.id]={truth:0,bluff:0};if(r.submissions[p.id]?.correct||r.options.find(o=>o.id===r.votes[p.id])?.truth)gains[p.id].truth=1000;}
  for(const [voter,choice] of Object.entries(r.votes)){const o=r.options.find(o=>o.id===choice);for(const author of o?.authors||[])if(author!==voter)gains[author].bluff+=500;}
  for(const p of this.active(r))p.score+=gains[p.id].truth+gains[p.id].bluff;r.results=gains;r.phase='reveal';r.deadline=this.now()+this.d.reveal;
 }
 tick(r){const t=this.now();const connected=r.players.filter(p=>!p.bot&&this.online(p));if(!connected.some(p=>p.id===r.host)&&connected.length)r.host=connected[0].id;
  this.botActions(r);
  if(r.phase==='write'&&(t>=r.deadline||this.active(r).every(p=>r.submissions[p.id])))this.ballot(r);
  if(r.phase==='vote'&&(t>=r.deadline||this.active(r).every(p=>r.votes[p.id]||r.submissions[p.id]?.correct)))this.reveal(r);
  if(r.phase==='reveal'&&t>=r.deadline){if(r.round===(r.matchSettings?.rounds||r.deck.length)){r.phase='finished';r.deadline=null;}else if(!this.canContinue(r)){r.phase='paused';r.deadline=t+this.d.pause;}else this.next(r);}
  if(r.phase==='paused'){if(this.canContinue(r))this.next(r);else if(t>=r.deadline){r.phase='incomplete';r.deadline=null;}}
 }
 state(r,p){this.tick(r);const isActive=r.roster?.includes(p.id);const reveal=['reveal','finished'].includes(r.phase);const settings=r.matchSettings&&!['lobby','finished','incomplete'].includes(r.phase)?r.matchSettings:this.settings(r);const s={settings,questionBank:{total:questions.length,remaining:this.available(r).length},category:r.q?.category,code:r.code,me:p.id,host:r.host,phase:r.phase,round:r.round,totalRounds:r.deck?.length||settings.rounds,serverTime:this.now(),deadline:r.deadline,players:r.players.map(x=>({id:x.id,name:x.name,bot:!!x.bot,score:x.score,online:this.online(x),waiting:x.waiting||false,submitted:!!r.submissions?.[x.id],voted:!!r.votes?.[x.id]||!!r.submissions?.[x.id]?.correct})),spectator:!!r.roster&&!isActive,question:r.q?.question,submitted:!!r.submissions?.[p.id],voted:!!r.votes?.[p.id],submission:r.submissions?.[p.id]?.text};
  if(r.phase==='vote'&&isActive){s.foundTruth=!!r.submissions[p.id]?.correct;s.options=(r.choices[p.id]||[]).map(oid=>{const o=r.options.find(o=>o.id===oid);return {id:o.id,text:o.text};});s.myVote=r.votes[p.id];}
  if(reveal){s.truth=r.q.truth;s.results=r.results;s.answers=r.options.map(o=>({text:o.text,truth:!!o.truth,authors:o.authors,voters:Object.entries(r.votes).filter(([,v])=>v===o.id).map(([pid])=>pid)}));s.winners=r.phase==='finished'?this.active(r).filter(x=>x.score===Math.max(...this.active(r).map(x=>x.score))).map(x=>x.id):[];}
  return s;
 }
 action({action,code,token,name,text,choice,settings}){if(action==='create')return this.create(name,settings);if(action==='join')return this.join(code,name);const r=this.room(code),p=this.auth(r,token);p.lastSeen=this.now();this.tick(r);if(action==='start')this.start(r,p);else if(action==='configure')this.configure(r,p,settings);else if(action==='resetQuestions')this.resetQuestions(r,p);else if(action==='submit')this.submit(r,p,text);else if(action==='vote')this.vote(r,p,choice);else if(action!=='state')fail('Unknown action.');r.updated=this.now();return this.state(r,p);}
}
