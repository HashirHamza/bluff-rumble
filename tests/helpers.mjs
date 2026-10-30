import {randomUUID} from 'node:crypto';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {BlobsServer} from '@netlify/blobs/server';
import {getStore} from '@netlify/blobs';
export function memoryRepository(){const records=new Map();let etag=0;return {records,async read(code){await Promise.resolve();const r=records.get(code);return r?structuredClone(r):null;},async write(code,room,expected){await Promise.resolve();const current=records.get(code);if(expected===null?!!current:current?.etag!==expected)return false;records.set(code,{room:structuredClone(room),etag:String(++etag)});return true;}};}
export function client(handler){return async(action,seat={},extra={})=>{const body={action,...seat,...extra};if(!body.requestId)body.requestId=randomUUID();const res=await handler(new Request('https://test.netlify.app/.netlify/functions/game',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://test.netlify.app'},body:JSON.stringify(body)}));return {status:res.status,data:await res.json()};};}
export async function blobsFixture(){const directory=await mkdtemp(path.join(os.tmpdir(),'rumble-blobs-'));const server=new BlobsServer({directory,token:'local-test-token',logger:()=>{}});const address=await server.start();const url=address.address;const context={siteID:'rumble-test-site',token:'local-test-token',apiURL:url,edgeURL:url,uncachedEdgeURL:url};const store=getStore({...context,name:'bluff-rumble-rooms',consistency:'strong'});return {store,context,async close(){await server.stop();await rm(directory,{recursive:true,force:true});}};}
