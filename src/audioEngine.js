const AUDIO_FILES = {
  ambientHome: '/audio/ambient-home.ogg',
  brand: '/audio/brand-sonic-logo.ogg',
  click: '/audio/ui-click.ogg',
  feedback: '/audio/ui-feedback.ogg',
  whoosh: '/audio/ui-open-whoosh.ogg',
  random: '/audio/ui-random.ogg',
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
    this.hoverCooldown = 0
    this.whooshIndex = 0
    this.audioReady = typeof window !== 'undefined' && typeof Audio !== 'undefined'
    this.assets = new Map()
    this.ambient = null
    this.ambientContext = null
    this.ambientSource = null
    this.ambientDryGain = null
    this.ambientWetGain = null
    this.ambientDelay = null
    this.ambientFeedback = null
    this.ambientLfo = null
  }

  async init() {
    if (!this.audioReady || this.assets.size > 0) {
      return
    }

    Object.entries(AUDIO_FILES).forEach(([key, src]) => {
      if (key === 'ambientHome') {
        this.assets.set(key, src)
        return
      }

      const audio = new Audio(src)
      audio.preload = 'auto'
      this.assets.set(key, audio)
    })
  }

  async setEnabled(value) {
    this.enabled = value
    if (!value) {
      this._stopAmbient()
      return
    }

    await this.init()
    this.playIdentity()
    this._updateAmbient()
  }

  setExperienceMode(value) {
    this.experienceMode = value
    if (this.enabled && value) {
      this.playFeedback('experience')
    }
    this._updateAmbient()
  }

  setSection(section) {
    if (this.activeSection === section) {
      return
    }

    this.activeSection = section
    this._updateAmbient()

    if (!this.enabled || !this.experienceMode) {
      return
    }

    const now = Date.now()
    if (now - this.sectionCooldown < 900) {
      return
    }

    this.sectionCooldown = now
    this._play('whoosh', {
      volume: 0.05 * (SECTION_INTENSITY[section] ?? 0.84),
      playbackRate: clamp(0.92 + (SECTION_INTENSITY[section] ?? 0.84) * 0.18, 0.9, 1.06),
    })
  }

  playIdentity() {
    if (!this.enabled) return
    this._play('brand', { volume: 0.24, playbackRate: 1 })
  }

  playNav() {
    if (!this.enabled) return
    this._play('whoosh', { volume: 0.08, playbackRate: 1.03 })
  }

  playHover(index = 0) {
    if (!this.enabled) return

    const now = Date.now()
    if (now - this.hoverCooldown < 120) {
      return
    }

    this.hoverCooldown = now
    const semitoneOffsets = [-5, -3, 0, 3, 5, -4, 2, 4]
    const semitone = semitoneOffsets[(this.whooshIndex + index) % semitoneOffsets.length]
    this.whooshIndex += 1
    const playbackRate = 2 ** (semitone / 12)
    this._play('whoosh', {
      volume: this.experienceMode ? 0.14 : 0.1,
      playbackRate: clamp(playbackRate, 0.74, 1.34),
    })
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

  _play(key, options = {}) {
    if (!this.audioReady) {
      return
    }

    const source = this.assets.get(key)
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
    this.assets.clear()
  }

  _updateAmbient() {
    if (!this.enabled || !this.experienceMode) {
      this._stopAmbient()
      return
    }

    const ambientSrc = this.assets.get('ambientHome')
    if (!ambientSrc) return

    if (!this.ambient) {
      this.ambient = new Audio(ambientSrc)
      this.ambient.preload = 'auto'
      this.ambient.loop = true
      this.ambient.volume = 0.18
      this._setupAmbientFx()
    }

    this.ambient.loop = true
    this.ambient.volume = 0.18
    if (this.ambient.paused) {
      this.ambient.currentTime = 0
      this.ambient.play().catch(() => {})
    }
  }

  _stopAmbient() {
    if (!this.ambient) return
    this.ambient.pause()
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
      this.ambientWetGain.gain.value = 0.22
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
}
