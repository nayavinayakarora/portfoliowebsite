import { useEffect, useMemo, useRef, useState } from 'react'

const ROOTS = [
  { name: 'C', midi: 48 },
  { name: 'D', midi: 50 },
  { name: 'E', midi: 52 },
  { name: 'F', midi: 53 },
  { name: 'G', midi: 55 },
  { name: 'A', midi: 57 },
  { name: 'Bb', midi: 58 },
]

const MODES = {
  easy: {
    label: 'Easy',
    subtitle: 'Guess broad chord families like major or minor.',
    options: [
      { id: 'major', label: 'Major', intervals: [0, 4, 7] },
      { id: 'minor', label: 'Minor', intervals: [0, 3, 7] },
      { id: 'diminished', label: 'Diminished', intervals: [0, 3, 6] },
      { id: 'suspended', label: 'Suspended', intervals: [0, 5, 7] },
    ],
  },
  hard: {
    label: 'Hard',
    subtitle: 'Name the exact color: maj7, m7, add9, sus2, and more.',
    options: [
      { id: 'maj7', label: 'Major 7', intervals: [0, 4, 7, 11] },
      { id: 'm7', label: 'Minor 7', intervals: [0, 3, 7, 10] },
      { id: '7', label: 'Dominant 7', intervals: [0, 4, 7, 10] },
      { id: 'add9', label: 'Add 9', intervals: [0, 4, 7, 14] },
      { id: 'sus2', label: 'Sus 2', intervals: [0, 2, 7] },
      { id: 'sus4', label: 'Sus 4', intervals: [0, 5, 7] },
    ],
  },
}

function midiToFrequency(midi) {
  return 440 * (2 ** ((midi - 69) / 12))
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function randomFrom(list) {
  return list[Math.floor(Math.random() * list.length)]
}

function createImpulseResponse(context, duration = 1.4, decay = 2.4) {
  const sampleRate = context.sampleRate
  const length = Math.max(1, Math.floor(sampleRate * duration))
  const impulse = context.createBuffer(2, length, sampleRate)

  for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
    const data = impulse.getChannelData(channel)
    for (let index = 0; index < length; index += 1) {
      const envelope = Math.pow(1 - (index / length), decay)
      data[index] = ((Math.random() * 2) - 1) * envelope
    }
  }

  return impulse
}

function createNoiseBuffer(context, seconds = 0.18) {
  const length = Math.max(1, Math.floor(context.sampleRate * seconds))
  const buffer = context.createBuffer(1, length, context.sampleRate)
  const data = buffer.getChannelData(0)

  for (let index = 0; index < length; index += 1) {
    data[index] = ((Math.random() * 2) - 1) * 0.55
  }

  return buffer
}

