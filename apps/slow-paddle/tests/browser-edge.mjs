import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defaults, KEY } from '../src/lib/storage.js';
import { LEVELS, generateLevel } from '../src/game/data.js';
const { chromium }=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),artifacts=resolve(root,'artifacts');
const server=createServer(async(req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 const file=resolve(root,'xhs-tool','.'+(pathname==='/'?'/index.html':pathname));
 if(!file.startsWith(resolve(root,'xhs-tool')+'/')){res.writeHead(403);res.end();return;}
 try{
  const data=await readFile(file);res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'})[extname(file)]||'application/octet-stream','Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'none'; media-src 'self' data: blob:"});res.end(data);
 }catch{res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}/`;
const launchOptions={headless:true};if(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH)launchOptions.executablePath=process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
const browser=await chromium.launch(launchOptions);const checks=[],errors=[];
try{
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.clock.install({time:new Date('2026-09-16T12:00:00Z')});await page.clock.pauseAt(new Date('2026-09-16T12:00:01Z'));
 await page.goto(url);await page.locator('.home-brand').waitFor();await page.clock.runFor(100);
 await page.screenshot({path:resolve(artifacts,'01-home.png')});
 await page.locator('[data-action="map"]').click();await page.screenshot({path:resolve(artifacts,'02-route-map.png')});
 await page.locator('[data-action="level"][data-id="0"]').click();await page.clock.runFor(100);
 const first=generateLevel(LEVELS[0]).find(e=>e.kind==='collect');const box=await page.locator('#water').boundingBox();const h=Number(await page.locator('#water').getAttribute('height'));
 const x=box.x+first.x/240*box.width,y=box.y+(h*.72-first.y+3.6)/h*box.height;
 const session=await context.newCDPSession(page);
 const point=(id,x,y)=>({id,x,y,radiusX:3,radiusY:3,force:1});
 await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point(0,x,y)]});
 await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point(0,x,y),point(1,x-60,y)]});
 await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.clock.runFor(150);
 assert.equal(await page.locator('#count').textContent(),'0');
 await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point(0,x,y+5)]});
 await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.clock.runFor(150);
 assert.equal(await page.locator('#count').textContent(),'1');checks.push('actual CDP multitouch cancels collection, single touch collects');
 await page.reload();await page.locator('.route-map').waitFor();assert.equal(await page.locator('.route-stop:disabled').count(),5);checks.push('closing incomplete first run returns to route map without unlocking');
 await page.locator('[data-action="level"][data-id="0"]').click();await page.clock.runFor(8000);await page.screenshot({path:resolve(artifacts,'03-game-day.png')});
 await page.locator('[data-action="pause"]').click();await page.screenshot({path:resolve(artifacts,'04-pause.png')});await page.locator('[data-action="resume"]').click();
 await page.clock.runFor(60000);await page.locator('.result-ticket').waitFor();await page.screenshot({path:resolve(artifacts,'06-result.png')});
 const button=await page.locator('[data-action="card"]').boundingBox();assert.ok(button.y+button.height<=844);checks.push('revised settlement postcard action fits 390x844');
 await page.locator('[data-action="card"]').click();await page.screenshot({path:resolve(artifacts,'10-postcard.png')});
 const image=await page.locator('#card-preview').getAttribute('src');await writeFile(resolve(artifacts,'postcard.png'),Buffer.from(image.split(',')[1],'base64'));
 checks.push('final bundle runs under restrictive CSP without inline/eval permission');
 await context.close();
 // Corrupt store: do not overwrite on play, can reset only after confirmation.
 const broken=await browser.newContext({viewport:{width:320,height:568}});const p=await broken.newPage();
 await p.addInitScript(()=>{localStorage.setItem('slow-paddle-save-v1','broken');localStorage.setItem('unrelated','keep')});
 await p.goto(url);await p.locator('.home-brand').waitFor();await p.locator('[data-action="settings"]').click();await p.locator('[data-action="storage-info"]').click();assert.match(await p.locator('#storage-state').textContent(),/无法读取/);await p.locator('[data-action="close-modal"]').click();
 await p.locator('[data-action="reset"]').click();await p.locator('[data-action="close-modal"]').click();assert.equal(await p.evaluate(()=>localStorage.getItem('slow-paddle-save-v1')),'broken');
 await p.locator('[data-action="reset"]').click();await p.locator('[data-action="confirm-reset"]').click();await p.locator('.home-brand').waitFor();assert.equal(await p.evaluate(()=>localStorage.getItem('slow-paddle-save-v1')),null);assert.equal(await p.evaluate(()=>localStorage.getItem('unrelated')),'keep');checks.push('corrupt-save UI protects old data; reset cancellation and game-key-only reset verified');await broken.close();
 // Actual UI startup with asynchronous native bridge mock.
 const native=await browser.newContext({viewport:{width:430,height:932}});const np=await native.newPage();const saved=defaults();saved.visited=true;saved.completed=6;saved.shells=100;saved.characters=[0,1,2,3,4,5];saved.discovered=Array.from({length:24},(_,i)=>i);saved.best=Array.from({length:6},()=>({stars:3,count:20}));
 await np.addInitScript(({saved,key})=>{window.__store={[key]:saved};window.xhs={miniTool:{getLaunchOptions:async()=>({miniToolEnv:{buildVersion:9462004}}),getStorageInfo:async()=>({keys:Object.keys(window.__store)}),getStorage:async({key})=>({data:window.__store[key]}),setStorage:async({key,data})=>{window.__store[key]=data},removeStorage:async({key})=>{delete window.__store[key]}}}},{saved,key:KEY});
 await np.goto(url);await np.locator('.route-map').waitFor();assert.equal(await np.locator('.route-stop:disabled').count(),0);
 await np.locator('[data-action="atlas"]').click();await np.screenshot({path:resolve(artifacts,'07-atlas.png')});
 await np.locator('[data-action="map"]').click();await np.locator('[data-action="settings"]').click();await np.locator('[data-action="storage-info"]').click();assert.match(await np.locator('#storage-state').textContent(),/保存在本机/);await np.locator('[data-action="close-modal"]').click();
 for(let i=0;i<7;i++)await np.locator('[data-action="storage-debug-tap"]').click();
 await np.locator('#storage-debug-output').waitFor();const debugText=await np.locator('#storage-debug-output').textContent();assert.match(debugText,/buildVersion：9462004/);assert.match(debugText,/实际后端：native/);assert.match(debugText,/setStorage：可用/);await np.screenshot({path:resolve(artifacts,'storage-debug.png')});await np.locator('[data-action="close-modal"]').click();checks.push('seven taps on author credit reveal native storage diagnostics');
 await np.locator('[data-theme="night"]').click();assert.equal(await np.evaluate(key=>window.__store[key].settings.theme,KEY),'night');
 await np.locator('[data-action="map"]').click();await np.locator('[data-action="free"]').click();await np.locator('[data-action="resume"]').click();await np.waitForTimeout(2000);await np.screenshot({path:resolve(artifacts,'08-free-night.png')});
 await np.setViewportSize({width:320,height:568});await np.screenshot({path:resolve(artifacts,'viewport-320x568.png')});
 checks.push('native 9.46.2 async-version mock restores all collections and persists settings');
 // An actual wall-clock sample measures desktop render pacing only, not device acceptance.
 const pacing=await np.evaluate(()=>new Promise(resolve=>{let previous=performance.now();const frames=[];function frame(now){frames.push(now-previous);previous=now;if(frames.length<180)requestAnimationFrame(frame);else {frames.sort((a,b)=>a-b);resolve({samples:frames.length,medianMs:frames[90],p95Ms:frames[171],estimatedFps:1000/(frames.reduce((a,b)=>a+b,0)/frames.length)})}}requestAnimationFrame(frame)}));
 await native.close();
 const unavailable=await browser.newPage();await unavailable.addInitScript(()=>{HTMLCanvasElement.prototype.getContext=()=>null});await unavailable.goto(url);await unavailable.getByText('暂时无法展开水域').waitFor();checks.push('Canvas unavailability shows a readable fallback');await unavailable.close();
 assert.deepEqual(errors,[]);await writeFile(resolve(artifacts,'browser-edge-report.json'),JSON.stringify({checks,errors,pacing,notes:'Native bridge is mocked. Pacing measured on desktop Chromium, not a phone.'},null,2));console.log(JSON.stringify({checks,pacing,errors},null,2));
}finally{await browser.close();server.close();}
