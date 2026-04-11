import { useEffect, useMemo, useRef, useState } from 'react'

const ROUND_COUNT = 5
const MAX_REPLAYS = 7

const GAME_MODES = {
  easy: {
    label: 'Studio',
    description: 'A warm-up range tuned for laptop and phone speakers.',
    minHz: 180,
    maxHz: 980,
    toneMs: 620,
    gapMs: 170,
  },
  hard: {
    label: 'Challenge',
    description: 'A wider range with sharper jumps between tones.',
    minHz: 140,
    maxHz: 1280,
    toneMs: 560,
    gapMs: 145,
  },
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function hzToErbRate(frequency) {
  return 21.4 * Math.log10(1 + (0.00437 * frequency))
}

function scoreGuess(targetHz, guessHz, minHz, maxHz) {
  const minErb = hzToErbRate(minHz)
  const maxErb = hzToErbRate(maxHz)
  const distance = Math.abs(hzToErbRate(targetHz) - hzToErbRate(guessHz)) / (maxErb - minErb)
  const sharpCurve = 10 * Math.exp(-(distance ** 2) * 3250)
  const gentleCurve = 3 * Math.exp(-(distance ** 2) * 130)
  return clamp(Math.max(sharpCurve, gentleCurve), 0, 10)
}

function formatHz(value) {
  return `${Math.round(value)} Hz`
}

function randomFrequency(minHz, maxHz) {
  return Math.round(minHz + (Math.random() * (maxHz - minHz)))
}

function buildToneSequence(mode) {
  const preset = GAME_MODES[mode]
  const tones = []

  while (tones.length < ROUND_COUNT) {
    const candidate = randomFrequency(preset.minHz, preset.maxHz)
    const candidateErb = hzToErbRate(candidate)
    const tooClose = tones.some((tone) => Math.abs(hzToErbRate(tone) - candidateErb) < 0.42)

    if (!tooClose) {
      tones.push(candidate)
    }
  }

  return tones
}

export function PitchMemoryGame() {
  const audioContextRef = useRef(null)
  const activeNodesRef = useRef([])
  const runTokenRef = useRef(0)
  const [mode, setMode] = useState('easy')
  const [phase, setPhase] = useState('idle')
  const [status, setStatus] = useState('Hear five tones, hold them in memory, and rebuild them one by one.')
  const [sequence, setSequence] = useState([])
  const [guessHz, setGuessHz] = useState(540)
  const [currentRound, setCurrentRound] = useState(0)
  const [sequenceStep, setSequenceStep] = useState(null)
  const [results, setResults] = useState([])
  const [replaysLeft, setReplaysLeft] = useState(MAX_REPLAYS)

  const preset = GAME_MODES[mode]
  const totalScore = useMemo(
    () => results.reduce((sum, result) => sum + result.score, 0),
    [results],
  )

  useEffect(() => {
    const midpoint = Math.round((preset.minHz + preset.maxHz) / 2)
    setGuessHz(midpoint)
  }, [preset.maxHz, preset.minHz])

  useEffect(
    () => () => {
      runTokenRef.current += 1
      activeNodesRef.current.forEach(({ oscillator }) => {
        try {
          oscillator.stop()
        } catch {}
      })
      activeNodesRef.current = []
      audioContextRef.current?.close().catch(() => {})
      audioContextRef.current = null
    },
    [],
  )

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

    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume()
    }

    return audioContextRef.current
  }

  async function playTone(frequency, durationMs, gainAmount = 0.18) {
    const context = await ensureAudioContext()

    if (!context) {
      setStatus('This browser blocked Web Audio, so the game cannot play tones here.')
      return
    }

    const startAt = context.currentTime + 0.01
    const stopAt = startAt + (durationMs / 1000)
    const oscillator = context.createOscillator()
    const filter = context.createBiquadFilter()
    const gain = context.createGain()

    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(frequency, startAt)

    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(Math.max(frequency * 3.5, 1400), startAt)
    filter.Q.setValueAtTime(0.2, startAt)

    gain.gain.setValueAtTime(0.0001, startAt)
    gain.gain.exponentialRampToValueAtTime(gainAmount, startAt + 0.03)
    gain.gain.exponentialRampToValueAtTime(0.0001, stopAt)

    oscillator.connect(filter)
    filter.connect(gain)
    gain.connect(context.destination)

    const nodeRecord = { oscillator, gain, filter }
    activeNodesRef.current.push(nodeRecord)

    oscillator.onended = () => {
      activeNodesRef.current = activeNodesRef.current.filter((entry) => entry !== nodeRecord)
      oscillator.disconnect()
      filter.disconnect()
      gain.disconnect()
    }

    oscillator.start(startAt)
    oscillator.stop(stopAt + 0.03)
    await wait(durationMs + 80)
  }

  async function playSequence(tones, { consumeReplay = false } = {}) {
    const token = ++runTokenRef.current

    setPhase('playing')
    setSequenceStep(0)
    setStatus('Listen closely. One pass, five tones.')

    if (consumeReplay) {
      setReplaysLeft((current) => Math.max(0, current - 1))
    }

    for (let index = 0; index < tones.length; index += 1) {
      if (token !== runTokenRef.current) {
        return
      }

      setSequenceStep(index + 1)
      await playTone(tones[index], preset.toneMs, mode === 'hard' ? 0.17 : 0.18)
      await wait(preset.gapMs)
    }

    if (token !== runTokenRef.current) {
      return
    }

    setSequenceStep(null)
    setPhase('guessing')
    setStatus(`Now rebuild tone ${1} of ${ROUND_COUNT} from memory.`)
  }

  async function handleStartGame() {
    const tones = buildToneSequence(mode)
    const midpoint = Math.round((preset.minHz + preset.maxHz) / 2)

    setSequence(tones)
    setResults([])
    setCurrentRound(0)
    setGuessHz(midpoint)
    setReplaysLeft(MAX_REPLAYS)
    await playSequence(tones)
  }

  async function handleReplaySequence() {
    if (!sequence.length || replaysLeft < 1 || phase === 'playing' || results.length > 0) {
      return
    }

    await playSequence(sequence, { consumeReplay: true })
  }

  async function handlePreviewGuess() {
    await playTone(guessHz, 460, 0.16)
    setStatus(`Previewing your guess at ${formatHz(guessHz)}.`)
  }

  function handleSubmitGuess() {
    if (!sequence.length || phase !== 'guessing') {
      return
    }

    const targetHz = sequence[currentRound]
    const score = scoreGuess(targetHz, guessHz, preset.minHz, preset.maxHz)
    const nextResults = [
      ...results,
      {
        round: currentRound + 1,
        targetHz,
        guessHz,
        differenceHz: Math.abs(targetHz - guessHz),
        score,
      },
    ]

    const nextRound = currentRound + 1
    const midpoint = Math.round((preset.minHz + preset.maxHz) / 2)

    setResults(nextResults)
    setGuessHz(midpoint)

    if (nextRound >= ROUND_COUNT) {
      setCurrentRound(nextRound)
      setPhase('complete')
      setStatus(`Session complete. You landed ${nextResults.reduce((sum, item) => sum + item.score, 0).toFixed(1)} out of 50.`)
      return
    }

    setCurrentRound(nextRound)
    setStatus(`Locked in. Now rebuild tone ${nextRound + 1} of ${ROUND_COUNT}.`)
  }

  function nudgeGuess(amount) {
    setGuessHz((current) => clamp(current + amount, preset.minHz, preset.maxHz))
  }

  return (
    <article className="pitch-game-shell">
      <div className="pitch-game-panel">
        <div className="pitch-game-head">
          <div className="pitch-game-head-copy">
            <p className="panel-label">Mini game</p>
            <h3>Ear Memory Lab</h3>
            <span>{preset.description}</span>
          </div>

          <div className="pitch-game-score-pill">
            <strong>{totalScore.toFixed(1)}</strong>
            <span>/ 50</span>
          </div>
        </div>

        <div className="pitch-game-topline">
          <div className="pitch-game-mode-switch" role="tablist" aria-label="Game difficulty">
            {Object.entries(GAME_MODES).map(([value, option]) => (
              <button
                key={value}
                type="button"
                className={`filter-chip${mode === value ? ' active' : ''}`}
                onClick={() => setMode(value)}
                disabled={phase === 'playing'}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="pitch-game-meta">
            <strong>{preset.label}</strong>
            <span>{preset.description}</span>
          </div>
        </div>

        <div className="pitch-game-stage">
          <div className="pitch-game-status">
            <p>{status}</p>
          </div>

          <div className="pitch-game-sequence">
            {Array.from({ length: ROUND_COUNT }, (_, index) => {
              const roundDone = index < results.length
              const roundActive = phase !== 'idle' && index === currentRound && phase !== 'complete'
              const roundPlaying = sequenceStep === index + 1

              return (
                <div
                  key={`tone-${index + 1}`}
                  className={`pitch-step${roundDone ? ' done' : ''}${roundActive ? ' active' : ''}${roundPlaying ? ' playing' : ''}`}
                >
                  <span>{index + 1}</span>
                </div>
              )
            })}
          </div>

          <div className="pitch-game-controls">
            <button
              type="button"
              className="primary-button"
              onClick={handleStartGame}
              disabled={phase === 'playing'}
            >
              {phase === 'idle' ? 'Start' : 'New tones'}
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={handleReplaySequence}
              disabled={!sequence.length || replaysLeft < 1 || phase === 'playing' || results.length > 0}
            >
              Replay sequence
            </button>

            <span className="pitch-game-replay-note">
              {replaysLeft}
              {' '}
              {replaysLeft === 1 ? 'replay left' : 'replays left'}
            </span>
          </div>

          <div className="pitch-game-slider-shell">
            <div className="pitch-game-slider-header">
              <strong>
                {phase === 'complete' ? 'Session complete' : `Tone ${Math.min(currentRound + 1, ROUND_COUNT)} of ${ROUND_COUNT}`}
              </strong>
              <span>{formatHz(guessHz)}</span>
            </div>

            <input
              className="pitch-game-slider"
              type="range"
              min={preset.minHz}
              max={preset.maxHz}
              step="1"
              value={guessHz}
              onChange={(event) => setGuessHz(Number(event.target.value))}
              disabled={phase === 'idle' || phase === 'playing' || phase === 'complete'}
              aria-label="Pitch guess in hertz"
            />

            <div className="pitch-game-nudges">
              {[
                ['-25', -25],
                ['-5', -5],
                ['+5', 5],
                ['+25', 25],
              ].map(([label, amount]) => (
                <button
                  key={label}
                  type="button"
                  className="pitch-game-nudge"
                  onClick={() => nudgeGuess(amount)}
                  disabled={phase === 'idle' || phase === 'playing' || phase === 'complete'}
                >
                  {label}
                  {' '}
                  Hz
                </button>
              ))}
            </div>

            <div className="pitch-game-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={handlePreviewGuess}
                disabled={phase === 'idle' || phase === 'playing' || phase === 'complete'}
              >
                Hear my guess
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={handleSubmitGuess}
                disabled={phase === 'idle' || phase === 'playing' || phase === 'complete'}
              >
                Lock in this tone
              </button>
            </div>
          </div>
        </div>

        <div className="pitch-game-results">
          <div className="pitch-game-results-grid">
            {Array.from({ length: ROUND_COUNT }, (_, index) => {
              const result = results[index]

              return (
                <article className="pitch-result-card" key={`result-${index + 1}`}>
                  <span className="pitch-result-step">Round {index + 1}</span>
                  {result ? (
                    <>
                      <strong>{result.score.toFixed(1)} / 10</strong>
                      <span>Target: {formatHz(result.targetHz)}</span>
                      <span>Guess: {formatHz(result.guessHz)}</span>
                      <span>Delta: {Math.round(result.differenceHz)} Hz</span>
                    </>
                  ) : (
                    <>
                      <strong>Waiting</strong>
                      <span>Match the sequence to reveal this result.</span>
                    </>
                  )}
                </article>
              )
            })}
          </div>
        </div>
      </div>
    </article>
  )
}

export default PitchMemoryGame
