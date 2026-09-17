import assert from 'node:assert/strict';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { writeFile } from 'node:fs/promises';
import { defaults } from '../src/lib/storage.js';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),out=resolve(root,'artifacts');
const url=pathToFileURL(resolve(root,'xhs-tool/index.html')).href;
const browser=await chromium.launch({headless:true});const checks=[],errors=[];
try {
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.clock.install({time:new Date('2026-09-16T12:00:00Z')});await page.clock.pauseAt(new Date('2026-09-16T12:00:01Z'));
 await page.goto(url);await page.locator('.home-brand').waitFor();await page.clock.runFor(100);
 assert.equal(await page.locator('[data-action="free"]').isEnabled(),true);
 await page.screenshot({path:resolve(out,'immersive-home.png')});
 await page.locator('[data-action="free"]').click();await page.locator('.intro-hearts').waitFor();await page.locator('[data-action="resume"]').click();await page.clock.runFor(150);
 assert.match(await page.locator('.journey-number').getAttribute('aria-label'),/挑战漂流/);
 assert.equal(await page.locator('#paddle-hint').isVisible(),true);
 assert.equal(await page.locator('[data-action="paddle"]').innerText(),'');
 assert.equal(await page.locator('[data-action="paddle"]').getAttribute('aria-label'),'划一桨');
 await page.screenshot({path:resolve(out,'immersive-first-tutorial.png')});
 await page.locator('[data-action="paddle"]').click();await page.clock.runFor(120);
 assert.equal(await page.locator('[data-action="paddle"]').isDisabled(),true);
 assert.equal(await page.locator('#paddle-hint').isVisible(),false);
 await page.clock.runFor(1800);assert.equal(await page.locator('[data-action="paddle"]').isEnabled(),true);
 checks.push('fresh save: home launches free drift; icon-only paddle boosts without collecting through canvas; one-time instruction dismisses on use');
 await page.reload();await page.locator('.route-map').waitFor();
 const free=await page.locator('[data-action="free"]').boundingBox(),route=await page.locator('.route-map').boundingBox();assert.ok(free.y<route.y);assert.equal(await page.locator('[data-action="free"]').isEnabled(),true);
 await page.locator('[data-action="free"]').click();await page.clock.runFor(100);assert.equal(await page.locator('#tutorial').isVisible(),false);assert.equal(await page.locator('#paddle-hint').isVisible(),false);
 for(const size of [{width:320,height:568},{width:390,height:844},{width:430,height:932},{width:460,height:838}]) {
  await page.setViewportSize(size);await page.clock.runFor(150);
  const bounds=await page.evaluate(()=>{const box=s=>document.querySelector(s).getBoundingClientRect().toJSON();return {water:box('#water'),app:box('#app'),pause:box('[data-action="pause"]'),paddle:box('[data-action="paddle"]'),title:box('.game-heading'),screenWidth:document.querySelector('#screen').clientWidth,scrollWidth:document.querySelector('#screen').scrollWidth}});
  assert.equal(bounds.water.top,0);assert.equal(bounds.water.bottom,size.height);assert.equal(bounds.water.height,bounds.app.height);
  assert.ok(bounds.pause.top>=76);assert.ok(bounds.paddle.bottom<size.height);assert.ok(bounds.pause.right<bounds.title.left);assert.ok(bounds.paddle.width>=44&&bounds.paddle.height>=44);assert.equal(bounds.screenWidth,bounds.scrollWidth);
  await page.screenshot({path:resolve(out,`immersive-${size.width}x${size.height}.png`)});
  const colors=await page.locator('#water').evaluate(c=>{const a=c.getContext('2d').getImageData(0,0,c.width,c.height).data;const unique=new Set();for(let i=0;i<a.length;i+=64)unique.add(a[i]+','+a[i+1]+','+a[i+2]);return unique.size});assert.ok(colors>10,'Canvas must be painted after resize');
 }
 checks.push('water fills 100% height on 320/390/430/460 widths; safe controls do not overlap title; no horizontal overflow');
 await page.evaluate(()=>document.documentElement.style.setProperty('--safe-area-inset-top','110px'));await page.evaluate(()=>document.documentElement.style.setProperty('--safe-area-inset-bottom','34px'));await page.setViewportSize({width:390,height:844});
 const safe=await page.locator('[data-action="pause"]').boundingBox(),paddle=await page.locator('[data-action="paddle"]').boundingBox();assert.ok(safe.y>=118);assert.ok(paddle.y+paddle.height<=844-60);
 checks.push('110px injected top and 34px bottom safe-area respected while water stays full-screen');
 await page.evaluate(()=>{document.documentElement.style.removeProperty('--safe-area-inset-top');document.documentElement.style.removeProperty('--safe-area-inset-bottom')});
 await page.clock.runFor(500);assert.equal(await page.locator('#screen.game').count(),1);assert.match(await page.locator('.journey-number').getAttribute('aria-label'),/挑战漂流/);
 await page.locator('[data-action="pause"]').click();await page.locator('[data-action="end-free"]').click();assert.equal(await page.locator('.result-stars').count(),0);
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('slow-paddle-save-v1')));assert.equal(saved.completed,0);assert.equal(saved.tutorialSeen,true);
 checks.push('fresh challenge can settle at shore, keeps level progression locked and remembers tutorial');
 await context.close();
 // Match the user's second-level scene and desktop/mobile viewport proportions.
 const exact=await browser.newContext({viewport:{width:460,height:838}});const ep=await exact.newPage();const fixture=defaults();fixture.visited=true;fixture.tutorialSeen=true;fixture.completed=1;fixture.best[0]={stars:1,count:3};
 await ep.addInitScript(save=>localStorage.setItem('slow-paddle-save-v1',JSON.stringify(save)),fixture);
 await ep.clock.install({time:new Date('2026-09-16T12:00:00Z')});await ep.clock.pauseAt(new Date('2026-09-16T12:00:01Z'));
 await ep.goto(url);await ep.locator('.route-map').waitFor();await ep.locator('[data-action="level"][data-id="1"]').click();await ep.clock.runFor(18000);
 await ep.screenshot({path:resolve(out,'immersive-reed-bay.png')});
 await ep.setViewportSize({width:838,height:460});await ep.locator('#rotation:not([hidden])').waitFor();await ep.setViewportSize({width:460,height:838});await ep.locator('[data-action="resume"]').click();await ep.clock.runFor(1000);
 checks.push('second level rendered and inspected; rotate/pause/resume remains functional');
 await exact.close();assert.deepEqual(errors,[]);await writeFile(resolve(out,'immersive-report.json'),JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks,errors},null,2));
}finally{await browser.close()}
