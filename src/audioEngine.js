const AUDIO_FILES = {
  ambientHome: '/audio/ambient-home.ogg',
  brand: '/audio/brand-sonic-logo.ogg',
  click: '/audio/ui-click.ogg',
  feedback: '/audio/ui-feedback.ogg',
  random: '/audio/ui-random.ogg',
  windScroll: '/audio/wind-scroll.ogg',
}

const SECTION_INTENSITY = {
  top: 1,
  featured: 0.92,
  'listening-room': 1,
  games: 0.86,
  services: 0.8,
  contact: 0.72,
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

export class SiteAudioEngine {
  constructor() {
    this.enabled = false
    this.experienceMode = false
    this.activeSection = 'top'
    this.sectionCooldown = 0
    this.audioReady = typeof window !== 'undefined' && typeof Audio !== 'undefined'
    this.assetTemplates = new Map()
    this.ambient = null
    this.ambientContext = null
    this.ambientSource = null
    this.ambientDryGain = null
    this.ambientWetGain = null
    this.ambientDelay = null
    this.ambientFeedback = null
    this.ambientLfo = null
    this.wind = null
    this.windContext = null
    this.windSource = null
    this.windGain = null
    this.windFilter = null
    this.scrollProgress = 0
    this.scrollActive = false
    this.scrollIdleTimeout = null
  }

  async init() {
    if (!this.audioReady) {
      return
    }
  }

  async setEnabled(value) {
    this.enabled = value
    if (!value) {
      this._stopAmbient()
      return
    }

    await this.init()
    this._primeAsset('brand')
    this._primeAsset('click')
    this.playIdentity()
    this._updateAmbient()
    this._updateWindScroll()
  }

  setExperienceMode(value) {
    this.experienceMode = value
    if (this.enabled && value) {
      this.playFeedback('experience')
    }
    this._updateAmbient()
    this._updateWindScroll()
  }

  setSection(section) {
    if (this.activeSection === section) {
      return
    }

    this.activeSection = section
    this._updateAmbient()
    this._updateWindScroll()
  }

  playIdentity() {
    if (!this.enabled) return
    this._play('brand', { volume: 0.24, playbackRate: 1 })
  }

  playNav() {
    if (!this.enabled) return
  }

  playHover(index = 0) {
    if (!this.enabled) return
  }

  playClick() {
    if (!this.enabled) return
    this._play('click', { volume: 0.14, playbackRate: 1 })
  }

  playDropdown() {
    if (!this.enabled) return
    this._play('random', { volume: 0.14, playbackRate: 1 })
  }

  playFeedback(type = 'success') {
    if (!this.enabled) return

    if (type === 'experience') {
      this._play('brand', { volume: 0.2, playbackRate: 1.04 })
      return
    }

    this._play('feedback', { volume: 0.18, playbackRate: 1 })
  }

  setScrollProgress(value) {
    this.scrollProgress = clamp(value, 0, 1)
    this.scrollActive = true
    if (this.scrollIdleTimeout) {
      clearTimeout(this.scrollIdleTimeout)
    }
    this.scrollIdleTimeout = setTimeout(() => {
      this.scrollActive = false
      this._updateWindScrollTone()
    }, 220)
    this._updateWindScrollTone()
  }

  _play(key, options = {}) {
    if (!this.audioReady) {
      return
    }

    const source = this._ensureTemplate(key)
    if (!source) {
      return
    }

    const instance = source.cloneNode()
    instance.volume = clamp(options.volume ?? 0.08, 0, 0.2)
    instance.playbackRate = options.playbackRate ?? 1
    instance.currentTime = 0
    instance.play().catch(() => {})
  }

  dispose() {
    this._stopAmbient()
    this._stopWindScroll()
    if (this.scrollIdleTimeout) {
      clearTimeout(this.scrollIdleTimeout)
    }
    this.assetTemplates.forEach((audio) => {
      audio.pause()
      audio.src = ''
    })
    this.assetTemplates.clear()
  }

  _updateAmbient() {
    if (!this.enabled || !this.experienceMode) {
      this._stopAmbient()
      return
    }

    const ambientSrc = AUDIO_FILES.ambientHome

    if (!this.ambient) {
      this.ambient = new Audio(ambientSrc)
      this.ambient.preload = 'metadata'
      this.ambient.loop = true
      this.ambient.volume = 0.11
      this._setupAmbientFx()
    }

    this.ambient.loop = true
    this.ambient.volume = 0.11
    if (this.ambient.paused) {
      this.ambient.currentTime = 0
      this.ambient.play().catch(() => {})
    }
  }

  _stopAmbient() {
    if (!this.ambient) return
    this.ambient.pause()
  }

  _updateWindScroll() {
    if (!this.enabled) {
      this._stopWindScroll()
      return
    }

    if (!this.wind) {
      this.wind = new Audio(AUDIO_FILES.windScroll)
      this.wind.preload = 'metadata'
      this.wind.loop = true
      this.wind.volume = 1
      this._setupWindFx()
    }

    if (this.windContext?.state === 'suspended') {
      this.windContext.resume().catch(() => {})
    }

    this._updateWindScrollTone()

    if (this.wind.paused) {
      this.wind.currentTime = 0
      this.wind.play().catch(() => {})
    }
  }

  _stopWindScroll() {
    if (!this.wind) return
    this.wind.pause()
  }

  _ensureTemplate(key) {
    if (key === 'ambientHome') {
      return null
    }

    const existing = this.assetTemplates.get(key)
    if (existing) {
      return existing
    }

    const src = AUDIO_FILES[key]
    if (!src) {
      return null
    }

    const audio = new Audio(src)
    audio.preload = 'metadata'
    this.assetTemplates.set(key, audio)
    return audio
  }

  _primeAsset(key) {
    const audio = this._ensureTemplate(key)
    if (!audio) {
      return
    }

    audio.preload = 'auto'
    audio.load()
  }

  _setupAmbientFx() {
    if (!this.ambient || this.ambientContext || typeof window === 'undefined') return

    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) return

    try {
      this.ambientContext = new AudioContextClass()
      this.ambientSource = this.ambientContext.createMediaElementSource(this.ambient)
      this.ambientDryGain = this.ambientContext.createGain()
      this.ambientWetGain = this.ambientContext.createGain()
      this.ambientDelay = this.ambientContext.createDelay(1)
      this.ambientFeedback = this.ambientContext.createGain()
      this.ambientLfo = this.ambientContext.createOscillator()
      const lfoDepth = this.ambientContext.createGain()

      this.ambientDryGain.gain.value = 0.82
      this.ambientWetGain.gain.value = 0.16
      this.ambientDelay.delayTime.value = 0.22
      this.ambientFeedback.gain.value = 0.28
      this.ambientLfo.type = 'sine'
      this.ambientLfo.frequency.value = 0.07
      lfoDepth.gain.value = 0.018

      this.ambientSource.connect(this.ambientDryGain)
      this.ambientDryGain.connect(this.ambientContext.destination)

      this.ambientSource.connect(this.ambientDelay)
      this.ambientDelay.connect(this.ambientFeedback)
      this.ambientFeedback.connect(this.ambientDelay)
      this.ambientDelay.connect(this.ambientWetGain)
      this.ambientWetGain.connect(this.ambientContext.destination)

      this.ambientLfo.connect(lfoDepth)
      lfoDepth.connect(this.ambientDelay.delayTime)
      this.ambientLfo.start()
    } catch (error) {
      console.error('Ambient FX init failed:', error)
    }
  }

  _setupWindFx() {
    if (!this.wind || this.windContext || typeof window === 'undefined') return

    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) return

    try {
      this.windContext = new AudioContextClass()
      this.windSource = this.windContext.createMediaElementSource(this.wind)
      this.windFilter = this.windContext.createBiquadFilter()
      this.windGain = this.windContext.createGain()

      this.windFilter.type = 'lowpass'
      this.windFilter.frequency.value = 700
      this.windGain.gain.value = 0.028

      this.windSource.connect(this.windFilter)
      this.windFilter.connect(this.windGain)
      this.windGain.connect(this.windContext.destination)
    } catch (error) {
      console.error('Wind FX init failed:', error)
    }
  }

  _updateWindScrollTone() {
    if (!this.windFilter || !this.windGain || !this.windContext) return

    const progress = this.scrollProgress
    const currentTime = this.windContext.currentTime
    const activityBoost = this.scrollActive ? 1 : 0
    const targetGain = 0.026 + progress * 0.052 + activityBoost * (0.12 + progress * 0.12)
    const idleFrequency = 900 + progress * 1300
    const activeFrequency = 1800 * ((16000 / 1800) ** progress)
    const targetFrequency = this.scrollActive ? activeFrequency : idleFrequency

    this.windGain.gain.cancelScheduledValues(currentTime)
    this.windGain.gain.setTargetAtTime(targetGain, currentTime, this.scrollActive ? 0.08 : 0.32)

    this.windFilter.frequency.cancelScheduledValues(currentTime)
    this.windFilter.frequency.setTargetAtTime(targetFrequency, currentTime, this.scrollActive ? 0.08 : 0.32)
  }
}