export function ChordMoodDecoder() {
  const audioContextRef = useRef(null)
  const audioFxRef = useRef(null)
  const noiseBufferRef = useRef(null)
  const activeNodesRef = useRef([])
  const recentPromptIdsRef = useRef([])
  const [mode, setMode] = useState('easy')
  const [phase, setPhase] = useState('idle')
  const [selectedOption, setSelectedOption] = useState('')
  const [reveal, setReveal] = useState(null)
  const [status, setStatus] = useState('Play a chord, then identify what kind of harmony it is.')
  const [score, setScore] = useState({ correct: 0, total: 0 })
  const [prompt, setPrompt] = useState(() => {
    const firstOption = MODES.easy.options[0]
    return {
      root: ROOTS[0],
      answer: firstOption,
      notes: firstOption.intervals.map((interval) => ROOTS[0].midi + interval),
    }
  })

  const modeConfig = MODES[mode]
  const options = useMemo(() => modeConfig.options, [modeConfig])

  useEffect(
    () => () => {
      activeNodesRef.current.forEach((node) => {
        try {
          if (typeof node.stop === 'function') {
            node.stop()
          }
        } catch {}
        try {
          node.disconnect()
        } catch {}
      })
      activeNodesRef.current = []
      audioFxRef.current = null
      audioContextRef.current?.close().catch(() => {})
      audioContextRef.current = null
      noiseBufferRef.current = null
    },
    [],
  )

  useEffect(() => {
    setSelectedOption('')
    setReveal(null)
    setPhase('idle')
    setStatus(`Play a chord, then identify the ${mode === 'easy' ? 'family' : 'exact chord color'}.`)
  }, [mode])

  function registerNode(node) {
    activeNodesRef.current.push(node)
    return node
  }

  async function ensureAudioContext() {
    if (typeof window === 'undefined') {
      return null
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) {
      return null
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextClass()
    }

    const context = audioContextRef.current
    if (context.state === 'suspended') {
      await context.resume()
    }

    if (!noiseBufferRef.current) {
      noiseBufferRef.current = createNoiseBuffer(context)
    }

    if (!audioFxRef.current) {
      const master = context.createGain()
      const pianoBus = context.createGain()
      const lowpass = context.createBiquadFilter()
      const convolver = context.createConvolver()
      const reverbGain = context.createGain()
      const delay = context.createDelay(0.5)
      const delayFeedback = context.createGain()
      const delayGain = context.createGain()

      master.gain.value = 0.22
      pianoBus.gain.value = 1
      lowpass.type = 'lowpass'
      lowpass.frequency.value = 2900
      lowpass.Q.value = 0.22
      convolver.buffer = createImpulseResponse(context)
      reverbGain.gain.value = 0.12
      delay.delayTime.value = 0.16
      delayFeedback.gain.value = 0.12
      delayGain.gain.value = 0.07

      pianoBus.connect(lowpass)
      lowpass.connect(master)
      lowpass.connect(convolver)
      convolver.connect(reverbGain)
      reverbGain.connect(master)
      lowpass.connect(delay)
      delay.connect(delayFeedback)
      delayFeedback.connect(delay)
      delay.connect(delayGain)
      delayGain.connect(master)
      master.connect(context.destination)

      audioFxRef.current = { pianoBus }
    }

    return context
  }

  async function playChord(notes, durationMs = 1350) {
    const context = await ensureAudioContext()
    if (!context || !audioFxRef.current || !noiseBufferRef.current) {
      setStatus('This browser blocked the chord player.')
      return
    }

    const now = context.currentTime + 0.015
    const stopAt = now + (durationMs / 1000)

    notes.forEach((midi, index) => {
      const frequency = midiToFrequency(midi)
      const bodyOscillator = registerNode(context.createOscillator())
      const shimmerOscillator = registerNode(context.createOscillator())
      const gain = context.createGain()
      const lowpass = context.createBiquadFilter()

      bodyOscillator.type = 'triangle'
      shimmerOscillator.type = 'sine'
      bodyOscillator.frequency.setValueAtTime(frequency, now)
      shimmerOscillator.frequency.setValueAtTime(frequency * 2, now)
      shimmerOscillator.detune.setValueAtTime(index % 2 === 0 ? -4 : 4, now)

      lowpass.type = 'lowpass'
      lowpass.frequency.setValueAtTime(3400, now)
      lowpass.frequency.exponentialRampToValueAtTime(1800, stopAt)
      lowpass.Q.value = 0.28

      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.exponentialRampToValueAtTime(index === 0 ? 0.05 : 0.034, now + 0.016)
      gain.gain.exponentialRampToValueAtTime(0.009, now + 0.18)
      gain.gain.exponentialRampToValueAtTime(0.0001, stopAt)

      bodyOscillator.connect(lowpass)
      shimmerOscillator.connect(lowpass)
      lowpass.connect(gain)
      gain.connect(audioFxRef.current.pianoBus)
      bodyOscillator.start(now)
      shimmerOscillator.start(now)
      bodyOscillator.stop(stopAt + 0.025)
      shimmerOscillator.stop(stopAt + 0.025)
    })

    const attackNoise = registerNode(context.createBufferSource())
    const attackFilter = context.createBiquadFilter()
    const attackGain = context.createGain()
    attackNoise.buffer = noiseBufferRef.current
    attackFilter.type = 'bandpass'
    attackFilter.frequency.value = 1800
    attackFilter.Q.value = 0.7
    attackGain.gain.setValueAtTime(0.0001, now)
    attackGain.gain.exponentialRampToValueAtTime(0.012, now + 0.01)
    attackGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08)
    attackNoise.connect(attackFilter)
    attackFilter.connect(attackGain)
    attackGain.connect(audioFxRef.current.pianoBus)
    attackNoise.start(now)
    attackNoise.stop(now + 0.09)

    await wait(durationMs + 120)
  }

  function pickNextPrompt(nextMode) {
    const config = MODES[nextMode]
    const eligibleAnswers = config.options.filter((option) => !recentPromptIdsRef.current.includes(`${nextMode}:${option.id}`))
    const answer = randomFrom(eligibleAnswers.length ? eligibleAnswers : config.options)
    const root = randomFrom(ROOTS)
    recentPromptIdsRef.current = [
      ...recentPromptIdsRef.current.filter((entry) => entry !== `${nextMode}:${answer.id}`),
      `${nextMode}:${answer.id}`,
    ].slice(-4)

    return {
      root,
      answer,
      notes: answer.intervals.map((interval) => root.midi + interval),
    }
  }

  async function handlePlayNewChord(nextMode = mode) {
    const nextPrompt = pickNextPrompt(nextMode)
    setPrompt(nextPrompt)
    setSelectedOption('')
    setReveal(null)
    setPhase('playing')
    setStatus('Listen closely to the chord color.')
    await playChord(nextPrompt.notes)
    setPhase('guessing')
    setStatus(nextMode === 'easy' ? 'Is it major, minor, diminished, or suspended?' : 'Name the exact chord color.')
  }

  async function handleReplay() {
    if (phase === 'playing') {
      return
    }

    setPhase('playing')
    setStatus('One more listen...')
    await playChord(prompt.notes)
    setPhase('guessing')
    setStatus(mode === 'easy' ? 'Is it major, minor, diminished, or suspended?' : 'Name the exact chord color.')
  }

  async function handleModeSwitch(nextMode) {
    if (mode === nextMode) {
      return
    }

    setMode(nextMode)
    await handlePlayNewChord(nextMode)
  }

  function handleGuess(option) {
    if (phase !== 'guessing') {
      return
    }

    const isCorrect = option.id === prompt.answer.id
    setSelectedOption(option.id)
    setReveal(isCorrect)
    setPhase('revealed')
    setScore((current) => ({
      correct: current.correct + (isCorrect ? 1 : 0),
      total: current.total + 1,
    }))
    setStatus(
      isCorrect
        ? `Correct. That was a ${prompt.root.name} ${prompt.answer.label}.`
        : `Close, but it was a ${prompt.root.name} ${prompt.answer.label}.`,
    )
  }

  return (
    <article className="chord-game-shell">
      <div className="chord-game-panel">
        <div className="chord-game-head">
          <div className="chord-game-head-copy">
            <p className="panel-label">Mini game</p>
            <h3>Chord Decoder</h3>
            <span>{modeConfig.subtitle}</span>
          </div>

          <div className="pitch-game-score-pill chord-score-pill">
            <strong>{score.correct}</strong>
            <span>/ {score.total || 0}</span>
          </div>
        </div>

        <div className="chord-game-stage">
          <div className="chord-game-mode-switch" role="tablist" aria-label="Chord decoder mode">
            {Object.entries(MODES).map(([modeKey, config]) => (
              <button
                key={modeKey}
                type="button"
                className={`filter-chip${mode === modeKey ? ' active' : ''}`}
                onClick={() => handleModeSwitch(modeKey)}
              >
                {config.label}
              </button>
            ))}
          </div>

          <p className="chord-game-status">{status}</p>

          <div className="chord-game-actions">
            <button type="button" className="primary-button" onClick={() => handlePlayNewChord()}>
              {phase === 'idle' ? 'Play chord' : 'New chord'}
            </button>
            <button type="button" className="secondary-button" onClick={handleReplay} disabled={phase === 'idle' || phase === 'playing'}>
              Replay chord
            </button>
          </div>

          <div className="chord-game-options">
            {options.map((option) => {
              const isSelected = option.id === selectedOption
              const isCorrectOption = reveal !== null && option.id === prompt.answer.id

              return (
                <button
                  key={option.id}
                  type="button"
                  className={`chord-option${isSelected ? ' selected' : ''}${isCorrectOption ? ' correct' : ''}${reveal === false && isSelected ? ' wrong' : ''}`}
                  onClick={() => handleGuess(option)}
                  disabled={phase !== 'guessing'}
                >
                  {option.label}
                </button>
              )
            })}
          </div>

          {reveal !== null ? (
            <div className="chord-game-reveal">
              <strong>
                {prompt.root.name}
                {' '}
                {prompt.answer.label}
              </strong>
              <span>
                {mode === 'easy' ? 'You were listening for the chord family.' : 'You were identifying the exact chord quality.'}
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  )
}

export default ChordMoodDecoder
