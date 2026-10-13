import test from 'node:test'
import assert from 'node:assert/strict'
import { StudioAudio } from '../src/studioAudio.js'

class Param {
  value = 0
  setValueAtTime(value) { this.value = value }
  linearRampToValueAtTime(value) { this.value = value }
  exponentialRampToValueAtTime(value) { this.value = value }
  setTargetAtTime(value) { this.value = value }
  setValueCurveAtTime(curve, time, duration) { this.curve = curve; this.time = time; this.duration = duration }
  cancelAndHoldAtTime() {}
}
const node = (properties = {}) => ({ connect() {}, disconnect() {}, ...properties })

class TestContext {
  currentTime = 0
  sampleRate = 8000
  state = 'running'
  destination = {}
  oscillators = []
  gains = []
  sources = []
  createGain() { const gain = node({ gain: new Param() }); this.gains.push(gain); return gain }
  createBiquadFilter() { return node({ frequency: new Param(), Q: new Param() }) }
  createDynamicsCompressor() { return node({ threshold: new Param(), knee: new Param(), ratio: new Param(), attack: new Param(), release: new Param() }) }
  createAnalyser() { return node() }
  createMediaStreamDestination() { return node({ stream: { getTracks: () => [] } }) }
  createDelay() { return node({ delayTime: new Param() }) }
  createConvolver() { return node() }
  createStereoPanner() { return node({ pan: new Param() }) }
  createBuffer(channels, length, rate) {
    const data = Array.from({ length: channels }, () => new Float32Array(length))
    return { length, duration: length / rate, getChannelData: (channel) => data[channel] }
  }
  createOscillator() {
    const osc = node({ frequency: new Param(), detune: new Param(), start(time) { this.startedAt = time }, stop(time) { this.stoppedAt = time }, addEventListener() {} })
    this.oscillators.push(osc)
    return osc
  }
  createBufferSource() {
    const source = node({ playbackRate: new Param(), start(time, offset) { this.startedAt = time; this.offset = offset }, stop(time) { this.stoppedAt = time } })
    this.sources.push(source)
    return source
  }
  async close() { this.state = 'closed' }
}

test('the sequence plays edited notes, skips rests, and accepts live changes', async () => {
  globalThis.window = { AudioContext: TestContext }
  const originalInterval = globalThis.setInterval
  let schedule
  globalThis.setInterval = (callback) => { schedule = callback; return {} }
  const engine = new StudioAudio()
  try {
    engine.setSequence(true, { notes: [64, null, 67, null], bpm: 120, swing: 0, gate: 0.6 })
    assert.equal(engine.context.oscillators.length, 2)
    assert.ok(Math.abs(engine.context.oscillators[0].frequency.value - 329.6276) < 0.01)
    engine.context.currentTime = 0.13
    schedule()
    assert.equal(engine.context.oscillators.length, 2, 'rest does not create a voice')
    engine.updateSequence({ notes: [64, null, 69, null] })
    engine.context.currentTime = 0.22
    schedule()
    assert.equal(engine.context.oscillators.length, 4)
    assert.equal(engine.context.oscillators[2].frequency.value, 440)
    engine.setSequence(false)
    assert.equal(engine.sequenceTimer, null)
    assert.equal(engine.sequenceVoices.size, 0)
  } finally {
    await engine.dispose()
    globalThis.setInterval = originalInterval
  }
})

test('whole-sequence octave changes transpose playback without rewriting notes or keyboard pitch', async () => {
  globalThis.window = { AudioContext: TestContext }
  const originalInterval = globalThis.setInterval
  let schedule
  globalThis.setInterval = (callback) => { schedule = callback; return {} }
  const engine = new StudioAudio()
  const notes = [69, null, 69, null]
  try {
    engine.setSequence(true, { notes, bpm: 120, swing: 0, gate: 0.6, octave: 1 })
    assert.equal(engine.context.oscillators[0].frequency.value, 880)
    engine.context.currentTime = 0.13
    schedule()
    assert.equal(engine.context.oscillators.length, 2, 'rests stay silent after transposing')
    engine.updateSequence({ octave: -1 })
    engine.context.currentTime = 0.22
    schedule()
    assert.equal(engine.context.oscillators[2].frequency.value, 220)
    assert.deepEqual(engine.sequenceControls.notes, [69, null, 69, null])
    engine.noteOn(69)
    assert.equal(engine.context.oscillators[4].frequency.value, 440, 'manual keyboard pitch is independent')
    engine.setSequence(false)
    engine.setSequence(true, { notes, octave: 0 })
    assert.equal(engine.context.oscillators[6].frequency.value, 440, 'Original restores the untransposed phrase')
  } finally {
    await engine.dispose()
    globalThis.setInterval = originalInterval
  }
})

test('texture sharpens the actual grain envelope while offsets stay in the sample', async () => {
  globalThis.window = { AudioContext: TestContext }
  const engine = new StudioAudio()
  try {
    engine.buffer = engine.context.createBuffer(1, 8000, 8000)
    engine.reverseBuffer = engine.buffer
    engine.update({ texture: 0, pitch: 24, position: 1, spray: 0.4 })
    engine.emitGrain(0.01)
    const soft = engine.context.gains.at(-1).gain.curve
    engine.update({ texture: 1 })
    engine.emitGrain(0.02)
    const sharp = engine.context.gains.at(-1).gain.curve
    assert.ok(sharp.reduce((sum, value) => sum + value, 0) < soft.reduce((sum, value) => sum + value, 0) * 0.7)
    engine.context.sources.forEach((source) => {
      const duration = source.stoppedAt - source.startedAt
      assert.ok(source.offset >= 0)
      assert.ok(source.offset + duration * source.playbackRate.value <= 1.00001)
    })
  } finally {
    await engine.dispose()
  }
})
