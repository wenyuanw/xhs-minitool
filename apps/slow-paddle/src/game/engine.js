import { MAX_LIVES, HIT_SHIELD, meters, challengeSpeed, setupChallenge } from './challenge.js';
import { createJourney, setupJourneySegment, stepJourney, tryGlide, tapEncounter } from './journey.js';
import { CHARACTERS, LEVELS, SPEED, STEP, clamp, riverAt, generateLevel } from './data.js';

export function createRun(levelId, mode = 'level', unlocked = 1, seed = 0, characterId = 0) {
  const level = LEVELS[levelId];
  const entities = generateLevel(level);
  const character = CHARACTERS[characterId] || CHARACTERS[0];
  const run = { lives: mode === 'free' ? MAX_LIVES : null, endReason: null, journey: createJourney(seed), levelId, level, mode, unlocked, distance: 0, time: 0, x: 120, vx: 0, target: 120,
    characterId: CHARACTERS.indexOf(character), character, boost: 0, boostMax: character.boost, cooldown: 0, slow: 0, collisions: 0, count: 0, shells: 0, found: [], entities,
    total: entities.filter(e => e.kind === 'collect').length, segment: 0, segmentStart: 0,
    segmentEnd: level.duration * SPEED, status: 'running', particles: [], events: [], accumulator: 0 };
  setupChallenge(run); setupJourneySegment(run); return run;
}
export function paddle(run) {
  if (run.status === 'running' && run.boost <= 0) { run.boost = run.boostMax; tryGlide(run); return true; }
  return false;
}
export function collect(run, entity) {
  if (run.status !== 'running' || !['collect', 'currency'].includes(entity.kind) || entity.taken) return false;
  entity.taken = true;
  if (entity.kind === 'currency') {
    const amount = (entity.amount || 1) * run.character.shellValue;
    run.shells += amount;
    run.events.push({ type: 'currency', amount });
    for (let i = 0; i < 4 && run.particles.length < 40; i++) run.particles.push({ x: entity.x, y: entity.y, life: 0.7, vx: (i - 1.5) * 12 });
    return true;
  }
  run.count++;
  if (!run.found.includes(entity.item)) run.found.push(entity.item);
  run.events.push({ type: 'collect', item: entity.item });
  for (let i = 0; i < 5 && run.particles.length < 40; i++) run.particles.push({ x: entity.x, y: entity.y, life: 0.7, vx: (i - 2) * 11 });
  return true;
}
export function tapCollect(run, x, worldY) {
  const entity = run.entities.find(e => ['collect', 'currency'].includes(e.kind) && !e.taken && Math.hypot(e.x - x, e.y - worldY) < 16);
  return entity ? collect(run, entity) : tapEncounter(run, x, worldY);
}
export function rate(count, total, collisions) { return 1 + (total > 0 && count >= Math.ceil(total * 0.6) ? 1 : 0) + (collisions <= 2 ? 1 : 0); }
export function finish(run) {
  if (run.status === 'finished') return null;
  run.status = 'finished';
  return { mode: run.mode, levelId: run.levelId, count: run.count, total: run.total, collisions: run.collisions,
    seconds: Math.round(run.time), distance: meters(run.distance), lives: run.lives, endReason: run.endReason || 'shore', found: run.found.slice(), shells: run.shells,
    wish: run.journey.wish, wishDone: run.journey.wishDone, glides: run.journey.glides, stories: run.journey.stories.slice(),
    stars: run.mode === 'level' ? rate(run.count, run.total, run.collisions) : 0 };
}
export function step(run, dt = STEP) {
  if (run.status !== 'running') return;
  run.time += dt;
  run.cooldown = Math.max(0, run.cooldown - dt);
  run.slow = Math.max(0, run.slow - dt);
  run.boost = Math.max(0, run.boost - dt);
  stepJourney(run, dt);
  const localY = run.distance - run.segmentStart;
  const river = riverAt(localY, run.level);
  let push = 0, factor = run.slow > 0 ? 0.62 : 1;
  run.entities.forEach(e => {
    if (e.taken || run.status !== 'running') return;
    if (e.kind === 'log') {
      if (e.originX === undefined) e.originX = e.x;
      e.x = e.originX + Math.sin(run.time * 0.45 + e.y) * 5;
    }
    const dy = Math.abs(e.y - run.distance), dx = run.x - e.x;
    if (e.kind === 'collect' || e.kind === 'currency') {
      if (dy < 17 && Math.abs(dx) < 15) collect(run, e);
      return;
    }
    if (e.kind === 'duck') {
      if (!e.triggered && dy < 55 && Math.abs(dx) < 50) { e.triggered = true; run.events.push({ type: 'bird' }); }
      if (e.triggered) e.x += dt * 9;
      return;
    }
    const nearby = dy < e.radius + 12 && Math.abs(dx) < e.radius + 6;
    if ((e.kind === 'rock' || e.kind === 'log') && nearby && run.cooldown === 0 && !(run.mode === 'free' && e.hit)) {
      run.journey.glide = 0; run.collisions++; run.cooldown = run.mode === 'free' ? HIT_SHIELD : 1.2; run.slow = run.character.slow;
      if (run.mode === 'free') {
        e.hit = true; run.lives = Math.max(0, run.lives - 1);
        run.events.push({ type: 'damage', lives: run.lives });
        if (run.lives === 0) { run.status = 'wrecked'; run.endReason = 'lives'; }
      }
      run.vx += (dx >= 0 ? 1 : -1) * 65;
      run.target = clamp(run.x + (dx >= 0 ? 20 : -20), river.left + 10, river.right - 10);
      run.events.push({ type: 'bump' });
    } else if ((e.kind === 'weed' || e.kind === 'shoal') && nearby) factor = Math.min(factor, 0.65);
    else if (e.kind === 'vortex' && dy < 40 && Math.abs(dx) < 42) push += clamp(-dx * 0.7, -16, 16);
    else if (e.kind === 'wind' && dy < 50) push += 13;
  });
  if (run.status === 'wrecked') return;
  let safeTarget = clamp(run.target, river.left + 9, river.right - 9);
  if (river.island && Math.abs(run.x - river.island.x) < river.island.radius + 9) {
    const side = run.x < river.island.x ? -1 : 1;
    safeTarget = river.island.x + side * (river.island.radius + 12);
    run.x += side * dt * 22;
  }
  if (river.island) factor *= run.x < river.island.x ? 0.9 : 1.08;
  run.vx += ((safeTarget - run.x) * 13 * run.character.turn - run.vx * 7 + push * 7) * dt;
  run.x += run.vx * dt;
  // Soft return plus a final generous guard protects against runaway forces.
  if (run.x < river.left + 8) run.x += (river.left + 8 - run.x) * Math.min(1, dt * 5);
  if (run.x > river.right - 8) run.x -= (run.x - river.right + 8) * Math.min(1, dt * 5);
  run.x = clamp(run.x, river.left - 4, river.right + 4);
  run.distance += SPEED * run.character.speed * (run.mode === 'free' ? challengeSpeed(run.distance) : 1) * Math.max(0.5, factor) * (run.journey.glide > 0 ? 1.35 : run.boost > 0 ? 1.2 : 1) * dt;
  run.particles.forEach(p => { p.life -= dt; p.x += p.vx * dt; });
  run.particles = run.particles.filter(p => p.life > 0);
  if (run.distance >= run.segmentEnd) {
    if (run.mode === 'level') { run.distance = run.segmentEnd; run.status = 'arrived'; }
    else {
      run.segment++;
      run.segmentStart = run.segmentEnd;
      run.level = LEVELS[run.segment % run.unlocked];
      run.segmentEnd += run.level.duration * SPEED;
      const next = generateLevel(run.level, run.segment);
      next.forEach(e => { e.y += run.segmentStart; });
      run.entities = next;
      run.total += next.filter(e => e.kind === 'collect').length;
      setupChallenge(run); setupJourneySegment(run);
      run.events.push({ type: 'region', name: run.level.name });
    }
  }
  run.entities = run.entities.filter(e => e.y >= run.distance - 160);
}
export function advance(run, elapsed) {
  run.accumulator += Math.min(0.1, Math.max(0, elapsed));
  while (run.accumulator + 1e-9 >= STEP) { step(run); run.accumulator -= STEP; }
}
