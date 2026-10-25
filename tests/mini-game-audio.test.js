import test from 'node:test'
import assert from 'node:assert/strict'
import { renderGameTone, midiNoteName, GAME_AUDIO_LEVEL, createMiniGameAudio } from '../src/miniGameAudio.js'

test('game tones are audible, peak-bounded, and smoothly released at phone and desktop sample rates', () => {
  for (const sampleRate of [22050, 44100, 48000]) {
    for (const [timbre, frequencies] of [['memory', [140]], ['memory', [1280]], ['piano', [130.81, 164.81, 196, 246.94]]]) {
      const samples = renderGameTone(frequencies, { sampleRate, timbre, duration: 1.4 })
      const peak = samples.reduce((max, value) => Math.max(max, Math.abs(value)), 0)
      const rms = Math.sqrt(samples.reduce((sum, value) => sum + value * value, 0) / samples.length)
      const expectedPeak = timbre === 'memory' ? 0.26 : 0.62
      assert.ok(Math.abs(peak - expectedPeak) < 0.001)
      assert.ok(rms * GAME_AUDIO_LEVEL > 0.07)
      assert.equal(samples[0], 0)
      assert.equal(samples.at(-1), 0)
      assert.ok(samples.every(Number.isFinite))
    }
  }
})

test('piano voicings retain each note and memory tones retain a clear fundamental', () => {
  const sampleRate = 24000
  const strength = (samples, frequency) => {
    let real = 0
    let imaginary = 0
    for (let i = 0; i < samples.length; i += 1) {
      real += samples[i] * Math.cos(2 * Math.PI * frequency * i / sampleRate)
      imaginary += samples[i] * Math.sin(2 * Math.PI * frequency * i / sampleRate)
    }
    return Math.hypot(real, imaginary) / samples.length
  }
  const notes = [220, 277.18, 329.63, 415.3]
  const chord = renderGameTone(notes, { sampleRate })
  for (const note of notes) assert.ok(strength(chord, note) > strength(chord, note + 17) * 8)
  const memory = renderGameTone([440], { sampleRate, timbre: 'memory' })
  assert.ok(strength(memory, 440) > strength(memory, 880) * 4)
  assert.throws(() => renderGameTone([NaN]))
  assert.equal(midiNoteName(60), 'C4')
  assert.equal(midiNoteName(58), 'Bb3')
})

test('creating and muting a game player does not open an audio context on page load', () => {
  const player = createMiniGameAudio()
  player.setLevel(0)
  player.stop()
  player.close()
})

test('retrigger fades the previous voice, respects volume changes, and releases nodes after playback', async () => {
  const contexts = []
  class Param {
    constructor() { this.value = 1 }
    setTargetAtTime(value) { this.value = value }
    cancelScheduledValues() {}
  }
  class Node {
    constructor() { this.gain = new Param() }
    connect() {}
    disconnect() { this.disconnected = true }
    start() {}
    stop() { this.stopped = true }
  }
  class Context {
    constructor() { this.sampleRate = 22050; this.currentTime = 0; this.state = 'suspended'; this.sources = []; this.gains = []; contexts.push(this) }
    async resume() { this.state = 'running' }
    async close() { this.state = 'closed' }
    createGain() { const gain = new Node(); this.gains.push(gain); return gain }
    createDynamicsCompressor() { return Object.fromEntries(['threshold', 'knee', 'ratio', 'attack', 'release'].map((name) => [name, new Param()]).concat([['connect', () => {}]])) }
    createBuffer(channels, length) { return { getChannelData: () => new Float32Array(length) } }
    createBufferSource() { const source = new Node(); this.sources.push(source); return source }
  }
  const originalWindow = globalThis.window
  globalThis.window = { AudioContext: Context }
  const player = createMiniGameAudio()
  try {
    const first = player.play([440], { duration: 0.3 })
    await Promise.resolve()
    const context = contexts[0]
    assert.equal(context.sources.length, 1)
    player.setLevel(0.4)
    assert.equal(context.gains[0].gain.value, 0.4)
    const second = player.play([660], { duration: 0.3 })
    assert.equal(await first, false)
    assert.equal(context.sources[0].stopped, true)
    assert.equal(context.gains[1].gain.value, 0)
    context.sources[0].onended()
    context.sources[1].onended()
    assert.equal(await second, true)
    assert.ok(context.sources.every((source) => source.disconnected))
    assert.equal(context.gains[0].gain.value, 0.4)
    player.setLevel(10)
    assert.equal(context.gains[0].gain.value, 1)
    player.close()
    assert.equal(await player.play([440]), false)
    assert.equal(context.state, 'closed')
  } finally {
    if (originalWindow === undefined) delete globalThis.window
    else globalThis.window = originalWindow
    player.close()
  }
})
