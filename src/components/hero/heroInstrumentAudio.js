export const HERO_BPM = 112
const BEAT = 60 / HERO_BPM
const LOOP_SECONDS = BEAT * 16
const wrap = (value, length) => ((value % length) + length) % length

function drumBuffer(context, kind) {
  const duration = kind === 'kick' ? 0.48 : kind === 'snare' ? 0.24 : 0.085
  const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate)
  const data = buffer.getChannelData(0)
  let previousNoise = 0
  for (let i = 0; i < data.length; i += 1) {
    const t = i / context.sampleRate
    const noise = Math.random() * 2 - 1
    const highNoise = (noise - previousNoise) * 0.5
    previousNoise = noise
    if (kind === 'kick') {
      const phase = 2 * Math.PI * (49 * t + 95 * 0.022 * (1 - Math.exp(-t / 0.022)))
      data[i] = Math.sin(phase) * Math.exp(-t * 9) * Math.min(1, t / 0.0015)
        + highNoise * Math.exp(-t * 240) * 0.055
    } else if (kind === 'snare') {
      data[i] = (noise * 0.42 + highNoise * 0.3) * Math.exp(-t * 21)
        + Math.sin(2 * Math.PI * 182 * t) * Math.exp(-t * 35) * 0.2
    } else {
      data[i] = highNoise * Math.exp(-t * 66) * 0.58
    }
    data[i] *= Math.min(1, (duration - t) / 0.006)
  }
  return buffer
}

function renderRecord(context, drums) {
  const buffer = context.createBuffer(2, Math.round(context.sampleRate * LOOP_SECONDS), context.sampleRate)
  const left = buffer.getChannelData(0)
  const right = buffer.getChannelData(1)
  const add = (time, duration, voice, level, pan = 0) => {
    const start = Math.round(time * context.sampleRate)
    const count = Math.ceil(duration * context.sampleRate)
    const leftLevel = level * Math.sqrt((1 - pan) / 2)
    const rightLevel = level * Math.sqrt((1 + pan) / 2)
    for (let i = 0; i < count; i += 1) {
      const t = i / context.sampleRate
      const index = (start + i) % left.length
      const sample = voice(t, i) * Math.min(1, (duration - t) / 0.012)
      left[index] += sample * leftLevel
      right[index] += sample * rightLevel
    }
  }
  const addDrum = (kind, time, level, pan = 0) => {
    const clip = drums[kind].getChannelData(0)
    add(time, clip.length / context.sampleRate, (_, i) => clip[i], level, pan)
  }
  const chords = [[57, 60, 64, 67, 71], [53, 57, 60, 64], [48, 52, 55, 59], [55, 59, 62, 64]]
  const bass = [45, 41, 36, 43]
  for (let bar = 0; bar < 4; bar += 1) {
    const start = bar * BEAT * 4
    for (let beat = 0; beat < 4; beat += 1) {
      addDrum('kick', start + beat * BEAT, 0.68)
      addDrum('hat', start + (beat + 0.52) * BEAT, beat % 2 ? 0.13 : 0.1, beat % 2 ? 0.35 : -0.3)
      if (beat % 2) addDrum('snare', start + beat * BEAT, 0.33)
    }
    addDrum('hat', start + 3.77 * BEAT, 0.065, 0.5)
    for (const offset of [0, 1.75, 2.5]) {
      chords[bar].forEach((note, index) => {
        const frequency = 440 * 2 ** ((note - 69) / 12)
        const duration = 1.35
        add(start + offset * BEAT, duration, (t) => {
          const envelope = Math.min(1, t / 0.008) * Math.exp(-t * 3.8)
          const tone = Math.sin(2 * Math.PI * frequency * t + Math.sin(2 * Math.PI * frequency * 2 * t) * Math.exp(-t * 7) * 0.65)
          return (tone + Math.sin(2 * Math.PI * frequency * 2.003 * t) * 0.12) * envelope
        }, offset === 0 ? 0.09 : 0.065, (index / (chords[bar].length - 1) - 0.5) * 0.8)
      })
    }
    for (const offset of [0, 0.75, 1.5, 2.75]) {
      const frequency = 440 * 2 ** ((bass[bar] - 69) / 12)
      add(start + offset * BEAT, 0.42, (t) => (
        Math.sin(2 * Math.PI * frequency * t) + Math.sin(2 * Math.PI * frequency * 2 * t) * 0.18
      ) * Math.min(1, t / 0.005) * Math.exp(-t * 7), 0.27)
    }
  }
  let peak = 0
  for (let i = 0; i < left.length; i += 1) peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]))
  const scale = 0.82 / Math.max(0.82, peak)
  for (let i = 0; i < left.length; i += 1) { left[i] *= scale; right[i] *= scale }
  return buffer
}

