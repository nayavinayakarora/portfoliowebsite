import { useEffect, useMemo, useRef, useState } from 'react'
import { createMiniGameAudio, GAME_AUDIO_LEVEL, midiNoteName } from '../miniGameAudio'

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

function randomFrom(list) {
  return list[Math.floor(Math.random() * list.length)]
}

export function ChordMoodDecoder() {
  const audioRef = useRef(null)
  const runTokenRef = useRef(0)
  const busyRef = useRef(false)
  const recentPromptIdsRef = useRef([])
  const [mode, setMode] = useState('easy')
  const [phase, setPhase] = useState('idle')
  const [selectedOption, setSelectedOption] = useState('')
  const [reveal, setReveal] = useState(null)
  const [status, setStatus] = useState('Play a chord, then identify what kind of harmony it is.')
  const [score, setScore] = useState({ correct: 0, total: 0 })
  const [volume, setVolume] = useState(GAME_AUDIO_LEVEL)
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
      runTokenRef.current += 1
      audioRef.current?.close()
      audioRef.current = null
    },
    [],
  )

  function playChord(notes) {
    if (!audioRef.current) audioRef.current = createMiniGameAudio()
    audioRef.current.setLevel(volume)
    return audioRef.current.play(notes.map((midi) => 440 * (2 ** ((midi - 69) / 12))), { timbre: 'piano', duration: 1.7 })
  }

  function handleVolume(value) {
    setVolume(value)
    audioRef.current?.setLevel(value)
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
    if (busyRef.current) return
    busyRef.current = true
    const token = ++runTokenRef.current
    const nextPrompt = pickNextPrompt(nextMode)
    setPrompt(nextPrompt)
    setSelectedOption('')
    setReveal(null)
    setPhase('playing')
    setStatus('Listen closely to the chord color.')
    try {
      const finished = await playChord(nextPrompt.notes)
      if (!finished || token !== runTokenRef.current) return
    } catch {
      if (token !== runTokenRef.current) return
      setPhase('idle')
      setStatus('Audio could not start. Tap Play chord to try again.')
      return
    } finally {
      if (token === runTokenRef.current) busyRef.current = false
    }
    setPhase('guessing')
    setStatus(nextMode === 'easy' ? 'Is it major, minor, diminished, or suspended?' : 'Name the exact chord color.')
  }

  async function handleReplay() {
    if (busyRef.current || phase === 'idle') {
      return
    }

    busyRef.current = true
    const token = ++runTokenRef.current
    const alreadyAnswered = reveal !== null
    setPhase('playing')
    setStatus('One more listen...')
    try {
      const finished = await playChord(prompt.notes)
      if (!finished || token !== runTokenRef.current) return
      setPhase(alreadyAnswered ? 'revealed' : 'guessing')
      setStatus(alreadyAnswered ? `That was ${prompt.root.name} ${prompt.answer.label}. Try a new chord when ready.` : mode === 'easy' ? 'Is it major, minor, diminished, or suspended?' : 'Name the exact chord color.')
    } catch {
      if (token !== runTokenRef.current) return
      setPhase(alreadyAnswered ? 'revealed' : 'guessing')
      setStatus('Audio could not start. Tap Replay chord to try again.')
    } finally {
      if (token === runTokenRef.current) busyRef.current = false
    }
  }

  async function handleModeSwitch(nextMode) {
    if (mode === nextMode || busyRef.current) {
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
        ? `Correct. That was ${prompt.root.name} ${prompt.answer.label}.`
        : `Not quite. That was ${prompt.root.name} ${prompt.answer.label}.`,
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

        <label className="mini-game-volume">
          <span>Game volume</span>
          <input type="range" min="0" max="1" step="0.01" value={volume} onChange={(event) => handleVolume(Number(event.target.value))} aria-label="Chord Decoder volume" />
          <output>{Math.round(volume * 100)}%</output>
        </label>

        <div className="chord-game-stage">
          <div className="chord-game-mode-switch" role="tablist" aria-label="Chord decoder mode">
            {Object.entries(MODES).map(([modeKey, config]) => (
              <button
                key={modeKey}
                type="button"
                className={`filter-chip${mode === modeKey ? ' active' : ''}`}
                onClick={() => handleModeSwitch(modeKey)}
                disabled={phase === 'playing'}
                role="tab"
                aria-selected={mode === modeKey}
              >
                {config.label}
              </button>
            ))}
          </div>

          <p className="chord-game-status" role="status" aria-live="polite">{status}</p>

          <div className="chord-game-actions">
            <button type="button" className="primary-button" onClick={() => handlePlayNewChord()} disabled={phase === 'playing'}>
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
                Notes: {prompt.notes.map(midiNoteName).join(' · ')}
              </span>
              <span>
                Intervals: {prompt.answer.intervals.map((interval) => ({ 0: '1', 2: '2', 3: 'b3', 4: '3', 5: '4', 6: 'b5', 7: '5', 10: 'b7', 11: '7', 14: '9' })[interval]).join(' · ')}
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  )
}

export default ChordMoodDecoder
