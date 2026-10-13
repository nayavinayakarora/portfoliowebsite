const NOTES = [48, 50, 53, 55, 57, 60, 62, 65, 67, 69]

export class PixelHeroAudio {
  constructor() { this.context = null; this.voices = new Set(); this.enabled = true; this.lastNoteAt = -Infinity }

  async unlock() {
    if (!this.enabled) return false
    if (!this.context) {
      const AudioContext = window.AudioContext || window.webkitAudioContext
      if (!AudioContext) return false
      this.context = new AudioContext()
      this.master = this.context.createGain()
      this.master.gain.value = 0.16
      const limiter = this.context.createDynamicsCompressor()
      limiter.threshold.value = -20
      limiter.knee.value = 8
      limiter.ratio.value = 12
      limiter.attack.value = 0.003
      limiter.release.value = 0.15
      this.master.connect(limiter).connect(this.context.destination)
    }
    if (this.context.state === 'suspended') await this.context.resume()
    return this.context.state === 'running'
  }

  setEnabled(enabled) {
    this.enabled = enabled
    if (this.context) this.master.gain.setTargetAtTime(enabled ? 0.16 : 0, this.context.currentTime, 0.025)
  }

  play(x, y, part) {
    const ctx = this.context
    if (!this.enabled || !ctx || ctx.state !== 'running' || ctx.currentTime - this.lastNoteAt < 0.085 || this.voices.size >= 6) return
    this.lastNoteAt = ctx.currentTime
    const now = ctx.currentTime
    const note = NOTES[Math.max(0, Math.min(NOTES.length - 1, Math.floor(x * NOTES.length)))]
    const pluck = part === 'guitar' || y > 0.65 || (!part && x < 0.23)
    const duration = pluck ? 0.48 : 0.27
    const gain = ctx.createGain()
    const oscillator = ctx.createOscillator()
    oscillator.type = pluck ? 'triangle' : 'sine'
    oscillator.frequency.value = 440 * 2 ** ((note + (pluck ? 0 : 12) - 69) / 12)
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.2, now + 0.008)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)
    oscillator.connect(gain).connect(this.master)
    this.voices.add(oscillator)
    oscillator.onended = () => { this.voices.delete(oscillator); oscillator.disconnect(); gain.disconnect() }
    oscillator.start(now)
    oscillator.stop(now + duration + 0.02)
  }

  dispose() {
    this.voices.forEach((voice) => { try { voice.stop() } catch {} })
    this.voices.clear()
    if (this.context && this.context.state !== 'closed') this.context.close().catch(() => {})
  }
}
