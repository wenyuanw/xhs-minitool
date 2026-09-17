import test from 'node:test';
import assert from 'node:assert/strict';
import { CHARACTERS, ITEMS, LEVELS, WEATHERS, SPEED, riverAt, generateLevel } from '../src/game/data.js';
import { createRun, advance, step, paddle, collect, tapCollect, rate, finish } from '../src/game/engine.js';
import { STAMPS, syncStamps } from '../src/game/stamps.js';
import { createGesture } from '../src/game/input.js';
import { defaults, applyResult } from '../src/lib/storage.js';

test('all six routes are deterministic; obstacles and fork leave navigable lanes', () => {
  for (const level of LEVELS) {
    assert.deepEqual(generateLevel(level), generateLevel(level));
    for (let y = 0; y < level.duration * SPEED; y += 4) {
      const r = riverAt(y, level);
      if (r.island) {
        assert.ok(r.island.x - r.island.radius - r.left > 36);
        assert.ok(r.right - r.island.x - r.island.radius > 36);
      }
      const blocked = generateLevel(level).filter(e => ['log','rock'].includes(e.kind) && Math.abs(e.y-y) < e.radius+12);
      assert.ok(blocked.length <= 1);
      for (const e of blocked) assert.ok(r.right - r.left - 2 * (e.radius+12) > 85);
    }
  }
});
test('expanded atlas gives every route four unique keepsakes plus shell currency', () => {
  assert.equal(ITEMS.length, 24); assert.equal(CHARACTERS.length, 6);
  for (const level of LEVELS) {
    const entities = generateLevel(level), keepsakes = entities.filter(e => e.kind === 'collect'), shells = entities.filter(e => e.kind === 'currency');
    assert.deepEqual(keepsakes.map(e => e.item), [0,1,2,3].map(i => level.id * 4 + i));
    assert.ok(shells.length >= 8); assert.ok(shells.every(e => e.amount === 1));
  }
});
test('shell curves form five-pickup combos with one bounded tide reward', () => {
  const r=createRun(0);r.entities=[];
  for(let i=0;i<5;i++){const shell={kind:'currency',id:'c'+i,x:120,y:0,amount:1};r.entities.push(shell);assert.equal(collect(r,shell),true);r.time+=0.5;}
  assert.equal(r.shellChain,5);assert.equal(r.bestChain,5);assert.equal(r.chainBonuses,1);assert.equal(r.shells,8);assert.equal(r.tideBoost,1.25);
  r.time+=3.3;step(r);assert.equal(r.shellChain,0);
  const next={kind:'currency',id:'next',x:120,y:r.distance,amount:1};collect(r,next);assert.equal(r.shellChain,1);
});
test('four deterministic weathers each apply their advertised positive bonus', () => {
  assert.equal(WEATHERS.length,4);
  const seen=new Set();for(let seed=0;seed<4;seed++)seen.add(createRun(0,'level',1,seed).weather.id);assert.equal(seen.size,4);
  const clear=createRun(0,'level',1,3,2);paddle(clear);assert.equal(clear.boost,2.3);
  const breeze=createRun(0,'level',1,0);const neutral=createRun(0,'level',1,2);breeze.entities=[];neutral.entities=[];step(breeze);step(neutral);assert.ok(breeze.distance>neutral.distance);
  const drizzle=createRun(0,'level',1,1);for(let i=0;i<3;i++)collect(drizzle,{kind:'currency',id:'r'+i,amount:1});assert.equal(drizzle.shells,4);
  const mist=createRun(0,'level',1,2);const far={kind:'currency',id:'m',x:139,y:0,amount:1};mist.entities=[far];assert.equal(tapCollect(mist,120,0),true);
});
test('drift stamps reward once and track persistent run achievements', () => {
  const save=defaults();
  const first=syncStamps(save,{mode:'level',collisions:0,shells:8,bestChain:5});
  assert.deepEqual(first.unlocked.map(s=>s.id),['shore','gentle','ripple']);assert.equal(first.reward,21);assert.equal(save.shells,21);
  const again=syncStamps(save);assert.equal(again.reward,0);assert.equal(save.stamps.length,3);
  save.discovered=ITEMS.map(item=>item.id);save.completed=LEVELS.length;save.challengeBest=500;save.characters=CHARACTERS.map((_,i)=>i);
  const rest=syncStamps(save);assert.equal(save.stamps.length,STAMPS.length);assert.equal(rest.reward,88);
});
test('simulation is identical at 30, 60 and 120 fps', () => {
  const simulations = [30,60,120].map(fps => { const r = createRun(3); for(let i=0;i<fps*20;i++) advance(r,1/fps); return r; });
  for (const r of simulations.slice(1)) {
    assert.ok(Math.abs(r.distance-simulations[0].distance)<0.001);
    assert.ok(Math.abs(r.x-simulations[0].x)<0.001);
    assert.equal(r.count,simulations[0].count);
  }
});
test('long background gaps cannot fast-forward a run, paused state is frozen', () => {
  const r=createRun(0); advance(r,180); assert.ok(r.distance<4);
  r.status='paused'; const distance=r.distance; advance(r,1); assert.equal(r.distance,distance);
});
test('paddle is a bounded 20 percent boost, never stacks', () => {
  const a=createRun(0),b=createRun(0); a.entities=[];b.entities=[];
  assert.equal(paddle(a),true); assert.equal(paddle(a),false);
  for(let i=0;i<60;i++){step(a);step(b);}
  assert.ok(Math.abs(a.distance/b.distance-1.2)<0.001);
  for(let i=0;i<60;i++)step(a);assert.equal(paddle(a),true);
});
test('all character abilities change their advertised gameplay value', () => {
  const crab=createRun(0,'level',1,0,1),fish=createRun(0,'level',1,0,2),frog=createRun(0,'level',1,0,3),turtle=createRun(0,'level',1,0,4),whale=createRun(0,'level',1,0,5),base=createRun(0);
  crab.entities=[{kind:'currency',id:'s',x:120,y:0,amount:1}];collect(crab,crab.entities[0]);assert.equal(crab.shells,2);
  paddle(fish);assert.equal(fish.boost,2);
  frog.entities=[];base.entities=[];frog.target=150;base.target=150;step(frog);step(base);assert.ok(frog.vx>base.vx);
  turtle.entities=[{kind:'rock',id:'r',x:120,y:0,radius:12}];step(turtle);assert.equal(turtle.slow,0.4);
  whale.entities=[];const pace=createRun(0);pace.entities=[];step(whale);step(pace);assert.ok(whale.distance>pace.distance);
});
test('collision cooldown, soft slowing, and return from outside river', () => {
  const r=createRun(0);r.entities=[{kind:'rock',id:'r',x:120,y:0,radius:12}];
  step(r);assert.equal(r.collisions,1);step(r);assert.equal(r.collisions,1);
  assert.ok(r.distance>0);assert.ok(Math.abs(r.vx)>0);
  r.entities=[];r.x=-200;r.target=-1000;
  for(let i=0;i<180;i++)step(r);
  assert.ok(r.x>=riverAt(r.distance,r.level).left-4);
  r.x=1000;r.target=1000;for(let i=0;i<180;i++)step(r);
  assert.ok(r.x<=riverAt(r.distance,r.level).right+4);
});
test('collection is unique for both tap and proximity; paused taps ignored', () => {
  const r=createRun(0);const item={kind:'collect',id:'one',item:1,x:120,y:0};r.entities=[item];
  assert.equal(tapCollect(r,120,0),true);step(r);assert.equal(collect(r,item),false);assert.equal(r.count,1);
  r.status='paused';assert.equal(collect(r,{kind:'collect',item:2}),false);
});
test('drag is not a tap; multitouch and cancelled gestures cannot collect', () => {
  const drags=[],taps=[];const g=createGesture(x=>drags.push(x),(x,y)=>taps.push([x,y]));
  g.down(1,0,0);g.move(1,30,0);g.up(1,30,0);assert.equal(drags.length,1);assert.equal(taps.length,0);
  g.down(1,10,10);g.up(1,11,11);assert.equal(taps.length,1);
  g.down(1,10,10);g.down(2,20,20);g.up(1,10,10);g.up(2,20,20);assert.equal(taps.length,1);
  g.down(3,10,10);g.cancel();g.up(3,10,10);assert.equal(taps.length,1);
});
test('stars have independent bonuses and inclusive collection/collision boundaries', () => {
  assert.equal(rate(6,10,2),3);assert.equal(rate(5,10,2),2);assert.equal(rate(6,10,3),2);assert.equal(rate(5,10,3),1);
  assert.equal(rate(6,11,2),2);assert.equal(rate(7,11,2),3);
});
test('all six levels finish without input; result is emitted once', () => {
  for(let id=0;id<6;id++) {
    const r=createRun(id);for(let i=0;i<120*60 && r.status==='running';i++)step(r);
    assert.equal(r.status,'arrived');assert.ok(r.time<90);
    const summary=finish(r);assert.ok(summary.stars>=1);assert.equal(finish(r),null);
  }
});
test('both fork routes finish and left scenic route is slower', () => {
  const times=[];
  for(const side of [-1,1]){
    const r=createRun(2);
    for(let i=0;i<9000 && r.status==='running';i++){
      const river=riverAt(r.distance,r.level);r.target=side<0?river.left+20:river.right-20;step(r);
    }
    assert.equal(r.status,'arrived');times.push(r.time);
  }
  assert.ok(times[0]>times[1]);
});
test('one star unlocks next level; replay cannot lower best stars or count', () => {
  const save=defaults();applyResult(save,{mode:'level',levelId:0,stars:1,count:2,found:[1]});assert.equal(save.completed,1);
  applyResult(save,{mode:'level',levelId:0,stars:3,count:8,found:[1,2]});
  applyResult(save,{mode:'level',levelId:0,stars:1,count:1,found:[2]});
  assert.deepEqual(save.best[0],{stars:3,count:8});assert.deepEqual(save.discovered,[1,2]);
});
test('protected challenge simulation remains bounded over an hour and uses only unlocked regions', () => {
  const r=createRun(0,'free',2);r.cooldown=3601;let max=0;
  for(let i=0;i<3600*60;i++) {step(r);r.events.length=0;max=Math.max(max,r.entities.length);assert.ok(r.level.id<2);}
  assert.equal(r.status,'running');assert.ok(r.segment>60);assert.ok(max<100);assert.ok(r.particles.length<=40);
  const summary=finish(r);assert.equal(summary.stars,0);const save=defaults();applyResult(save,summary);assert.equal(save.completed,0);
});
