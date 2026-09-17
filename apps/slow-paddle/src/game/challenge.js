import { random, riverAt, SPEED } from './data.js';

export const MAX_LIVES = 3;
export const HIT_SHIELD = 2;
export const meters = distance => Math.max(0, Math.floor(distance / 4));
export const challengeSpeed = distance => 1.1 + Math.min(0.65, meters(distance) / 2000 * 0.65);
export const nextMarker = distance => (Math.floor(meters(distance) / 250) + 1) * 250;

export function setupChallenge(run) {
  if (run.mode !== 'free') return;
  // Replace hard obstacles rather than stacking rows on top of the relaxed route.
  run.entities = run.entities.filter(e => !['rock', 'log'].includes(e.kind));
  const rng = random(run.level.seed + run.segment * 7919 + run.journey.seed * 101);
  const spacing = Math.max(110, 165 - Math.floor(meters(run.segmentStart) / 250) * 8);
  const length = run.level.duration * SPEED;
  for (let y = 220, i = 0; y < length - 90; y += spacing, i++) {
    const river = riverAt(y, run.level);
    let x = river.left + 20 + rng() * (river.right - river.left - 40);
    if (river.island) {
      x = rng() < 0.5 ? (river.left + river.island.x - river.island.radius) / 2 : (river.right + river.island.x + river.island.radius) / 2;
    }
    const kind = rng() < 0.35 ? 'rock' : 'log';
    run.entities.push({ id: `challenge:${run.segment}:${i}`, kind, x, y: run.segmentStart + y, radius: kind === 'log' ? 14 : 12 });
  }
}
