// Optional browser QA: install Playwright locally, or set PLAYWRIGHT_MODULE to its index.mjs.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve, dirname } from 'node:path';
import { LEVELS, generateLevel } from '../src/game/data.js';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const artifacts = resolve(root, 'artifacts'); await mkdir(artifacts,{recursive:true});
const url = pathToFileURL(resolve(root,'xhs-tool/index.html')).href;
const browser = await chromium.launch({headless:true});
const errors=[], requests=[], results=[], checks=[];
const context = await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,hasTouch:true});
const page = await context.newPage();
page.on('pageerror',e=>errors.push(e.message));
page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url())});
const click = action=>page.locator(`[data-action="${action}"]`).click();
const screenshot = name=>page.screenshot({path:resolve(artifacts,name+'.png')});
await page.clock.install({time:new Date('2026-09-16T12:00:00Z')});
await page.clock.pauseAt(new Date('2026-09-16T12:00:01Z'));
await page.goto(url);await page.locator('.home-brand').waitFor();await page.clock.runFor(100);
await context.setOffline(true);
await screenshot('01-home');
await click('map');await screenshot('02-route-map');
assert.equal(await page.locator('.route-stop:disabled').count(),5);
assert.equal(await page.locator('[data-action="free"]').isDisabled(),false);
for(let id=0;id<6;id++) {
 await page.locator(`[data-action="level"][data-id="${id}"]`).click();
 await page.clock.runFor(100);
 const water=await page.locator('#water').boundingBox();
 if(id===0){
  // Tap a visible item from its fixed level location; the simulation is still at spawn.
  const first=generateLevel(LEVELS[0]).find(e=>e.kind==='collect');
  const logicalHeight=await page.locator('#water').getAttribute('height');
  const x=water.x+first.x/240*water.width,y=water.y+(Number(logicalHeight)*.72-first.y+3.6)/Number(logicalHeight)*water.height;
  await page.mouse.click(x,y);await page.clock.runFor(200);assert.ok(Number(await page.locator('#count').textContent())>=1);
  checks.push('visible item tap collects');
  await click('pause');const before=await page.locator('#progress-text').textContent();await page.clock.runFor(5000);assert.equal(await page.locator('#progress-text').textContent(),before);
  await screenshot('04-pause');await click('resume');checks.push('pause freezes simulation');
 }
 let seconds=0;
 while(await page.locator('#screen.game').count() && seconds<100) {
  if(seconds%5===0){
   const w=await page.locator('#water').boundingBox();
   const mid=w.x+w.width*.5,yy=w.y+w.height*.65;
   await page.mouse.move(mid,yy);await page.mouse.down();await page.mouse.move(mid+Math.sin(seconds/8+id)*65,yy,{steps:5});await page.mouse.up();
   if(!await page.locator('[data-action="paddle"]').isDisabled())await click('paddle');
  }
  if(seconds===8)await screenshot(id===0?'03-game-day':`game-level-${id+1}`);
  if(id===2&&seconds===22)await screenshot('05-game-fork');
  await page.clock.runFor(1000);seconds++;
 }
 await page.locator('.result-ticket').waitFor();
 const text=await page.locator('.result-ticket').innerText();
 assert.ok(text.includes(LEVELS[id].name));
 results.push({level:LEVELS[id].name,seconds,summary:text});
 if(id===0)await screenshot('06-result');
 await click('map');
 assert.equal(await page.locator('.route-stop:disabled').count(),Math.max(0,4-id));
 console.log('Completed',LEVELS[id].name,seconds);
}
checks.push('six levels played using drag/paddle; progression unlocked sequentially');
await click('atlas');assert.equal(await page.locator('.collection-card').count(),24);await screenshot('07-atlas');
await click('map');await click('wardrobe');assert.equal(await page.locator('.character-card').count(),6);assert.equal(await page.locator('.skin-card:disabled').count(),0);await page.locator('[data-action="skin"][data-id="2"]').click();
await click('map');await click('settings');await page.locator('[data-action="theme"][data-theme="night"]').click();
await page.reload();await page.locator('.route-map').waitFor();
const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('slow-paddle-save-v1')));
assert.equal(saved.completed,6);assert.equal(saved.skin,2);assert.equal(saved.settings.theme,'night');
checks.push('reload returns to map and retains stars, atlas, skin and theme');
await click('free');await click('resume');await page.clock.runFor(6000);await screenshot('08-free-night');
await page.setViewportSize({width:844,height:390});await page.locator('#rotation:not([hidden])').waitFor();
const frozen=await page.locator('#progress-text').textContent();await page.clock.runFor(5000);assert.equal(await page.locator('#progress-text').textContent(),frozen);
await screenshot('09-landscape');await page.setViewportSize({width:390,height:844});await click('resume');await page.clock.runFor(2000);
await click('pause');await click('end-free');assert.equal(await page.locator('.result-stars').count(),0);
await click('card');await screenshot('10-postcard');
const card=await page.locator('#card-preview').getAttribute('src');
await writeFile(resolve(artifacts,'postcard.png'),Buffer.from(card.split(',')[1],'base64'));
await click('save-card');assert.match(await page.locator('#media-status').textContent(),/请在/);
await click('post-card');assert.match(await page.locator('#media-status').textContent(),/请在/);
checks.push('landscape pauses and manual free-drift settlement has no stars; no-SDK media keeps preview');
await page.evaluate(()=>{window.__mediaCalls=[];window.xhs={miniTool:{writeTempFile:async a=>{window.__mediaCalls.push(['temp',a.data.slice(0,22)]);return {filePath:'/local/card.png'}},saveImageToPhotosAlbum:async a=>window.__mediaCalls.push(['save',a]),postNote:async a=>window.__mediaCalls.push(['post',a])}}});
await click('save-card');assert.match(await page.locator('#media-status').textContent(),/已保存/);
await click('post-card');assert.match(await page.locator('#media-status').textContent(),/笔记状态/);
await page.evaluate(()=>{window.xhs.miniTool.postNote=async()=>{throw Error('cancelled')}});
await click('post-card');assert.match(await page.locator('#media-status').textContent(),/操作未完成/);
checks.push('UI invokes current media contract and handles post cancellation');
await click('close-modal');await click('map');
for(const size of [{width:320,height:568},{width:430,height:932},{width:1024,height:768}]){
 await page.setViewportSize(size);await page.locator('[data-action="level"][data-id="0"]').click();await page.clock.runFor(1000);
 const geometry=await page.evaluate(()=>{const b=document.querySelector('[data-action="paddle"]').getBoundingClientRect(),p=document.querySelector('[data-action="pause"]').getBoundingClientRect(),s=document.querySelector('#screen');return {button:b.toJSON(),pause:p.toJSON(),viewport:innerHeight,width:s.clientWidth,scrollWidth:s.scrollWidth}});
 assert.ok(geometry.button.bottom<=geometry.viewport);assert.ok(geometry.button.height>=44);assert.ok(geometry.pause.top>=76);assert.equal(geometry.width,geometry.scrollWidth);
 await screenshot(`viewport-${size.width}x${size.height}`);await click('pause');await click('leave');
}
checks.push('320x568, 390x844, 430x932, 1024x768: controls fit and no horizontal overflow');
assert.equal(requests.length,0);assert.deepEqual(errors,[]);
await writeFile(resolve(artifacts,'browser-report.json'),JSON.stringify({checks,levels:results,errors,networkRequests:requests,method:'Chromium; offline file entry; virtual clock; actual pointer and button input',device:'desktop emulation, not native container'},null,2));
await browser.close();console.log(JSON.stringify({passed:checks.length,levels:results.length,errors,networkRequests:requests},null,2));
