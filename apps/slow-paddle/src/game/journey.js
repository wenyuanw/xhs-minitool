import { riverAt, clamp } from './data.js';

export const ENCOUNTERS = [
  { name: '送小鸭回家', hint: '靠近小鸭，陪它漂回鸭群', story: '小鸭跟上了家人，回头向你叫了一声。' },
  { name: '水上的来信', hint: '靠近或轻点瓶中信', story: '瓶中写着：愿你今天，也有一小段属于自己的时间。' },
  { name: '萤火微光', hint: '在微光里慢漂两秒', story: '几颗小小的光，陪你走过了一段水路。' },
  { name: '藏起来的码头', hint: '靠近岸边的小码头，停留片刻', story: '木椅还留着太阳的温度。这里也可以是你的歇脚处。' },
];
export const WISHES = [
  { label: '拾起四份小美好', target: 4 },
  { label: '顺着水流滑行一次', target: 1 },
  { label: '完成一次水上奇遇', target: 1 },
];
export const DECOR = [
  { name: '靠岸木椅', hint: '发现藏起来的码头', key: 'dock', x: 74, y: 170 },
  { name: '野花盆栽', hint: '完成一个小心愿', key: 'wish', x: 96, y: 184 },
  { name: '顺风小旗', hint: '完成一次顺流滑行', key: 'glide', x: 156, y: 171 },
  { name: '小鸭木雕', hint: '送一只小鸭回家', key: 'duck', x: 121, y: 193 },
  { name: '瓶中来信', hint: '拾到一封瓶中信', key: 'bottle', x: 144, y: 188 },
  { name: '萤火小灯', hint: '在萤火微光里慢漂', key: 'firefly', x: 176, y: 183 },
];
export function journeyDefaults() { return { trips: 0, wishes: 0, glides: 0, encounters: [0, 0, 0, 0], equipped: [false, false, false, false, false, false] }; }
export function decorUnlocked(j, id) {
  return [j.encounters[3], j.wishes, j.glides, j.encounters[0], j.encounters[1], j.encounters[2]][id] > 0;
}
export function sanitizeJourney(value) {
  const j = journeyDefaults(), count = n => Number.isSafeInteger(n) && n >= 0 ? Math.min(n, 1000000000) : 0;
  if (!value) return j;
  ['trips', 'wishes', 'glides'].forEach(k => { j[k] = count(value[k]); });
  j.encounters = j.encounters.map((_, i) => count(Array.isArray(value.encounters) ? value.encounters[i] : 0));
  j.equipped = j.equipped.map((_, i) => decorUnlocked(j, i) && Array.isArray(value.equipped) && value.equipped[i] === true);
  return j;
}
export function createJourney(seed = 0) {
  return { seed, wish: seed % WISHES.length, wishDone: false, glides: 0, encounters: [0, 0, 0, 0], stories: [], glide: 0,
    current: null, encountersNow: [], currents: [], message: '', messageUntil: 0,
    saved: { wish: 0, glides: 0, encounters: [0, 0, 0, 0] } };
}
export function riverLane(run, y, side = 0) {
  const r = riverAt(y - run.segmentStart, run.level);
  if (r.island) return side <= 0 ? (r.left + r.island.x - r.island.radius) / 2 : (r.right + r.island.x + r.island.radius) / 2;
  return clamp(r.center + side * 46, r.left + 18, r.right - 18);
}
export function currentX(run, current, y) {
  return riverLane(run, y, current.side) + Math.sin((y - current.start) / 72) * 7;
}
export function setupJourneySegment(run) {
  const j = run.journey, start = run.segmentStart, length = run.segmentEnd - start;
  j.glide = 0; j.current = null;
  j.currents = [{ start: start + 170, end: start + 410, side: 0, used: false }, { start: start + length - 420, end: start + length - 160, side: 1, used: false }];
  // Keep the inviting current corridor clear of hard obstacles. Other lanes retain their obstacles.
  run.entities = run.entities.filter(e => !['log', 'rock'].includes(e.kind) || !j.currents.some(c => e.y >= c.start - 30 && e.y <= c.end + 30 && Math.abs(e.x - currentX(run, c, e.y)) < e.radius + 28));
  j.encountersNow = [0, 1].map(i => {
    const type = (j.seed + run.segment * 2 + i) % 4, y = start + length * (i ? 0.67 : 0.33);
    const side = type === 3 ? -1 : i ? 1 : -0.5;
    return { type, y, x: riverLane(run, y, side), stage: 'waiting', progress: 0, done: false };
  });
}
function message(run, text) { run.journey.message = text; run.journey.messageUntil = run.time + 5; }
function resolveEncounter(run, e) {
  if (e.done) return false;
  e.done = true; e.stage = 'done'; run.journey.encounters[e.type]++;
  if (!run.journey.stories.includes(e.type)) run.journey.stories.push(e.type);
  message(run, ENCOUNTERS[e.type].story); run.events.push({ type: 'encounter' }); return true;
}
export function tapEncounter(run, x, y) {
  if (run.status !== 'running') return false;
  const e = run.journey.encountersNow.find(e => e.type === 1 && !e.done && Math.hypot(e.x - x, e.y - y) < 20);
  return e ? resolveEncounter(run, e) : false;
}
export function tryGlide(run) {
  const j = run.journey, current = j.currents.find(c => !c.used && run.distance >= c.start && run.distance <= c.end && Math.abs(run.x - currentX(run, c, run.distance)) < 20);
  if (!current || run.slow > 0 || run.cooldown > 0) return false;
  current.used = true; j.glide = 3; j.glides++; message(run, '顺流而行，水花也轻快起来了'); run.events.push({ type: 'glide' }); return true;
}
export function wishProgress(run) {
  const j = run.journey;
  return Math.min(WISHES[j.wish].target, [run.count, j.glides, j.encounters.reduce((a, b) => a + b, 0)][j.wish]);
}
export function stepJourney(run, dt) {
  const j = run.journey;
  j.glide = Math.max(0, j.glide - dt);
  j.current = j.currents.find(c => !c.used && run.distance >= c.start && run.distance <= c.end && Math.abs(run.x - currentX(run, c, run.distance)) < 20) || null;
  j.encountersNow.forEach(e => {
    if (e.done) return;
    const near = Math.abs(run.distance - e.y) < (e.type === 2 ? 95 : 38) && Math.abs(run.x - e.x) < (e.type === 2 ? 44 : 30);
    if (e.type === 0) {
      if (near && e.stage === 'waiting') { e.stage = 'following'; message(run, '小鸭跟上你了，前面就是它的家人'); }
      if (e.stage === 'following' && run.distance >= e.y + 130) resolveEncounter(run, e);
    } else if (e.type === 1 && near) resolveEncounter(run, e);
    else if (e.type === 2 || e.type === 3) {
      e.progress = near ? e.progress + dt : 0;
      if (e.progress >= (e.type === 2 ? 2 : 0.6)) resolveEncounter(run, e);
    }
  });
  if (!j.wishDone && wishProgress(run) >= WISHES[j.wish].target) {
    j.wishDone = true; message(run, '小心愿完成了 · 码头添了一点美好'); run.events.push({ type: 'wish' });
  }
}
// Delta checkpoints live on the run: repeated frames and settlement cannot award twice.
export function syncJourney(save, run) {
  const j = run.journey, target = save.journey, before = DECOR.map((_, i) => decorUnlocked(target, i));
  let changed = false;
  const apply = (amount, previous, add) => { const delta = amount - previous; if (delta > 0) { add(delta); changed = true; } };
  apply(Number(j.wishDone), j.saved.wish, n => { target.wishes += n; });
  apply(j.glides, j.saved.glides, n => { target.glides += n; });
  j.encounters.forEach((n, i) => apply(n, j.saved.encounters[i], delta => { target.encounters[i] += delta; }));
  j.saved = { wish: Number(j.wishDone), glides: j.glides, encounters: j.encounters.slice() };
  const unlocked = [];
  DECOR.forEach((d, i) => { if (!before[i] && decorUnlocked(target, i)) { target.equipped[i] = true; unlocked.push(d.name); } });
  return { changed, unlocked };
}
