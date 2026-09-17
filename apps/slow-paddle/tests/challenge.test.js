import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, step, advance, finish } from '../src/game/engine.js';
import { meters, challengeSpeed, nextMarker, setupChallenge } from '../src/game/challenge.js';
import { LEVELS, riverAt } from '../src/game/data.js';
import { defaults, validate, applyResult, createStorage } from '../src/lib/storage.js';
import { sendCard } from '../src/lib/media.js';

const hit = r => { r.entities = [{ kind: 'rock', x: r.x, y: r.distance, radius: 12 }]; step(r); };
test('third distinct collision ends a challenge exactly once, without advancing after death', () => {
  const r = createRun(0, 'free'); assert.equal(r.lives, 3);
  hit(r); assert.equal(r.lives, 2); assert.equal(r.status, 'running');
  r.cooldown = 0; hit(r); assert.equal(r.lives, 1);
  r.cooldown = 0; const distance = r.distance; hit(r);
  assert.equal(r.lives, 0); assert.equal(r.status, 'wrecked'); assert.equal(r.distance, distance);
  const snapshot = JSON.stringify(r); advance(r, 1/60); assert.equal(JSON.stringify(r), snapshot);
  const result = finish(r); assert.equal(result.endReason, 'lives'); assert.equal(result.stars, 0);
  assert.equal(result.distance, meters(distance)); assert.equal(finish(r), null);
  assert.equal(createRun(0, 'free').lives, 3);
});
test('two-second shield blocks separate hazards and a used hazard never removes another life', () => {
  const r = createRun(0, 'free'); hit(r); const old = r.entities[0];
  hit(r); assert.equal(r.lives, 2);
  r.entities = []; for (let i = 0; i < 100; i++) step(r);
  hit(r); assert.equal(r.lives, 2);
  r.entities = []; for (let i = 0; i < 20; i++) step(r);
  old.x = r.x; old.y = r.distance; r.entities = [old]; step(r); assert.equal(r.lives, 2);
  hit(r); assert.equal(r.lives, 1);
});
test('soft obstacles and river banks cost no hearts; relaxed levels remain nonlethal', () => {
  const r = createRun(0, 'free');
  for (const kind of ['weed', 'shoal', 'vortex', 'wind']) {
    r.entities = [{ kind, x: r.x, y: r.distance, radius: 25 }]; step(r); assert.equal(r.lives, 3);
  }
  r.entities = []; r.x = r.target = -100;
  for (let i = 0; i < 180; i++) step(r);
  assert.equal(r.lives, 3); assert.ok(r.x >= riverAt(r.distance, r.level).left - 4);
  const level = createRun(0);
  for (let i = 0; i < 6; i++) { level.cooldown = 0; hit(level); }
  assert.equal(level.collisions, 6); assert.equal(level.status, 'running'); assert.equal(level.lives, null);
});
test('challenge collision outcome and distance are consistent across frame rates; pause freezes lives', () => {
  const runs = [30, 60, 120].map(fps => {
    const r = createRun(0, 'free', 6, 3);
    for (let i = 0; i < fps * 120; i++) advance(r, 1/fps);
    return r;
  });
  for (const r of runs.slice(1)) {
    assert.equal(r.lives, runs[0].lives); assert.equal(r.status, runs[0].status);
    assert.ok(Math.abs(r.distance - runs[0].distance) < .001);
  }
  const r = runs[0]; r.status = 'paused'; const before = JSON.stringify(r);
  for (let i = 0; i < 60; i++) step(r); assert.equal(JSON.stringify(r), before);
});
test('speed and density plateau; seeded rows preserve a clear river lane including forks', () => {
  assert.equal(challengeSpeed(0), 1.1); assert.equal(challengeSpeed(8000), 1.75);
  assert.equal(challengeSpeed(1e8), 1.75); assert.ok(challengeSpeed(4000) > challengeSpeed(0));
  assert.equal(meters(999.99), 249); assert.equal(meters(1000), 250); assert.equal(nextMarker(1000), 500);
  for (const level of LEVELS) for (const distance of [0, 8000, 1e8]) for (let seed = 0; seed < 5; seed++) {
    const r = createRun(level.id, 'free', 6, seed); r.segmentStart = distance; setupChallenge(r);
    const hard = r.entities.filter(e => ['log','rock'].includes(e.kind));
    const first = JSON.stringify(hard); setupChallenge(r);
    assert.equal(JSON.stringify(r.entities.filter(e => ['log','rock'].includes(e.kind))), first);
    hard.forEach((e, i) => {
      if (i) assert.ok(e.y - hard[i-1].y >= 110);
      const river = riverAt(e.y - distance, level);
      assert.ok(e.x - e.radius >= river.left && e.x + e.radius <= river.right);
      if (river.island) {
        assert.ok(Math.abs(e.x - river.island.x) > river.island.radius + e.radius);
        const clearLane = e.x < river.island.x ? river.right - river.island.x - river.island.radius : river.island.x - river.island.radius - river.left;
        assert.ok(clearLane > 36);
      } else assert.ok(Math.max(e.x - e.radius - river.left, river.right - e.x - e.radius) > 36);
    });
  }
});
test('best distance survives reload, never decreases, and old saves retain their level progress', async () => {
  const old = defaults(); delete old.challengeBest; delete old.challengeSeen; old.completed = 3;
  const save = validate(old); assert.equal(save.challengeBest, 0); assert.equal(save.completed, 3);
  for (const distance of [500, 250, 500, NaN, -1]) applyResult(save, { mode: 'free', distance, found: [] });
  assert.equal(save.challengeBest, 500); assert.equal(save.completed, 3);
  let raw = null; const env = { localStorage: { getItem: () => raw, setItem: (_, v) => { raw = v; } } };
  const store = createStorage(env); await store.load(); await store.write(save);
  assert.equal((await createStorage(env).load()).challengeBest, 500);
  const r = createRun(0, 'free'); r.distance = 2003.9; r.status = 'paused';
  const summary = finish(r); assert.equal(summary.distance, 500); assert.equal(summary.endReason, 'shore'); assert.equal(summary.lives, 3);
});
test('challenge note carries the settled distance and personal best using temporary media', async () => {
  let note;
  const env = { xhs: { miniTool: { writeTempFile: async () => ({ filePath: '/tmp/card.png' }), postNote: async args => { note = args; } } } };
  const result = await sendCard(env, 'data:image/png;base64,AA', 'post', { mode: 'free', distance: 473, bestDistance: 1250 });
  assert.equal(result.ok, true); assert.match(note.title, /473米/); assert.match(note.content, /1250 米/);
  assert.deepEqual(note.mediaInfo.image_resources, [{ url: '/tmp/card.png' }]);
});
