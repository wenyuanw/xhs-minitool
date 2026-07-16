/**
 * Procedural SFX / BGM via Web Audio API.
 * No audio files — compatible with offline zip (no .mp3/.wav allowed).
 */

const MUTE_KEY = 'football-catch-muted';

let ctx = null;
let master = null;
let musicGain = null;
let sfxGain = null;
let musicTimer = 0;
let musicStep = 0;
let unlocked = false;

function readMuted() {
  try {
    const v = localStorage.getItem(MUTE_KEY);
    // default OFF until user explicitly enables
    if (v === null) return true;
    return v === '1';
  } catch {
    return true;
  }
}

let muted = readMuted();

function ensure() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.85;
    master.connect(ctx.destination);

    musicGain = ctx.createGain();
    musicGain.gain.value = 0.14;
    musicGain.connect(master);

    sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.55;
    sfxGain.connect(master);
  }
  return ctx;
}

export async function unlockAudio() {
  const ac = ensure();
  if (!ac) return false;
  if (ac.state === 'suspended') {
    try {
      await ac.resume();
    } catch {
      /* ignore */
    }
  }
  unlocked = ac.state === 'running';
  return unlocked;
}

export function isMuted() {
  return muted;
}

export function setMuted(next) {
  muted = Boolean(next);
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    /* ignore */
  }
  if (muted) stopMusic();
  else if (unlocked) startMusic();
  return muted;
}

export function toggleMuted() {
  return setMuted(!muted);
}

function tone(freq, when, dur, type = 'sine', gain = 0.2, dest = sfxGain) {
  const ac = ensure();
  if (!ac || !dest || muted) return;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, when);
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(gain, when + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  osc.connect(g);
  g.connect(dest);
  osc.start(when);
  osc.stop(when + dur + 0.02);
}

export function sfxClick() {
  const ac = ensure();
  if (!ac || muted) return;
  const t = ac.currentTime;
  tone(660, t, 0.06, 'triangle', 0.12);
  tone(880, t + 0.04, 0.05, 'triangle', 0.08);
}

export function sfxCatch(kind = 'ball') {
  const ac = ensure();
  if (!ac || muted) return;
  const t = ac.currentTime;
  if (kind === 'gold') {
    tone(523, t, 0.08, 'triangle', 0.16);
    tone(659, t + 0.06, 0.08, 'triangle', 0.14);
    tone(784, t + 0.12, 0.12, 'triangle', 0.12);
    return;
  }
  tone(392, t, 0.05, 'square', 0.08);
  tone(523, t + 0.04, 0.08, 'triangle', 0.12);
}

export function sfxBonus(kind = 'clock') {
  const ac = ensure();
  if (!ac || muted) return;
  const t = ac.currentTime;
  if (kind === 'boost') {
    tone(587, t, 0.07, 'sine', 0.14);
    tone(740, t + 0.07, 0.08, 'sine', 0.12);
    tone(880, t + 0.14, 0.12, 'sine', 0.1);
    return;
  }
  tone(698, t, 0.08, 'sine', 0.13);
  tone(880, t + 0.08, 0.1, 'sine', 0.11);
}

export function sfxCard(kind = 'yellow') {
  const ac = ensure();
  if (!ac || muted) return;
  const t = ac.currentTime;
  if (kind === 'red') {
    tone(220, t, 0.12, 'sawtooth', 0.1);
    tone(165, t + 0.08, 0.18, 'sawtooth', 0.09);
    return;
  }
  tone(330, t, 0.1, 'square', 0.08);
  tone(277, t + 0.08, 0.14, 'square', 0.07);
}

export function sfxMiss() {
  const ac = ensure();
  if (!ac || muted) return;
  tone(180, ac.currentTime, 0.1, 'triangle', 0.06);
}

export function sfxStart() {
  const ac = ensure();
  if (!ac || muted) return;
  const t = ac.currentTime;
  tone(392, t, 0.08, 'triangle', 0.12);
  tone(523, t + 0.08, 0.08, 'triangle', 0.12);
  tone(659, t + 0.16, 0.14, 'triangle', 0.14);
}

export function sfxDive() {
  const ac = ensure();
  if (!ac || muted) return;
  const t = ac.currentTime;
  tone(220, t, 0.08, 'sawtooth', 0.08);
  tone(440, t + 0.05, 0.1, 'triangle', 0.12);
}

export function sfxMust() {
  const ac = ensure();
  if (!ac || muted) return;
  const t = ac.currentTime;
  tone(740, t, 0.07, 'square', 0.08);
  tone(988, t + 0.07, 0.1, 'triangle', 0.12);
}

export function sfxHeat() {
  const ac = ensure();
  if (!ac || muted) return;
  const t = ac.currentTime;
  tone(523, t, 0.06, 'triangle', 0.1);
  tone(659, t + 0.05, 0.06, 'triangle', 0.1);
  tone(784, t + 0.1, 0.12, 'triangle', 0.12);
}

export function sfxOver(win = false) {
  const ac = ensure();
  if (!ac || muted) return;
  const t = ac.currentTime;
  if (win) {
    tone(523, t, 0.1, 'triangle', 0.14);
    tone(659, t + 0.1, 0.1, 'triangle', 0.13);
    tone(784, t + 0.2, 0.18, 'triangle', 0.12);
  } else {
    tone(392, t, 0.12, 'sine', 0.1);
    tone(330, t + 0.12, 0.16, 'sine', 0.09);
  }
}

const MELODY = [
  262, 330, 392, 523,
  392, 330, 294, 330,
  349, 392, 440, 523,
  494, 440, 392, 330,
];

function scheduleMusicBeat() {
  const ac = ensure();
  if (!ac || muted || !musicGain) return;
  const t = ac.currentTime;
  const note = MELODY[musicStep % MELODY.length];
  const bass = MELODY[musicStep % 4] / 2;
  tone(note, t, 0.18, 'triangle', 0.22, musicGain);
  if (musicStep % 2 === 0) tone(bass, t, 0.28, 'sine', 0.12, musicGain);
  if (musicStep % 4 === 0) tone(note * 2, t, 0.08, 'sine', 0.06, musicGain);
  musicStep += 1;
}

export function startMusic() {
  const ac = ensure();
  if (!ac || muted) return;
  if (musicTimer) return;
  musicStep = 0;
  scheduleMusicBeat();
  musicTimer = window.setInterval(scheduleMusicBeat, 220);
}

export function stopMusic() {
  if (musicTimer) {
    window.clearInterval(musicTimer);
    musicTimer = 0;
  }
}
