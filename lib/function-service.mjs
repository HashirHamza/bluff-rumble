import {createHash,randomUUID} from 'node:crypto';
import {Game} from '../engine.mjs';

const ACTIONS=new Set(['create','join','state','start','configure','submit','vote','resetQuestions']);
const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const response=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
const fault=(message,status=400)=>Object.assign(new Error(message),{status});
const fingerprint=body=>createHash('sha256').update(JSON.stringify(Object.fromEntries(Object.entries(body).filter(([key])=>key!=='requestId').sort(([a],[b])=>a.localeCompare(b))))).digest('hex');
const codeFor=(requestId,attempt)=>{const bytes=createHash('sha256').update(requestId+':'+attempt).digest();return Array.from(bytes.subarray(0,6),byte=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[byte%32]).join('');};
function replay(room,requestId,hash){const record=room.receipts?.find(record=>record.id===requestId);if(!record)return null;if(record.hash!==hash)throw fault('Request identifier was already used for another action.',409);return record.response;}
function remember(room,requestId,hash,result){room.receipts=[...(room.receipts||[]).slice(-31),{id:requestId,hash,response:result}];}

// Reconstruct missed deadline/bot events when a serverless instance wakes up.
// This preserves timers without a background process or scheduled function.
export function catchUp(game,room,now,setTime){
 let steps=0;
 while(['write','vote','reveal','paused'].includes(room.phase)&&steps++<100){
  const events=[room.deadline];
  if(['write','vote'].includes(room.phase))for(const p of game.active(room).filter(p=>p.bot)){
   const done=room.phase==='write'?room.submissions[p.id]:room.votes[p.id];
   if(!done&&room.botDue?.[p.id]!=null)events.push(room.botDue[p.id]);
  }
  const next=Math.min(...events.filter(Number.isFinite));if(next>now||!Number.isFinite(next))break;
  setTime(next);game.tick(room);
 }
 setTime(now);game.tick(room);
}

/** @param {{repository:any,now?:()=>number,durations?:any,maxAttempts?:number}} options */
export function createGameHandler({repository,now=()=>Date.now(),durations,maxAttempts=12}={}){
 return async function handle(request){
  if(request.method!=='POST')return response({error:'Use POST for game requests.'},405);
  const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return response({error:'Cross-origin requests are not allowed.'},403);
  try{
   if(Number(request.headers.get('content-length')||0)>4096)throw fault('Request too large.',413);
   const reader=request.body?.getReader();let size=0,text='';const decoder=new TextDecoder();if(reader)for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>4096){await reader.cancel();throw fault('Request too large.',413);}text+=decoder.decode(value,{stream:true});}text+=decoder.decode();
   let body;try{body=JSON.parse(text);}catch{throw fault('Send a valid JSON request.');}
   if(!body||typeof body!=='object'||Array.isArray(body)||!ACTIONS.has(body.action))throw fault('Unknown game action.');
   const requestId=body.requestId||randomUUID();if(typeof requestId!=='string'||!/^[\w-]{16,80}$/.test(requestId))throw fault('Invalid request identifier.');
   const hash=fingerprint(body);const timestamp=now();
   let collision=0;
   for(let attempt=0;attempt<maxAttempts;attempt++){
    let clock=timestamp;const game=new Game({now:()=>clock,...(durations?{durations}:{})});
    let code,room,result,etag=null;
    if(body.action==='create'){
     code=codeFor(requestId,collision);const existing=await repository.read(code);
     if(existing){const previous=replay(existing.room,requestId,hash);if(previous)return response(previous);collision++;continue;}
     result=game.action(body);room=game.room(result.code);room.code=code;result.code=code;
    }else{
     code=String(body.code||'').trim().toUpperCase();if(!/^[A-HJ-NP-Z2-9]{6}$/.test(code))throw fault('Room not found. Check the room code.');
     const stored=await repository.read(code);if(!stored||timestamp-stored.room.updated>86400000)throw fault('Room not found. Check the room code.',404);
     room=stored.room;etag=stored.etag;
     if(body.action!=='state'){const previous=replay(room,requestId,hash);if(previous)return response(previous);}
     game.rooms.set(code,room);catchUp(game,room,timestamp,value=>{clock=value;});
     result=game.action({...body,code});
    }
    room.updated=timestamp;if(body.action!=='state')remember(room,requestId,hash,result);
    if(await repository.write(code,room,etag))return response(result);
    // Re-read and re-apply on every compare-and-swap conflict. Never overwrite.
    if(body.action!=='create')await new Promise(resolve=>setTimeout(resolve,Math.min(10*(attempt+1),60)));
   }
   return response({error:'Room is busy. Please retry your action.'},409);
  }catch(error){if(error.status||!error.name||error.name==='Error')return response({error:error.status?error.message:knownError(error.message)},error.status||400);return response({error:'Room storage is temporarily unavailable. Please try again.'},503);}
 };
}
function knownError(message){const expected=['Enter a name','Invalid ','Choose ','Only ','At least ','This room','That name','Your ','The writing','The voting','Write an answer','Unknown ','A game','Settings ','Finish ','Unused ','Room not found'];return expected.some(prefix=>String(message).startsWith(prefix))?message:'Room storage is temporarily unavailable. Please try again.';}
