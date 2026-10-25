const TAU = Math.PI * 2
export const GAME_AUDIO_LEVEL = 0.78

export function midiNoteName(midi) {
  const names = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']
  return `${names[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`
}

// Render on demand, not at page load; both reference and guess use the same timbre.
export function renderGameTone(frequencies, { sampleRate = 44100, duration = 1.6, timbre = 'piano' } = {}) {
  if (!frequencies.length || frequencies.some((frequency) => !Number.isFinite(frequency) || frequency <= 0)) {
    throw new Error('A playable frequency is required.')
  }
  const samples = new Float32Array(Math.ceil(sampleRate * duration))
  const partials = timbre === 'memory' ? [1, 0.16, 0.045] : [1, 0.43, 0.19, 0.085, 0.035, 0.016]
  // A sustained single tone needs less peak gain than a quickly decaying chord.
  const outputPeak = timbre === 'memory' ? 0.26 : 0.62
  let peak = 0
  for (const frequency of frequencies) {
    for (let i = 0; i < samples.length; i += 1) {
      const time = i / sampleRate
      const attack = 1 - Math.exp(-time / (timbre === 'memory' ? 0.008 : 0.003))
      const release = Math.min(1, (samples.length - 1 - i) / (sampleRate * 0.07))
      let value = 0
      for (let p = 0; p < partials.length; p += 1) {
        const harmonic = p + 1
        if (frequency * harmonic >= sampleRate * 0.46) continue
        const decay = timbre === 'memory' ? 0.75 + p * 0.7 : 1.8 + p * 1.6
        value += Math.sin(TAU * frequency * harmonic * time) * partials[p] * Math.exp(-time * decay)
      }
      samples[i] += value * attack * release
    }
  }
  for (const value of samples) peak = Math.max(peak, Math.abs(value))
  for (let i = 0; i < samples.length; i += 1) samples[i] *= outputPeak / Math.max(peak, 0.001)
  return samples
}

export function createMiniGameAudio() {
  let context
  let output
  let level = GAME_AUDIO_LEVEL
  let revision = 0
  let closed = false
  const voices = new Set()

  function stop() {
    revision += 1
    for (const voice of voices) {
      voice.finish(false)
      voice.gain.gain.cancelScheduledValues(context.currentTime)
      voice.gain.gain.setTargetAtTime(0, context.currentTime, 0.006)
      try { voice.source.stop(context.currentTime + 0.03) } catch {}
    }
  }

  return {
    setLevel(value) {
      level = Math.min(1, Math.max(0, Number(value) || 0))
      if (output) output.gain.setTargetAtTime(level, context.currentTime, 0.02)
    },
    stop,
    close() {
      closed = true
      stop()
      context?.close().catch(() => {})
    },
    async play(frequencies, options) {
      if (closed) return false
      stop()
      const token = revision
      if (!context) {
        const Context = window.AudioContext || window.webkitAudioContext
        if (!Context) throw new Error('Web Audio is unavailable in this browser.')
        context = new Context()
        output = context.createGain()
        const limiter = context.createDynamicsCompressor()
        limiter.threshold.value = -5
        limiter.knee.value = 3
        limiter.ratio.value = 12
        limiter.attack.value = 0.003
        limiter.release.value = 0.12
        output.gain.value = level
        output.connect(limiter)
        limiter.connect(context.destination)
      }
      if (context.state === 'suspended') await context.resume()
      if (closed || revision !== token) return false
      const samples = renderGameTone(frequencies, { ...options, sampleRate: context.sampleRate })
      const buffer = context.createBuffer(1, samples.length, context.sampleRate)
      buffer.getChannelData(0).set(samples)
      const source = context.createBufferSource()
      const gain = context.createGain()
      source.buffer = buffer
      source.connect(gain)
      gain.connect(output)
      return new Promise((resolve) => {
        let settled = false
        const voice = { source, gain, finish(value) {
          if (!settled) { settled = true; resolve(value) }
        } }
        voices.add(voice)
        source.onended = () => {
          voices.delete(voice)
          source.disconnect()
          gain.disconnect()
          voice.finish(true)
        }
        source.start()
      })
    },
  }
}
