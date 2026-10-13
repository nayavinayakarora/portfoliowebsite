import { DEFAULT_SEQUENCE } from './studioSequences.js'

export const STUDIO_DEFAULTS = {
  waveform: 'sawtooth', cutoff: 2600, resonance: 1.2, detune: 7,
  attack: 0.04, release: 0.35, synthLevel: 0.65,
  position: 0.4, grainSize: 0.035, density: 22, spray: 0.24, texture: 0.75,
  pitch: 0, grainLevel: 0.6, reverse: false, delay: 0.16, reverb: 0.25,
}

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))
const grainWindow = Float32Array.from({ length: 64 }, (_, i) =>
  Math.max(0.0001, Math.sin(Math.PI * i / 63) ** 2),
)

export class StudioAudio {
  constructor() {
    const Context = window.AudioContext || window.webkitAudioContext
    if (!Context) throw new Error('This browser does not support the studio audio engine.')
    this.context = new Context()
    this.controls = { ...STUDIO_DEFAULTS }
    this.voices = new Map()
    this.grains = new Set()
    this.preview = null
    this.buffer = null
    this.reverseBuffer = null
    this.grainTimer = null
    this.sequenceTimer = null
    this.sequenceControls = { ...DEFAULT_SEQUENCE, notes: [...DEFAULT_SEQUENCE.notes] }
    this.sequenceVoices = new Set()
    this.sequenceVisualTimers = new Set()
    this.timers = new Set()
    this.disposed = false
    const ctx = this.context
    this.bus = ctx.createGain()
    this.synthFilter = ctx.createBiquadFilter()
    this.synthFilter.type = 'lowpass'
    this.synthGain = ctx.createGain()
    this.grainGain = ctx.createGain()
    this.master = ctx.createGain()
    this.master.gain.value = 0.65
    this.limiter = ctx.createDynamicsCompressor()
    this.limiter.threshold.value = -17
    this.limiter.knee.value = 6
    this.limiter.ratio.value = 16
    this.limiter.attack.value = 0.003
    this.limiter.release.value = 0.14
    this.analyser = ctx.createAnalyser()
    this.analyser.fftSize = 1024
    this.analyser.smoothingTimeConstant = 0.7
    this.capture = ctx.createMediaStreamDestination()
    this.delay = ctx.createDelay(1)
    this.delay.delayTime.value = 0.28
    this.feedback = ctx.createGain()
    this.feedback.gain.value = 0.3
    this.delayMix = ctx.createGain()
    this.reverb = ctx.createConvolver()
    this.reverbMix = ctx.createGain()
    const impulse = ctx.createBuffer(2, ctx.sampleRate * 1.8, ctx.sampleRate)
    for (let channel = 0; channel < 2; channel += 1) {
      const data = impulse.getChannelData(channel)
      for (let i = 0; i < data.length; i += 1) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 2.5
      }
    }
    this.reverb.buffer = impulse
    this.synthFilter.connect(this.synthGain)
    this.synthGain.connect(this.bus)
    this.grainGain.connect(this.bus)
    this.bus.connect(this.master)
    this.bus.connect(this.delay)
    this.delay.connect(this.feedback)
    this.feedback.connect(this.delay)
    this.delay.connect(this.delayMix)
    this.delayMix.connect(this.master)
    this.bus.connect(this.reverb)
    this.reverb.connect(this.reverbMix)
    this.reverbMix.connect(this.master)
    this.master.connect(this.limiter)
    this.limiter.connect(this.analyser)
    this.analyser.connect(ctx.destination)
    this.analyser.connect(this.capture)
    this.update(this.controls)
  }

  async resume() {
    if (this.context.state === 'suspended') await this.context.resume()
  }

  update(controls) {
    Object.assign(this.controls, controls)
    const now = this.context.currentTime
    this.synthFilter.frequency.setTargetAtTime(this.controls.cutoff, now, 0.025)
    this.synthFilter.Q.setTargetAtTime(this.controls.resonance, now, 0.025)
    this.synthGain.gain.setTargetAtTime(this.controls.synthLevel, now, 0.025)
    this.grainGain.gain.setTargetAtTime(this.controls.grainLevel, now, 0.025)
    this.delayMix.gain.setTargetAtTime(this.controls.delay * 0.5, now, 0.04)
    this.reverbMix.gain.setTargetAtTime(this.controls.reverb * 0.7, now, 0.04)
    this.voices.forEach(({ oscillators }) => oscillators.forEach((osc, index) => {
      osc.type = this.controls.waveform
      osc.detune.setTargetAtTime(index ? this.controls.detune : -this.controls.detune, now, 0.025)
    }))
  }

  noteOn(note, id = note) {
    if (this.voices.has(id) || this.disposed) return
    if (this.voices.size >= 12) this.noteOff(this.voices.keys().next().value)
    this.resume().catch(() => {})
    const ctx = this.context
    const now = ctx.currentTime
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.linearRampToValueAtTime(0.11, now + this.controls.attack)
    gain.gain.linearRampToValueAtTime(0.075, now + this.controls.attack + 0.14)
    gain.connect(this.synthFilter)
    const oscillators = [0, 1].map((index) => {
      const osc = ctx.createOscillator()
      osc.type = this.controls.waveform
      osc.frequency.value = 440 * 2 ** ((note - 69) / 12)
      osc.detune.value = index ? this.controls.detune : -this.controls.detune
      osc.connect(gain)
      osc.start(now)
      return osc
    })
    this.voices.set(id, { gain, oscillators })
  }

  noteOff(id) {
    const voice = this.voices.get(id)
    if (!voice) return
    const now = this.context.currentTime
    voice.gain.gain.cancelAndHoldAtTime(now)
    voice.gain.gain.exponentialRampToValueAtTime(0.0001, now + this.controls.release)
    voice.oscillators.forEach((osc) => {
      osc.onended = () => osc.disconnect()
      osc.stop(now + this.controls.release + 0.03)
    })
    voice.oscillators[0].addEventListener('ended', () => voice.gain.disconnect(), { once: true })
    this.voices.delete(id)
  }

  releaseAll() {
    [...this.voices.keys()].forEach((id) => this.noteOff(id))
  }

  playChord(notes) {
    const token = Date.now()
    notes.forEach((note, index) => this.noteOn(note, `chord-${token}-${index}`))
    const timer = setTimeout(() => {
      notes.forEach((_, index) => this.noteOff(`chord-${token}-${index}`))
      this.timers.delete(timer)
    }, 1100)
    this.timers.add(timer)
  }

  updateSequence(settings, onStep) {
    Object.assign(this.sequenceControls, settings)
    if (onStep) this.onSequenceStep = onStep
  }

  playSequenceNote(note, time, gate) {
    const ctx = this.context
    const gain = ctx.createGain()
    const attack = Math.min(this.controls.attack, gate * 0.45)
    const release = this.controls.release
    gain.gain.setValueAtTime(0.0001, time)
    gain.gain.linearRampToValueAtTime(0.1, time + attack)
    gain.gain.linearRampToValueAtTime(0.075, time + gate)
    gain.gain.exponentialRampToValueAtTime(0.0001, time + gate + release)
    gain.connect(this.synthFilter)
    const oscillators = [0, 1].map((index) => {
      const osc = ctx.createOscillator()
      osc.type = this.controls.waveform
      osc.frequency.value = 440 * 2 ** ((note - 69) / 12)
      osc.detune.value = index ? this.controls.detune : -this.controls.detune
      osc.connect(gain)
      osc.start(time)
      osc.stop(time + gate + release + 0.025)
      osc.onended = () => osc.disconnect()
      return osc
    })
    const voice = { gain, oscillators }
    this.sequenceVoices.add(voice)
    oscillators[0].addEventListener('ended', () => {
      gain.disconnect()
      this.sequenceVoices.delete(voice)
    }, { once: true })
  }

  setSequence(enabled, settings, onStep) {
    clearInterval(this.sequenceTimer)
    this.sequenceTimer = null
    this.sequenceVisualTimers.forEach(clearTimeout)
    this.sequenceVisualTimers.clear()
    const now = this.context.currentTime
    this.sequenceVoices.forEach(({ gain, oscillators }) => {
      gain.gain.cancelAndHoldAtTime(now)
      gain.gain.linearRampToValueAtTime(0, now + 0.025)
      oscillators.forEach((osc) => { try { osc.stop(now + 0.03) } catch {} })
    })
    this.sequenceVoices.clear()
    if (settings) this.updateSequence(settings, onStep)
    this.onSequenceStep?.(-1)
    if (!enabled || this.disposed) return
    this.resume().catch(() => {})
    this.sequenceStep = 0
    this.nextStepAt = now + 0.025
    const schedule = () => {
      const currentTime = this.context.currentTime
      if (this.nextStepAt < currentTime) this.nextStepAt = currentTime + 0.005
      while (this.nextStepAt < currentTime + 0.08) {
        const { notes, bpm, swing, gate, octave = 0 } = this.sequenceControls
        const step = this.sequenceStep % notes.length
        const duration = 60 / bpm / 4 * (step % 2 === 0 ? 1 + swing : 1 - swing)
        if (notes[step] !== null) this.playSequenceNote(notes[step] + octave * 12, this.nextStepAt, duration * gate)
        const timer = setTimeout(() => {
          this.onSequenceStep?.(step)
          this.sequenceVisualTimers.delete(timer)
        }, Math.max(0, (this.nextStepAt - currentTime) * 1000))
        this.sequenceVisualTimers.add(timer)
        this.nextStepAt += duration
        this.sequenceStep += 1
      }
    }
    schedule()
    this.sequenceTimer = setInterval(schedule, 25)
  }

  async loadSample(arrayBuffer) {
    const generation = (this.loadGeneration || 0) + 1
    this.loadGeneration = generation
    const buffer = await this.context.decodeAudioData(arrayBuffer)
    if (this.disposed || this.loadGeneration !== generation) return
    this.stopPreview()
    this.buffer = buffer
    this.reverseBuffer = this.context.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate)
    for (let c = 0; c < buffer.numberOfChannels; c += 1) {
      this.reverseBuffer.getChannelData(c).set(buffer.getChannelData(c).slice().reverse())
    }
    const data = buffer.getChannelData(0)
    const peaks = Array.from({ length: 160 }, (_, index) => {
      const start = Math.floor(index * data.length / 160)
      const end = Math.floor((index + 1) * data.length / 160)
      let peak = 0
      const stride = Math.max(1, Math.floor((end - start) / 48))
      for (let i = start; i < end; i += stride) peak = Math.max(peak, Math.abs(data[i]))
      return peak
    })
    return { peaks, duration: buffer.duration }
  }

  playPreview() {
    if (!this.buffer) return
    this.stopPreview()
    const source = this.context.createBufferSource()
    source.buffer = this.buffer
    const gain = this.context.createGain()
    gain.gain.value = 0.4
    source.connect(gain)
    gain.connect(this.grainGain)
    source.onended = () => {
      source.disconnect()
      gain.disconnect()
      if (this.preview === source) this.preview = null
    }
    source.start()
    this.preview = source
  }

  stopPreview() {
    if (this.preview) {
      this.preview.stop()
      this.preview = null
    }
  }

  startGrains() {
    if (!this.buffer || this.grainTimer) return
    this.resume().catch(() => {})
    this.nextGrainAt = this.context.currentTime
    const schedule = () => {
      const now = this.context.currentTime
      if (this.nextGrainAt < now) this.nextGrainAt = now
      // Schedule a short horizon so sliders change the next audible grains.
      while (this.nextGrainAt < now + 0.09) {
        const scatter = (Math.random() - 0.5) * this.controls.texture * 0.65 / this.controls.density
        this.emitGrain(Math.max(now + 0.002, this.nextGrainAt + scatter))
        this.nextGrainAt += 1 / this.controls.density
      }
    }
    schedule()
    this.grainTimer = setInterval(schedule, 25)
  }

  emitGrain(time) {
    const ctx = this.context
    const settings = this.controls
    const buffer = settings.reverse ? this.reverseBuffer : this.buffer
    const rate = 2 ** ((settings.pitch + (Math.random() - 0.5) * settings.texture * 1.4) / 12)
    const duration = Math.min(settings.grainSize, buffer.duration / rate)
    const position = settings.reverse ? 1 - settings.position : settings.position
    const offset = clamp(
      position * buffer.duration + (Math.random() - 0.5) * settings.spray * buffer.duration,
      0, Math.max(0, buffer.duration - duration * rate),
    )
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.playbackRate.value = rate
    const envelope = ctx.createGain()
    const peak = 0.3 / Math.sqrt(Math.max(1, settings.density * duration))
    envelope.gain.setValueCurveAtTime(grainWindow.map((value) => value ** (1 + settings.texture * 3) * peak), time, duration)
    const pan = ctx.createStereoPanner()
    pan.pan.value = (Math.random() * 2 - 1) * settings.spray * 2
    source.connect(envelope)
    envelope.connect(pan)
    pan.connect(this.grainGain)
    source.onended = () => {
      source.disconnect(); envelope.disconnect(); pan.disconnect()
      this.grains.delete(source)
    }
    this.grains.add(source)
    source.start(time, offset)
    source.stop(time + duration)
  }

  stopGrains() {
    clearInterval(this.grainTimer)
    this.grainTimer = null
  }

  stopAll() {
    this.setSequence(false)
    this.stopGrains()
    this.stopPreview()
    this.releaseAll()
    this.grains.forEach((source) => { try { source.stop() } catch {} })
    this.grains.clear()
  }

  async dispose() {
    this.disposed = true
    this.stopAll()
    this.timers.forEach(clearTimeout)
    this.timers.clear()
    this.capture.stream.getTracks().forEach((track) => track.stop())
    await this.context.close()
  }
}
