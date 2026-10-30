import {getStore} from '@netlify/blobs';

// A site-wide store survives deployments. Netlify supplies runtime credentials.
export function createBlobRepository(store=getStore({name:'bluff-rumble-rooms',consistency:'strong'})){
 return {
  async read(code){const item=await store.getWithMetadata(`room:${code}`,{type:'json',consistency:'strong'});return item?{room:item.data,etag:item.etag}:null;},
  async write(code,room,etag){const result=await store.setJSON(`room:${code}`,room,etag===null?{onlyIfNew:true}:{onlyIfMatch:etag});return result.modified;}
 };
}
