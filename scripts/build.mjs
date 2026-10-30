import {mkdir,rm,copyFile,readdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {build} from 'esbuild';
import {zipFunctions} from '@netlify/zip-it-and-ship-it';
const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));process.chdir(root);
execFileSync(process.execPath,['node_modules/typescript/bin/tsc','--noEmit'],{stdio:'inherit'});
await rm('dist',{recursive:true,force:true});await mkdir('dist',{recursive:true});
for(const file of ['index.html','app.js','style.css'])await copyFile(path.join('public',file),path.join('dist',file));
await mkdir('artifacts/functions',{recursive:true});
// Inspectable, self-contained production entry for smoke tests.
await build({entryPoints:['netlify/functions/game.ts'],outfile:'artifacts/game.mjs',bundle:true,platform:'node',format:'esm',target:'node22',minify:false,sourcemap:false});
const packaged=await zipFunctions('netlify/functions','artifacts/functions',{basePath:root,config:{'*':{nodeBundler:'esbuild',nodeVersion:'22.x'}},manifest:'artifacts/functions/manifest.json'});
if(packaged.length!==1||packaged[0].name!=='game')throw Error('Expected exactly the standard game function.');
const functionManifest=JSON.parse(await (await import('node:fs/promises')).readFile('artifacts/functions/manifest.json','utf8'));for(const item of functionManifest.functions){for(const key of ['mainFile','path'])if(item[key])item[key]=path.relative(root,item[key]);}await writeFile('artifacts/functions/manifest.json',JSON.stringify(functionManifest,null,2)+'\n');
await writeFile('artifacts/build-summary.json',JSON.stringify({functions:packaged.map(f=>({name:f.name,runtime:f.runtime,runtimeAPIVersion:f.runtimeAPIVersion,mainFile:f.mainFile})),staticFiles:await readdir('dist'),endpoint:'/.netlify/functions/game'},null,2)+'\n');
console.log('Built frontend and packaged game function.');
