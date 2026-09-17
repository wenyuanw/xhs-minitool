import test from 'node:test';
import assert from 'node:assert/strict';
import { KEY, defaults, validate, createStorage, clientVersion } from '../src/lib/storage.js';
import { sendCard } from '../src/lib/media.js';
function memory(initial={}) { const data=new Map(Object.entries(initial));return {data,getItem:k=>data.has(k)?data.get(k):null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)}; }
function native(initial={}) {const data=new Map(Object.entries(initial));return {data,getStorageInfo:async()=>({keys:[...data.keys()]}),getStorage:async({key})=>({data:data.get(key)}),setStorage:async({key,data:v})=>{data.set(key,v)},removeStorage:async({key})=>{data.delete(key)}};}
function env(api,local=memory(),build=9460000) {return {xhs:{launchOptions:{miniToolEnv:{buildVersion:build}},miniTool:api},localStorage:local};}

test('client version strips compilation suffix and resolves async launch options',async()=>{
 assert.equal(await clientVersion(env({},memory(),9462004)),9462);
 assert.equal(await clientVersion({xhs:{miniTool:{getLaunchOptions:async()=>({miniToolEnv:{buildVersion:9460001}})}}}),9460);
 assert.equal(await clientVersion({}),0);
});
test('no SDK and old versions persist through browser fallback',async()=>{
 for(const setup of [{localStorage:memory()},env(native(),memory(),9459999)]){
  const store=createStorage(setup);const save=await store.load();save.visited=true;save.discovered=[2];assert.equal(await store.write(save),true);
  assert.equal(store.backend,'browser');assert.deepEqual((await createStorage(setup).load()).discovered,[2]);
 }
});
test('9.46 boundary selects native; existing native data wins over browser data',async()=>{
 const a=defaults(),b=defaults();a.discovered=[1];b.discovered=[2];const api=native({[KEY]:a}),local=memory({[KEY]:JSON.stringify(b)});
 const store=createStorage(env(api,local));assert.deepEqual((await store.load()).discovered,[1]);assert.equal(store.backend,'native');
});
test('migrate only confirmed missing key, clear old copy only after successful native write',async()=>{
 const old=defaults();old.discovered=[3];const local=memory({[KEY]:JSON.stringify(old)}),api=native();
 const store=createStorage(env(api,local));assert.deepEqual((await store.load()).discovered,[3]);assert.equal(local.getItem(KEY),null);assert.deepEqual(api.data.get(KEY).discovered,[3]);
 const other=memory({[KEY]:JSON.stringify(old)}),fail=native();fail.setStorage=async()=>{throw Error('quota')};
 const broken=createStorage(env(fail,other));await broken.load();assert.equal(broken.writable,false);assert.notEqual(other.getItem(KEY),null);
});
test('native read failure cannot fall back and overwrite either old copy',async()=>{
 const old=defaults();old.discovered=[5];const local=memory({[KEY]:JSON.stringify(old)}),api=native({[KEY]:old});let writes=0;
 api.getStorage=async()=>{throw Error('unavailable')};api.setStorage=async()=>{writes++};
 const store=createStorage(env(api,local));await store.load();assert.equal(await store.write(defaults()),false);assert.equal(writes,0);assert.deepEqual(api.data.get(KEY).discovered,[5]);
});
test('corrupt or unknown-version data is protected until explicit reset',async()=>{
 for(const raw of ['broken','null',JSON.stringify({...defaults(),version:2}),JSON.stringify({...defaults(),best:[{},null,null,null,null,null]})]){
  const local=memory({[KEY]:raw,unrelated:'keep'}),store=createStorage({localStorage:local});await store.load();assert.equal(store.writable,false);
  await store.write(defaults());assert.equal(local.getItem(KEY),raw);assert.equal(await store.reset(),true);assert.equal(local.getItem(KEY),null);assert.equal(local.getItem('unrelated'),'keep');
 }
 assert.throws(()=>validate({}));
});
test('old saves gain safe character defaults and unlocked characters persist',()=>{
 const old=defaults();delete old.shells;delete old.character;delete old.characters;
 const migrated=validate(old);assert.equal(migrated.shells,0);assert.equal(migrated.character,0);assert.deepEqual(migrated.characters,[0]);
 const save=defaults();save.shells=41;save.characters=[0,2,4];save.character=4;
 const restored=validate(save);assert.equal(restored.shells,41);assert.equal(restored.character,4);assert.deepEqual(restored.characters,[0,2,4]);
});
test('missing new-client methods and storage access denial degrade to memory',async()=>{
 const notices=[];const store=createStorage(env({}),m=>notices.push(m));await store.load();assert.equal(store.writable,false);assert.equal(notices.length,1);
 const denied={get localStorage(){throw Error('denied')}};const browser=createStorage(denied);await browser.load();assert.equal(browser.writable,false);
});
test('writes snapshot caller data and execute strictly in order',async()=>{
 const api=native();let release;const gate=new Promise(r=>{release=r});const seen=[];
 api.setStorage=async({data})=>{seen.push(data.discovered.slice());if(seen.length===1)await gate;api.data.set(KEY,data)};
 const store=createStorage(env(api));const save=await store.load();save.discovered=[1];const first=store.write(save);save.discovered=[1,2];const second=store.write(save);save.discovered.push(3);
 await Promise.resolve();assert.deepEqual(seen,[[1]]);release();await Promise.all([first,second]);assert.deepEqual(seen,[[1],[1,2]]);assert.deepEqual(api.data.get(KEY).discovered,[1,2]);
});
test('write quota errors are visible and can be retried on same backend',async()=>{
 const api=native(),notices=[];const original=api.setStorage;api.setStorage=async()=>{throw Error('quota')};const store=createStorage(env(api),m=>notices.push(m));const save=await store.load();
 assert.equal(await store.write(save),false);assert.equal(notices.length,1);api.setStorage=original;assert.equal(await store.write(save),true);
});
test('reset affects only game key in native and fallback storage',async()=>{
 const api=native({[KEY]:defaults(),other:1}),local=memory({[KEY]:'old',other:'keep'}),store=createStorage(env(api,local));await store.load();assert.equal(await store.reset(),true);assert.equal(api.data.has(KEY),false);assert.equal(api.data.get('other'),1);assert.equal(local.getItem('other'),'keep');
});
test('media uses current API contract, temporary local paths and explicit action',async()=>{
 const calls=[];const api={writeTempFile:async args=>{calls.push(['temp',args]);return {filePath:'/local/card.png'}},saveImageToPhotosAlbum:async args=>calls.push(['save',args]),postNote:async args=>calls.push(['post',args])};
 const data='data:image/png;base64,AAAA',result={name:'湖心初漂',count:3};
 assert.equal((await sendCard(env(api),data,'save',result)).ok,true);assert.deepEqual(calls[0],['temp',{data}]);assert.deepEqual(calls[1],['save',{filePath:'/local/card.png'}]);
 assert.equal((await sendCard(env(api),data,'post',result)).ok,true);
 const post=calls[3][1];assert.deepEqual(post.mediaInfo,{image_resources:[{url:'/local/card.png'}]});assert.ok(post.title.length<=20);assert.ok(!('tags' in post));assert.ok(!('pageType' in post));
});
test('no SDK, permission refusal, cancellation, and malformed temp response never report success',async()=>{
 const result={name:'湖心初漂',count:2};assert.equal((await sendCard({},'data:image/png;base64,AA','save',result)).ok,false);
 for(const method of ['saveImageToPhotosAlbum','postNote']){const api={[method]:async()=>{throw Error('cancel')}};assert.equal((await sendCard(env(api),'data:image/png;base64,AA',method==='postNote'?'post':'save',result)).ok,false);}
 const bad={writeTempFile:async()=>({}),saveImageToPhotosAlbum:async()=>{throw Error('must not call')}};assert.equal((await sendCard(env(bad),'data:image/png;base64,AA','save',result)).ok,false);
});
