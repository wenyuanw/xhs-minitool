export function createAudio(env = window) {
  let context, master, noiseSource, musicTimer, sceneName = 'home', noteIndex = 0, enabled = false, generation = 0;
  const tones = new Set();
  const melodies = {
    home: [262, 330, 392, 330, 294, 330, 440, 392],
    map: [294, 370, 440, 370, 330, 392, 494, 440],
    atlas: [330, 440, 494, 440, 392, 494, 587, 494],
    dock: [220, 294, 330, 392, 330, 294, 262, 294],
    wardrobe: [262, 349, 440, 523, 440, 349, 330, 392],
    settings: [247, 330, 392, 330, 294, 370, 440, 370],
    game: [196, 247, 294, 330, 294, 247, 220, 262],
    result: [330, 392, 494, 659, 587, 494, 440, 523],
  };
  async function enable() {
    const ticket = generation;
    try {
      const AC = env.AudioContext || env.webkitAudioContext;
      if (!AC) return false;
      if (!context) { context = new AC(); master = context.createGain(); master.gain.value = 0.12; master.connect(context.destination); }
      if (context.state !== 'running') await context.resume();
      enabled = ticket === generation && context.state === 'running';
      return enabled;
    } catch { enabled = false; return false; }
  }
  function tone(freq, duration, delay = 0, volume = 0.2, type = 'sine') {
    if (!enabled || !context || context.state !== 'running') return;
    const o = context.createOscillator(), g = context.createGain(), t = context.currentTime + delay;
    o.type = type; o.frequency.value = freq; g.gain.setValueAtTime(0.001, t); g.gain.linearRampToValueAtTime(volume, t + 0.02); g.gain.exponentialRampToValueAtTime(0.001, t + duration);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + duration + 0.02);
    tones.add(o);
    o.onended = () => { tones.delete(o); o.disconnect(); g.disconnect(); };
  }
  function effect(kind) {
    if (kind === 'collect') { tone(660, 0.16, 0, 0.24, 'triangle'); tone(880, 0.2, 0.09, 0.2, 'triangle'); }
    else if (kind === 'currency') { tone(880, 0.08, 0, 0.22, 'square'); tone(1175, 0.13, 0.07, 0.18, 'square'); }
    else if (kind === 'chain') { tone(784, 0.08, 0, 0.22, 'square'); tone(988, 0.1, 0.07, 0.2, 'square'); tone(1319, 0.22, 0.14, 0.18, 'triangle'); }
    else if (kind === 'discover') { tone(523, 0.18, 0, 0.2); tone(659, 0.2, 0.1, 0.2); tone(784, 0.26, 0.2, 0.18); }
    else if (kind === 'bump' || kind === 'damage') { tone(kind === 'damage' ? 110 : 160, 0.2, 0, 0.3, 'sawtooth'); }
    else if (kind === 'bird') { tone(1200, 0.07, 0, 0.16, 'triangle'); tone(1500, 0.07, 0.13, 0.14, 'triangle'); }
    else if (kind === 'paddle') { tone(220, 0.08, 0, 0.18, 'triangle'); tone(330, 0.15, 0.06, 0.12, 'sine'); }
    else if (kind === 'unlock') { tone(392, 0.15); tone(523, 0.18, 0.12); tone(784, 0.32, 0.25); }
    else if (kind === 'stamp') { tone(523, 0.12, 0, 0.18, 'square'); tone(659, 0.16, 0.1, 0.18); tone(1047, 0.3, 0.22, 0.18, 'triangle'); }
    else if (kind === 'select') { tone(440, 0.1, 0, 0.16, 'triangle'); }
    else if (kind === 'finish') { tone(440, 0.3); tone(550, 0.3, 0.15); tone(660, 0.45, 0.3); }
    else tone(280, 0.12, 0, 0.18, 'triangle');
  }
  function stopSources() {
    if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
    tones.forEach(o => { try { o.stop(); } catch { /* Already ended. */ } }); tones.clear();
    if (noiseSource) { try { noiseSource.stop(); } catch { /* Already ended. */ } noiseSource.disconnect(); noiseSource = null; }
  }
  function beginScene() {
    if (!enabled || !context || context.state !== 'running') return false;
    stopSources(); noteIndex = 0;
    const notes = melodies[sceneName] || melodies.home;
    const playNote = () => { const note = notes[noteIndex % notes.length]; tone(note, 0.5, 0, 0.045, 'triangle'); if (noteIndex % 2 === 0) tone(note / 2, 0.7, 0, 0.025, 'sine'); noteIndex++; };
    playNote(); musicTimer = setInterval(playNote, sceneName === 'game' ? 520 : 620);
    if (sceneName === 'game') {
      const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
      const a = buffer.getChannelData(0); let last = 0;
      for (let i = 0; i < a.length; i++) { last = (last + (Math.random() * 2 - 1) * 0.03) / 1.03; a[i] = last * 0.32; }
      noiseSource = context.createBufferSource(); noiseSource.buffer = buffer; noiseSource.loop = true; noiseSource.connect(master); noiseSource.start();
    }
    return true;
  }
  function setScene(name) { sceneName = melodies[name] ? name : 'home'; if (enabled) beginScene(); }
  async function start(name) {
    if (name) sceneName = melodies[name] ? name : 'home';
    const ticket = generation;
    if (!await enable()) return false;
    if (ticket !== generation) return false;
    return beginScene();
  }
  function stop() {
    generation++; enabled = false;
    stopSources();
    if (context && context.state === 'running') context.suspend().catch(() => {});
  }
  function disable() { enabled = false; stop(); }
  return { enable, start, stop, disable, effect, setScene, get active() { return enabled; }, get scene() { return sceneName; } };
}
