import test from 'node:test'
import assert from 'node:assert/strict'
import { createInstrumentAudio, getRecordPosition, holdRecord, setTransportMotion, startTransport } from '../src/components/hero/heroInstrumentAudio.js'

class Param {
  value = 0
  setValueAtTime(value) { this.value = value }
  linearRampToValueAtTime(value) { this.value = value }
  setTargetAtTime(value) { this.value = value }
  cancelAndHoldAtTime() {}
}

class TestContext {
  currentTime = 0
  sampleRate = 8000
  destination = {}
  createBuffer(channels, length, rate) {
    const data = Array.from({ length: channels }, () => new Float32Array(length))
    return { length, duration: length / rate, getChannelData: (channel) => data[channel] }
  }
  createGain() { return { gain: new Param(), connect() {}, disconnect() {} } }
  createBiquadFilter() { return { frequency: new Param(), Q: new Param(), connect() {} } }
  createDynamicsCompressor() {
    return { threshold: new Param(), knee: new Param(), ratio: new Param(), attack: new Param(), release: new Param(), connect() {} }
  }
  createBufferSource() {
    return { playbackRate: new Param(), connect() {}, disconnect() {}, start(time, offset) { this.startedAt = time; this.offset = offset }, stop() {} }
  }
}

const makeEngine = () => {
  globalThis.window = { AudioContext: TestContext }
  return createInstrumentAudio()
}

test('the rendered record is stereo, non-silent, and peak-bounded', () => {
  const engine = makeEngine()
  const left = engine.loopBuffer.getChannelData(0)
  const right = engine.loopBuffer.getChannelData(1)
  let energy = 0
  let stereoDifference = 0
  for (let i = 0; i < left.length; i += 1) {
    assert.ok(Number.isFinite(left[i]))
    assert.ok(Math.abs(left[i]) <= 0.821 && Math.abs(right[i]) <= 0.821)
    assert.equal(engine.reverseLoopBuffer.getChannelData(0)[left.length - i - 1], left[i])
    energy += left[i] ** 2
    stereoDifference += Math.abs(left[i] - right[i])
  }
  assert.ok(Math.sqrt(energy / left.length) > 0.03)
  assert.ok(stereoDifference > 1)
})

test('changing direction reverses at the current position instead of restarting', () => {
  const engine = makeEngine()
  startTransport(engine)
  engine.context.currentTime = 1
  setTransportMotion(engine, -4, 0.024)
  assert.equal(engine.transportDirection, -1)
  assert.equal(engine.transport.position, 1)
  assert.ok(Math.abs(engine.transport.source.offset - (engine.loopBuffer.duration - 1)) < 0.00001)
  engine.context.currentTime = 1.25
  assert.ok(Math.abs(getRecordPosition(engine) - 0.75) < 0.00001)
  setTransportMotion(engine, 4, 0.024)
  assert.ok(Math.abs(engine.transport.source.offset - 0.75) < 0.00001)
})

test('a held record stops at its current position and resumes there', () => {
  const engine = makeEngine()
  startTransport(engine)
  engine.context.currentTime = 2
  holdRecord(engine)
  engine.context.currentTime = 4
  assert.equal(getRecordPosition(engine), 2)
  assert.equal(engine.transport.source.playbackRate.value, 0)
  startTransport(engine)
  assert.equal(engine.transport.source.offset, 2)
})
