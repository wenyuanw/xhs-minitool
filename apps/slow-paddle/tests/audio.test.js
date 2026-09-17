import test from 'node:test';
import assert from 'node:assert/strict';
import { createAudio } from '../src/lib/audio.js';

class Param {
  setValueAtTime() {}
  linearRampToValueAtTime() {}
  exponentialRampToValueAtTime() {}
}
class Node {
  connect() { return this; }
  disconnect() {}
  start() {}
  stop() {}
}
class AudioContextMock {
  constructor() { this.state = 'suspended'; this.currentTime = 0; this.sampleRate = 8000; this.destination = new Node(); this.oscillators = 0; this.buffers = 0; AudioContextMock.last = this; }
  async resume() { this.state = 'running'; }
  async suspend() { this.state = 'suspended'; }
  createGain() { const node = new Node(); node.gain = new Param(); return node; }
  createOscillator() { this.oscillators++; const node = new Node(); node.frequency = { value: 0 }; return node; }
  createBuffer(channels, length) { const data = new Float32Array(length); return { getChannelData: () => data }; }
  createBufferSource() { this.buffers++; return new Node(); }
}

test('scene music switches locally and effects share the enabled audio graph', async () => {
  const audio = createAudio({ AudioContext: AudioContextMock });
  assert.equal(await audio.start('home'), true); assert.equal(audio.active, true); assert.equal(audio.scene, 'home');
  const context = AudioContextMock.last, before = context.oscillators;
  audio.setScene('game'); assert.equal(audio.scene, 'game'); assert.ok(context.buffers >= 1); assert.ok(context.oscillators > before);
  audio.effect('currency'); assert.ok(context.oscillators > before + 1);
  audio.stop(); assert.equal(audio.active, false); assert.equal(context.state, 'suspended');
});
