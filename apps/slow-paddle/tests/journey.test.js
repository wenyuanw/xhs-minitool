import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, step, paddle, finish, tapCollect } from '../src/game/engine.js';
import { defaults, validate } from '../src/lib/storage.js';
import { DECOR, ENCOUNTERS, currentX, decorUnlocked, stepJourney, syncJourney } from '../src/game/journey.js';
import { riverAt } from '../src/game/data.js';

test('trip variety is repeatable; each trip has one wish and two distinct encounters', () => {
  const types = new Set();
  for (let seed = 0; seed < 12; seed++) {
    const a = createRun(0, 'level', 1, seed), b = createRun(0, 'level', 1, seed);
    assert.deepEqual(a.journey, b.journey);
    assert.notEqual(a.journey.encountersNow[0].type, a.journey.encountersNow[1].type);
    a.journey.encountersNow.forEach(e => types.add(e.type));
    assert.ok(a.journey.wish >= 0 && a.journey.wish < 3);
  }
  assert.equal(types.size, 4);
});
test('current ribbons and encounters remain inside passable river lanes in all levels', () => {
  for (let level = 0; level < 6; level++) for (let seed = 0; seed < 4; seed++) {
    const r = createRun(level, 'level', 6, seed);
    const safe = (x, y, radius) => {
      const river = riverAt(y, r.level);
      assert.ok(x - radius > river.left && x + radius < river.right);
      if (river.island) assert.ok(Math.abs(x - river.island.x) > river.island.radius + radius);
    };
    r.journey.currents.forEach(c => { for (let y = c.start; y <= c.end; y += 4) safe(currentX(r, c, y), y, 9); });
    r.journey.encountersNow.forEach(e => safe(e.x, e.y, 8));
    r.journey.currents.forEach(c => r.entities.filter(e => ['log','rock'].includes(e.kind) && e.y >= c.start - 30 && e.y <= c.end + 30).forEach(e => assert.ok(Math.abs(e.x - currentX(r,c,e.y)) >= e.radius + 28)));
  }
});
test('paddling on a current activates one bounded glide; collisions cancel it', () => {
  const r = createRun(0); r.entities = [];
  const c = r.journey.currents[0]; r.distance = c.start + 20; r.x = r.target = currentX(r, c, r.distance);
  assert.equal(paddle(r), true); assert.equal(r.journey.glides, 1); assert.equal(r.journey.glide, 3);
  assert.equal(paddle(r), false);
  for (let i = 0; i < 105; i++) step(r);
  paddle(r); assert.equal(r.journey.glides, 1);
  r.entities = [{ kind: 'rock', x: r.x, y: r.distance, radius: 12 }]; step(r); assert.equal(r.journey.glide, 0);
  assert.ok(r.distance > c.start);
});
test('paused runs freeze encounter timers, glides and wishes', () => {
  const r = createRun(0, 'level', 1, 2); r.status = 'paused'; r.journey.glide = 2;
  const before = JSON.stringify(r.journey); for (let i = 0; i < 600; i++) step(r);
  assert.equal(JSON.stringify(r.journey), before); assert.equal(paddle(r), false);
});
test('all four encounters complete through actual movement and do not repeat rewards', () => {
  const seen = new Set();
  for (let type = 0; type < 4; type++) {
    const r = createRun(0, 'level', 1, type), e = r.journey.encountersNow[0];
    r.entities = []; r.distance = e.y - (type === 2 ? 80 : 25); r.x = r.target = e.x;
    for (let i = 0; i < 600 && !e.done; i++) step(r);
    assert.equal(e.done, true, ENCOUNTERS[type].name); assert.equal(r.journey.encounters[type], 1);
    for (let i = 0; i < 120; i++) step(r);
    assert.equal(r.journey.encounters[type], 1); seen.add(type);
  }
  assert.equal(seen.size, 4);
});
test('bottle taps are unique and ignored while paused', () => {
  const r = createRun(0, 'level', 1, 1), e = r.journey.encountersNow[0]; r.entities = [];
  r.status = 'paused'; assert.equal(tapCollect(r, e.x, e.y), false);
  r.status = 'running'; assert.equal(tapCollect(r, e.x, e.y), true);
  assert.equal(tapCollect(r, e.x, e.y), false); assert.equal(r.journey.encounters[1], 1);
});
test('all wishes complete once; rewards checkpoint before settlement and survive old save upgrade', () => {
  const save = defaults();
  for (let seed = 0; seed < 3; seed++) {
    const r = createRun(0, 'level', 1, seed);
    if (seed === 0) r.count = 4;
    if (seed === 1) r.journey.glides = 1;
    if (seed === 2) r.journey.encounters[0] = 1;
    stepJourney(r, 1/60); assert.equal(r.journey.wishDone, true);
    assert.equal(syncJourney(save, r).changed, true);
    const snapshot = JSON.stringify(save);
    for (let i = 0; i < 120; i++) stepJourney(r, 1/60);
    assert.equal(syncJourney(save, r).changed, false); finish(r); syncJourney(save, r);
    assert.equal(JSON.stringify(save), snapshot);
  }
  assert.equal(save.journey.wishes, 3);
  assert.equal(decorUnlocked(save.journey, 1), true); assert.equal(save.journey.equipped[1], true);
  assert.deepEqual(validate(JSON.parse(JSON.stringify(save))), save);
  const old = defaults(); delete old.journey; old.completed = 3; old.best[2] = { stars: 2, count: 5 };
  const upgraded = validate(old); assert.equal(upgraded.completed, 3); assert.deepEqual(upgraded.best[2], old.best[2]);
  assert.equal(upgraded.journey.trips, 0);
});
test('every dock decoration is obtainable; unequipped items stay unequipped after later rewards', () => {
  const save = defaults(), r = createRun(0);
  r.journey.encounters = [1,1,1,1]; r.journey.glides = 1; r.journey.wishDone = true;
  assert.equal(syncJourney(save, r).unlocked.length, 6);
  DECOR.forEach((_, i) => assert.equal(decorUnlocked(save.journey, i), true));
  save.journey.equipped[0] = false; r.journey.encounters[3]++;
  syncJourney(save, r); assert.equal(save.journey.equipped[0], false);
  assert.deepEqual(validate(JSON.parse(JSON.stringify(save))).journey, save.journey);
  const damaged = defaults(); damaged.journey = { trips: -1, wishes: Infinity, encounters: [NaN], equipped: [true,true,true,true,true,true] };
  assert.deepEqual(validate(damaged).journey, defaults().journey);
});
test('protected challenge encounter state stays bounded; story collection has four entries at most', () => {
  const r = createRun(0, 'free', 6); r.cooldown = 601;
  for (let i = 0; i < 600 * 60; i++) {
    step(r); r.events.length = 0;
    assert.equal(r.journey.encountersNow.length, 2); assert.equal(r.journey.currents.length, 2);
    assert.ok(r.journey.stories.length <= 4);
  }
  assert.ok(r.segment > 6);
});