export function createInstrumentAudio() {
  const Context = window.AudioContext || window.webkitAudioContext
  if (!Context) return null
  const context = new Context()
  const filter = context.createBiquadFilter()
  const compressor = context.createDynamicsCompressor()
  const master = context.createGain()
  const drums = { kick: drumBuffer(context, 'kick'), snare: drumBuffer(context, 'snare'), hat: drumBuffer(context, 'hat') }
  const loopBuffer = renderRecord(context, drums)
  const reverseLoopBuffer = context.createBuffer(2, loopBuffer.length, context.sampleRate)
  for (let channel = 0; channel < 2; channel += 1) {
    reverseLoopBuffer.getChannelData(channel).set(loopBuffer.getChannelData(channel).slice().reverse())
  }
  filter.type = 'lowpass'
  filter.frequency.value = 9000
  filter.Q.value = 0.6
  compressor.threshold.value = -16
  compressor.knee.value = 10
  compressor.ratio.value = 10
  compressor.attack.value = 0.004
  compressor.release.value = 0.15
  master.gain.value = 0.28
  filter.connect(compressor)
  compressor.connect(master)
  master.connect(context.destination)
  return { context, filter, master, drums, loopBuffer, reverseLoopBuffer, transport: null, transportDirection: 1, scratching: false }
}

export function getRecordPosition(engine) {
  const transport = engine?.transport
  if (!transport) return 0
  return wrap(transport.position + (engine.context.currentTime - transport.updatedAt) * transport.rate * engine.transportDirection, engine.loopBuffer.duration)
}

export function startTransport(engine, direction = 1, rate = 1, audible = true) {
  const now = engine.context.currentTime
  const previous = engine.transport
  const position = getRecordPosition(engine)
  const source = engine.context.createBufferSource()
  const gain = engine.context.createGain()
  source.buffer = direction < 0 ? engine.reverseLoopBuffer : engine.loopBuffer
  source.loop = true
  source.playbackRate.value = rate
  gain.gain.setValueAtTime(0, now)
  gain.gain.linearRampToValueAtTime(audible ? 0.56 : 0, now + 0.012)
  source.connect(gain)
  gain.connect(engine.filter)
  source.onended = () => { source.disconnect(); gain.disconnect() }
  const offset = direction < 0 ? wrap(engine.loopBuffer.duration - position, engine.loopBuffer.duration) : position
  source.start(now, offset)
  if (previous) {
    previous.gain.gain.cancelAndHoldAtTime(now)
    previous.gain.gain.linearRampToValueAtTime(0, now + 0.01)
    previous.source.stop(now + 0.015)
  }
  engine.transport = { source, gain, position, updatedAt: now, rate }
  engine.transportDirection = direction
}

export function holdRecord(engine) {
  if (!engine?.transport) return
  engine.transport.position = getRecordPosition(engine)
  engine.transport.updatedAt = engine.context.currentTime
  engine.transport.rate = 0
  engine.transport.source.playbackRate.setValueAtTime(0, engine.context.currentTime)
  engine.transport.gain.gain.setTargetAtTime(0, engine.context.currentTime, 0.008)
}

export function setTransportMotion(engine, amount, elapsed = 0.016) {
  const direction = amount < 0 ? -1 : 1
  const rate = Math.max(0.05, Math.min(5, Math.abs(amount) / Math.max(0.004, elapsed) * 0.006))
  if (!engine.transport || engine.transportDirection !== direction) {
    startTransport(engine, direction, rate)
    return
  }
  engine.transport.position = getRecordPosition(engine)
  engine.transport.updatedAt = engine.context.currentTime
  engine.transport.rate = rate
  engine.transport.source.playbackRate.setValueAtTime(rate, engine.context.currentTime)
  engine.transport.gain.gain.setTargetAtTime(0.56, engine.context.currentTime, 0.008)
}
