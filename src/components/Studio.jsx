import { useEffect, useRef, useState } from 'react'
import { STUDIO_DEFAULTS, StudioAudio } from '../studioAudio'
import { DEFAULT_SEQUENCE, NOTE_NAMES, SEQUENCE_PATTERNS, SEQUENCE_SCALES, makeSequence, noteName } from '../studioSequences'
import { randomGrains, randomSequence, randomSynth } from '../studioRandomize'
import './Studio.css'

const INITIAL_SAMPLE = '/audio/random-sounds/VA_mrpantsurprisesong)OUHO.ogg'
const KEYBOARD = [
  ['C', 60, 'A'], ['C#', 61, 'W'], ['D', 62, 'S'], ['D#', 63, 'E'],
  ['E', 64, 'D'], ['F', 65, 'F'], ['F#', 66, 'T'], ['G', 67, 'G'],
  ['G#', 68, 'Y'], ['A', 69, 'H'], ['A#', 70, 'U'], ['B', 71, 'J'], ['C', 72, 'K'],
]
const PATCHES = {
  'Warm keys': { waveform: 'triangle', cutoff: 2200, resonance: 0.8, attack: 0.025, release: 0.55, detune: 4 },
  'Soft pad': { waveform: 'sawtooth', cutoff: 1200, resonance: 1.4, attack: 0.55, release: 1.4, detune: 12 },
  'Bass line': { waveform: 'square', cutoff: 650, resonance: 2.8, attack: 0.008, release: 0.15, detune: 3 },
}
const GRAIN_PATCHES = {
  Particles: { grainSize: 0.022, density: 29, spray: 0.3, texture: 0.95 },
  Stutter: { grainSize: 0.06, density: 12, spray: 0.025, texture: 0.7 },
  Cloud: { grainSize: 0.18, density: 36, spray: 0.12, texture: 0.1 },
}
const SEQUENCE_NOTE_OPTIONS = Array.from({ length: 60 }, (_, index) => index + 24)

function Control({ name, value, min, max, step = 0.01, display, onChange }) {
  const inputRef = useRef(null)
  const dragRef = useRef(null)
  const progress = (value - min) / (max - min)
  return (
    <label className="studio-control">
      <span className="studio-control-heading"><span>{name}</span><output>{display ?? value}</output></span>
      <span className="studio-dial" aria-hidden="true" style={{ '--angle': `${-135 + progress * 270}deg` }}
        onPointerDown={(event) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); inputRef.current.focus(); dragRef.current = { y: event.clientY, value } }}
        onPointerMove={(event) => {
          if (!dragRef.current) return
          const raw = dragRef.current.value + (dragRef.current.y - event.clientY) / 140 * (max - min)
          const rounded = min + Math.round((raw - min) / step) * step
          onChange(Math.max(min, Math.min(max, rounded)))
        }}
        onPointerUp={() => { dragRef.current = null }}
        onPointerCancel={() => { dragRef.current = null }}
        onLostPointerCapture={() => { dragRef.current = null }}
      ><i /></span>
      <input ref={inputRef} aria-label={name} type="range" value={value} min={min} max={max} step={step} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  )
}

function Scope({ engineRef, grainStateRef, running }) {
  const canvasRef = useRef(null)
  const [level, setLevel] = useState(0)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let width = 800
    let height = 210
    let frame
    let lastMeter = 0
    const timeData = new Uint8Array(1024)
    const bins = new Uint8Array(512)
    const resize = () => {
      width = canvas.clientWidth
      height = canvas.clientHeight
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    resize()
    const draw = (time) => {
      ctx.clearRect(0, 0, width, height)
      const engine = engineRef.current
      if (engine) {
        engine.analyser.getByteTimeDomainData(timeData)
        engine.analyser.getByteFrequencyData(bins)
      } else {
        timeData.fill(128)
        bins.fill(0)
      }
      const energy = bins.reduce((sum, value) => sum + value, 0) / bins.length / 255
      if (time - lastMeter > 120) {
        setLevel(Math.min(100, Math.round(energy * 320)))
        lastMeter = time
      }
      ctx.strokeStyle = 'rgba(211, 177, 125, 0.08)'
      ctx.lineWidth = 1
      for (let x = 0; x < width; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke() }
      for (let y = 0; y < height; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke() }
      ctx.beginPath()
      for (let i = 0; i < timeData.length; i += 2) {
        const x = i / timeData.length * width
        const y = height * 0.43 + (timeData[i] / 128 - 1) * height * 0.48
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
      }
      ctx.strokeStyle = '#e9bd7a'
      ctx.lineWidth = 1.7
      ctx.shadowColor = '#e9bd7a'
      ctx.shadowBlur = energy > 0.02 ? 10 : 0
      ctx.stroke()
      ctx.shadowBlur = 0
      for (let i = 0; i < 64; i += 1) {
        const value = bins[i * 3] / 255
        ctx.fillStyle = `rgba(144, 173, 147, ${0.18 + value * 0.65})`
        ctx.fillRect(i * width / 64, height - 8 - value * height * 0.25, Math.max(1, width / 64 - 3), value * height * 0.25 + 2)
      }
      if (running) {
        const { position, spray, density, grainSize } = grainStateRef.current
        for (let i = 0; i < Math.min(32, density); i += 1) {
          const life = ((time / Math.max(90, grainSize * 2000)) + i / density) % 1
          const x = Math.max(0, Math.min(width, (position + Math.sin(i * 4.13) * spray * 0.5) * width))
          ctx.fillStyle = `rgba(217, 167, 103, ${Math.sin(life * Math.PI) * 0.75})`
          ctx.beginPath(); ctx.arc(x, height * 0.43 + Math.cos(i * 2.1) * life * 58, 1.5 + (1 - life) * 3, 0, Math.PI * 2); ctx.fill()
        }
      }
      frame = requestAnimationFrame(draw)
    }
    frame = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(frame); observer.disconnect() }
  }, [engineRef, grainStateRef, running])

  return (
    <section className="studio-scope" aria-label="Live output waveform">
      <div className="studio-scope-top"><span>Live signal</span><span>MASTER <b>{level}%</b></span></div>
      <canvas ref={canvasRef} aria-hidden="true" />
      <meter className="studio-meter" aria-label="Output level" min="0" max="100" value={level} />
    </section>
  )
}

export default function Studio() {
  const engineRef = useRef(null)
  const settingsRef = useRef({ ...STUDIO_DEFAULTS })
  const sequenceRef = useRef({ ...DEFAULT_SEQUENCE, notes: [...DEFAULT_SEQUENCE.notes] })
  const importedFileRef = useRef(null)
  const recorderRef = useRef(null)
  const takeAudioRef = useRef(null)
  const recordingUrlRef = useRef(null)
  const loadRef = useRef({ controller: null, generation: 0 })
  const aliveRef = useRef(true)
  const [controls, setControls] = useState({ ...STUDIO_DEFAULTS })
  const [activeNotes, setActiveNotes] = useState([])
  const [octave, setOctave] = useState(0)
  const [isSequence, setIsSequence] = useState(false)
  const [sequence, setSequence] = useState(sequenceRef.current)
  const [playingStep, setPlayingStep] = useState(-1)
  const [sequencePattern, setSequencePattern] = useState('Night drive')
  const [sequenceRoot, setSequenceRoot] = useState(0)
  const [sequenceScale, setSequenceScale] = useState('Minor')
  const [isGrains, setIsGrains] = useState(false)
  const [library, setLibrary] = useState([])
  const [sampleSrc, setSampleSrc] = useState(INITIAL_SAMPLE)
  const [sampleName, setSampleName] = useState('Sound 001')
  const [sampleData, setSampleData] = useState(null)
  const [loadingSample, setLoadingSample] = useState(false)
  const [status, setStatus] = useState('Play a key to begin. Headphones recommended.')
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [take, setTake] = useState(null)
  const [recordAvailable] = useState(() => typeof MediaRecorder !== 'undefined')
  const [isFxOpen, setIsFxOpen] = useState(() => !window.matchMedia('(max-width: 800px)').matches)

  useEffect(() => {
    const mobile = window.matchMedia('(max-width: 800px)')
    const onChange = () => { if (mobile.matches) setIsFxOpen(false) }
    mobile.addEventListener('change', onChange)
    return () => mobile.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    const previousTitle = document.title
    document.title = 'Vinayak Arora | Sound Studio'
    window.scrollTo({ top: 0, behavior: 'instant' })
    return () => { document.title = previousTitle }
  }, [])

  const getEngine = () => {
    if (!engineRef.current) {
      engineRef.current = new StudioAudio()
      engineRef.current.update(settingsRef.current)
      engineRef.current.updateSequence(sequenceRef.current, setPlayingStep)
    }
    return engineRef.current
  }

  const safely = (action) => {
    try { action() } catch (error) { setStatus(error.message) }
  }

  const change = (key, value) => {
    const next = { ...settingsRef.current, [key]: value }
    settingsRef.current = next
    setControls(next)
    engineRef.current?.update(next)
  }

  const changeSequence = (changes) => {
    const next = { ...sequenceRef.current, ...changes }
    sequenceRef.current = next
    setSequence(next)
    engineRef.current?.updateSequence(next, setPlayingStep)
  }

  const toggleSequence = () => safely(() => {
    getEngine().setSequence(!isSequence, sequenceRef.current, setPlayingStep)
    setIsSequence(!isSequence)
  })

  const choosePattern = (pattern) => {
    setSequencePattern(pattern)
    changeSequence({ notes: makeSequence(pattern, sequenceRoot, sequenceScale, sequenceRef.current.notes.length) })
  }

  const editStep = (index, value) => {
    setSequencePattern('Custom')
    const notes = sequenceRef.current.notes.map((note, step) => step === index ? (value === '' ? null : Number(value)) : note)
    changeSequence({ notes })
  }

  const resizeSequence = (length) => {
    const notes = sequenceRef.current.notes
    changeSequence({ notes: Array.from({ length }, (_, index) => notes[index] ?? null) })
    setSequencePattern('Custom')
  }

  const noteOn = (note) => safely(() => {
    getEngine().noteOn(note)
    setActiveNotes((current) => current.includes(note) ? current : [...current, note])
    setStatus('Synth ready. Hold keys, turn the filter, or try a patch.')
  })
  const noteOff = (note) => {
    engineRef.current?.noteOff(note)
    setActiveNotes((current) => current.filter((value) => value !== note))
  }

  const stopAll = (pauseTake = true) => {
    engineRef.current?.stopAll()
    if (pauseTake) takeAudioRef.current?.pause()
    setActiveNotes([])
    setIsGrains(false)
    setIsSequence(false)
    setStatus('All instruments stopped. Effects fade naturally.')
  }

  useEffect(() => {
    const controller = new AbortController()
    fetch('/audio/random-sounds/manifest.json', { signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error('Sound bank unavailable.'); return response.json() })
      .then((entries) => {
        const sounds = [{ src: INITIAL_SAMPLE }, ...entries.filter((entry) => entry?.src && entry.src !== INITIAL_SAMPLE)]
        setLibrary(sounds.map((entry, index) => ({ src: entry.src, label: `Sound ${String(index + 1).padStart(3, '0')}` })))
      })
      .catch((error) => { if (error.name !== 'AbortError') setStatus('Sound bank unavailable. You can import a sample.') })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const held = new Map()
    const keyDown = (event) => {
      const element = event.target
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || (element instanceof Element && element.closest('select,textarea,audio,input:not([type="range"])'))) return
      const key = KEYBOARD.find(([, , letter]) => event.key.toUpperCase() === letter)
      if (!key) return
      event.preventDefault()
      const note = key[1] + octave * 12
      held.set(event.code, note)
      noteOn(note)
    }
    const keyUp = (event) => {
      if (!held.has(event.code)) return
      noteOff(held.get(event.code)); held.delete(event.code)
    }
    const release = () => {
      held.forEach((note) => noteOff(note)); held.clear()
      engineRef.current?.releaseAll()
      setActiveNotes([])
    }
    window.addEventListener('keydown', keyDown)
    window.addEventListener('keyup', keyUp)
    window.addEventListener('blur', release)
    return () => {
      release()
      window.removeEventListener('keydown', keyDown)
      window.removeEventListener('keyup', keyUp)
      window.removeEventListener('blur', release)
    }
  }, [octave])

  useEffect(() => {
    if (!recording) return undefined
    const timer = setInterval(() => setSeconds((value) => value + 1), 1000)
    return () => clearInterval(timer)
  }, [recording])

  useEffect(() => {
    aliveRef.current = true
    return () => {
      aliveRef.current = false
      loadRef.current.controller?.abort()
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
      if (recordingUrlRef.current) URL.revokeObjectURL(recordingUrlRef.current)
      engineRef.current?.dispose().catch(() => {})
      engineRef.current = null
    }
  }, [])

  const loadSample = async (src = sampleSrc, name = sampleName, file = null) => {
    const generation = ++loadRef.current.generation
    loadRef.current.controller?.abort()
    const controller = new AbortController()
    loadRef.current.controller = controller
    setLoadingSample(true)
    setSampleData(null)
    engineRef.current?.stopGrains()
    engineRef.current?.stopPreview()
    setIsGrains(false)
    try {
      const engine = getEngine()
      await engine.resume()
      let bytes
      if (file || src === 'imported') bytes = await (file || importedFileRef.current).arrayBuffer()
      else {
        const response = await fetch(src, { signal: controller.signal })
        if (!response.ok) throw new Error('This sample could not be loaded. Try another sound.')
        bytes = await response.arrayBuffer()
      }
      if (generation !== loadRef.current.generation || !aliveRef.current) return null
      const data = await engine.loadSample(bytes)
      if (generation !== loadRef.current.generation || !aliveRef.current || !data) return null
      setSampleData(data)
      setSampleName(name)
      setStatus('Sample loaded. Start the grains, then move Position and Grain size.')
      return engine
    } catch (error) {
      if (error.name !== 'AbortError' && aliveRef.current) setStatus(error.message || 'Could not decode this audio file.')
      return null
    } finally {
      if (generation === loadRef.current.generation && aliveRef.current) setLoadingSample(false)
    }
  }

  const toggleGrains = async () => {
    if (isGrains) { engineRef.current?.stopGrains(); setIsGrains(false); return }
    const engine = sampleData ? getEngine() : await loadSample()
    if (!engine || !aliveRef.current) return
    await engine.resume()
    engine.startGrains()
    setIsGrains(true)
  }

  const selectSample = (event) => {
    const src = event.target.value
    const name = library.find((entry) => entry.src === src)?.label || 'Sound'
    setSampleSrc(src)
    loadSample(src, name)
  }

  const importSample = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > 25 * 1024 * 1024) { setStatus('Choose an audio file smaller than 25 MB.'); return }
    importedFileRef.current = file
    setSampleSrc('imported')
    loadSample('imported', 'Imported sound', file)
    event.target.value = ''
  }

  const toggleRecording = async () => {
    if (recording) { recorderRef.current?.stop(); setRecording(false); return }
    try {
      const engine = getEngine()
      await engine.resume()
      const mime = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg;codecs=opus']
        .find((type) => MediaRecorder.isTypeSupported(type))
      const recorder = new MediaRecorder(engine.capture.stream, mime ? { mimeType: mime } : undefined)
      const chunks = []
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data) }
      recorder.onstop = () => {
        if (!aliveRef.current) return
        const type = recorder.mimeType || chunks[0]?.type || 'audio/webm'
        const blob = new Blob(chunks, { type })
        if (recordingUrlRef.current) URL.revokeObjectURL(recordingUrlRef.current)
        const url = URL.createObjectURL(blob)
        recordingUrlRef.current = url
        const extension = type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm'
        setTake({ url, filename: `vinayak-studio-${Date.now()}.${extension}` })
        setRecording(false)
        setStatus('Take saved. Stop the instruments to listen back or download your recording.')
      }
      recorder.onerror = () => { setRecording(false); setStatus('Recording failed. Please try a new take.') }
      recorderRef.current = recorder
      recorder.start(250)
      setSeconds(0)
      setRecording(true)
      setStatus('Recording the synth, samples, and effects. Play something.')
    } catch (error) { setStatus(error.message || 'Recording is unavailable in this browser.') }
  }

  const applyPatch = (name) => {
    const next = { ...settingsRef.current, ...PATCHES[name] }
    settingsRef.current = next
    setControls(next)
    engineRef.current?.update(next)
    setStatus(`${name} loaded. Play the keyboard or start the sequence.`)
  }

  const applyGrainPatch = (name) => {
    const next = { ...settingsRef.current, ...GRAIN_PATCHES[name] }
    settingsRef.current = next
    setControls(next)
    engineRef.current?.update(next)
  }

  const randomiseInstrument = (instrument) => {
    const patch = instrument === 'synth' ? randomSynth() : randomGrains()
    const next = { ...settingsRef.current, ...patch }
    settingsRef.current = next
    setControls(next)
    engineRef.current?.update(next)
    setStatus(instrument === 'synth' ? 'New synth patch. Play a key or your sequence to hear it.' : 'New grain texture. Start grains or keep exploring the running sound.')
  }

  const randomisePhrase = () => {
    changeSequence({ notes: randomSequence(sequenceRef.current.notes, sequenceRoot, sequenceScale) })
    setSequencePattern('Custom')
    setStatus(`New phrase in ${NOTE_NAMES[sequenceRoot]} ${sequenceScale.toLowerCase()}. Your tempo and sound stay the same.`)
  }

  return (
    <main className="studio-page">
      <header className="studio-header">
        <a className="studio-back" href="/">← Portfolio</a>
        <div className="studio-brand"><span>Vinayak Arora</span><strong>Playroom<span className="studio-brand-dot">.</span></strong></div>
        <button className="studio-stop" onClick={stopAll}>Stop all</button>
      </header>

      <div className="studio-intro"><span className="studio-kicker">An open studio for curious ears</span><h1>Make a little noise.</h1><p>Play a synth. Scatter a sample into grains. Record what happens.</p></div>

      <Scope engineRef={engineRef} grainStateRef={settingsRef} running={isGrains} />

      <div className="studio-racks">
      <section className="studio-keyboard-module" aria-label="Playable synth keyboard">
        <div className="studio-keyboard-top"><span>Play with touch, mouse, or A W S E D F T G Y H U J K</span><div><button aria-label="Lower octave" disabled={octave <= -2} onClick={() => setOctave(octave - 1)}>−</button><span>Octave {4 + octave}</span><button aria-label="Raise octave" disabled={octave >= 1} onClick={() => setOctave(octave + 1)}>+</button></div></div>
        <div className="studio-keyboard">{KEYBOARD.map(([name, midi, letter]) => { const note = midi + octave * 12; return <button key={midi} className={`studio-key ${name.includes('#') ? 'black' : 'white'}${activeNotes.includes(note) ? ' held' : ''}`} aria-label={`Play ${name}${4 + octave + (midi === 72 ? 1 : 0)}`} aria-pressed={activeNotes.includes(note)} onPointerDown={(event) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); noteOn(note) }} onPointerUp={() => noteOff(note)} onPointerCancel={() => noteOff(note)} onLostPointerCapture={() => noteOff(note)} onKeyDown={(event) => { if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) { event.preventDefault(); noteOn(note) } }} onKeyUp={(event) => { if (event.key === ' ' || event.key === 'Enter') noteOff(note) }} onBlur={() => noteOff(note)}><span>{letter}</span><small>{name}</small></button> })}</div>
      </section>

        <section className="studio-rack studio-synth" aria-labelledby="synth-title">
          <div className="studio-rack-heading"><div><p>Synthesis</p><h2 id="synth-title">Two oscillators. One voice.</h2></div><span className="studio-led" data-on={activeNotes.length > 0 || isSequence} /></div>
          <div className="studio-patches" aria-label="Synth patches">{Object.keys(PATCHES).map((name) => <button key={name} onClick={() => applyPatch(name)}>{name}</button>)}<button className="studio-randomise" aria-label="Randomise synth" onClick={() => randomiseInstrument('synth')}>Randomise</button></div>
          <div className="studio-waveforms" aria-label="Oscillator waveform">{[['sine', 'Sine'], ['triangle', 'Triangle'], ['sawtooth', 'Saw'], ['square', 'Square']].map(([value, label]) => <button key={value} aria-pressed={controls.waveform === value} onClick={() => change('waveform', value)}>{label}</button>)}</div>
          <div className="studio-synth-actions"><button aria-pressed={isSequence} onClick={toggleSequence}>{isSequence ? 'Stop sequence' : 'Play sequence'}</button><button onClick={() => safely(() => getEngine().playChord([60, 64, 67, 71]))}>Cmaj7</button><button onClick={() => safely(() => getEngine().playChord([57, 60, 64, 67]))}>Am7</button><a className="studio-sequence-link" href="#sequence-editor">Edit sequence ↓</a></div>
          <div className="studio-controls">
            <Control name="Filter" min={Math.log(100)} max={Math.log(16000)} value={Math.log(controls.cutoff)} display={`${Math.round(controls.cutoff)} Hz`} onChange={(value) => change('cutoff', Math.exp(value))} />
            <Control name="Resonance" min={0.1} max={8} value={controls.resonance} display={controls.resonance.toFixed(1)} onChange={(value) => change('resonance', value)} />
            <Control name="Detune" min={0} max={30} value={controls.detune} step={1} display={`${controls.detune} ct`} onChange={(value) => change('detune', value)} />
            <Control name="Attack" min={0.008} max={1} value={controls.attack} display={`${Math.round(controls.attack * 1000)} ms`} onChange={(value) => change('attack', value)} />
            <Control name="Release" min={0.05} max={2} value={controls.release} display={`${controls.release.toFixed(2)} s`} onChange={(value) => change('release', value)} />
            <Control name="Synth level" min={0} max={1} value={controls.synthLevel} display={`${Math.round(controls.synthLevel * 100)}%`} onChange={(value) => change('synthLevel', value)} />
          </div>
        </section>

      <section className="studio-sequence-editor studio-rack" id="sequence-editor" aria-labelledby="sequence-title">
        <div className="studio-rack-heading"><div><p>Step sequencer</p><h2 id="sequence-title">Write your own phrase.</h2></div><div className="studio-sequence-actions"><button className="studio-randomise" aria-label="Randomise sequence" onClick={randomisePhrase}>Randomise</button><button aria-pressed={isSequence} onClick={toggleSequence}>{isSequence ? 'Stop phrase' : 'Play phrase'}</button></div></div>
        <div className="studio-sequence-settings">
          <label>Starting pattern<select aria-label="Starting pattern" value={sequencePattern} onChange={(event) => choosePattern(event.target.value)}>{sequencePattern === 'Custom' && <option value="Custom">Custom</option>}{Object.keys(SEQUENCE_PATTERNS).map((name) => <option key={name}>{name}</option>)}</select></label>
          <label>Key<select aria-label="Sequence key" value={sequenceRoot} onChange={(event) => setSequenceRoot(Number(event.target.value))}>{NOTE_NAMES.map((name, index) => <option key={name} value={index}>{name}</option>)}</select></label>
          <label>Scale<select aria-label="Sequence scale" value={sequenceScale} onChange={(event) => setSequenceScale(event.target.value)}>{Object.keys(SEQUENCE_SCALES).map((name) => <option key={name}>{name}</option>)}</select></label>
          <label>Length<select aria-label="Sequence length" value={sequence.notes.length} onChange={(event) => resizeSequence(Number(event.target.value))}>{[8, 16, 32].map((length) => <option key={length} value={length}>{length} steps</option>)}</select></label>
          <label>Octave<select aria-label="Sequence octave" value={sequence.octave ?? 0} onChange={(event) => changeSequence({ octave: Number(event.target.value) })}>{[-2, -1, 0, 1, 2].map((shift) => <option key={shift} value={shift}>{shift === 0 ? 'Original' : `${shift > 0 ? '+' : ''}${shift} octave${Math.abs(shift) === 2 ? 's' : ''}`}</option>)}</select></label>
          <button onClick={() => choosePattern(sequencePattern === 'Custom' ? 'Night drive' : sequencePattern)}>Generate</button>
          <button onClick={() => { changeSequence({ notes: sequence.notes.map(() => null) }); setSequencePattern('Custom') }}>Clear</button>

        </div>
        <div className="studio-sequence-timing">
          <label>Tempo <output>{sequence.bpm} BPM</output><input aria-label="Sequence tempo" type="range" min="50" max="180" step="1" value={sequence.bpm} onChange={(event) => changeSequence({ bpm: Number(event.target.value) })} /></label>
          <label>Swing <output>{Math.round(sequence.swing * 100)}%</output><input aria-label="Sequence swing" type="range" min="0" max="0.45" step="0.01" value={sequence.swing} onChange={(event) => changeSequence({ swing: Number(event.target.value) })} /></label>
          <label>Gate <output>{Math.round(sequence.gate * 100)}%</output><input aria-label="Sequence gate" type="range" min="0.15" max="0.95" step="0.01" value={sequence.gate} onChange={(event) => changeSequence({ gate: Number(event.target.value) })} /></label>
        </div>
        <div className="studio-sequence-steps">{sequence.notes.map((note, index) => (
          <label className={`studio-sequence-step${note === null ? ' rest' : ''}${playingStep === index ? ' playing' : ''}`} key={index} aria-current={playingStep === index ? 'step' : undefined}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <select aria-label={`Note for step ${index + 1}`} value={note ?? ''} onChange={(event) => editStep(index, event.target.value)}><option value="">Rest</option>{SEQUENCE_NOTE_OPTIONS.map((midi) => <option key={midi} value={midi}>{noteName(midi + (sequence.octave ?? 0) * 12)}</option>)}</select>
          </label>
        ))}</div>
        <p className="studio-sequence-help">Edit any note or choose Rest. Octave shifts the whole phrase; displayed notes show what you hear. Key and scale guide Generate and Randomise; length changes keep your existing steps.</p>
      </section>


        <section className="studio-rack studio-granular" aria-labelledby="grains-title">
          <div className="studio-rack-heading"><div><p>Granular sampling</p><h2 id="grains-title">Find a sound inside a sound.</h2></div><span className="studio-led" data-on={isGrains} /></div>
          <p className="studio-sample-credit">The built-in sound bank contains original samples created, synthesised, and recorded by <strong>Vinayak Arora</strong>. If you use these samples in your work, please credit Vinayak Arora.</p>
          <div className="studio-sample-select"><label>Sound bank<select value={sampleSrc} onChange={selectSample} disabled={loadingSample}>{!library.length && <option value={INITIAL_SAMPLE}>Sound 001</option>}{sampleSrc === 'imported' && <option value="imported">Imported sound</option>}{library.map((entry) => <option key={entry.src} value={entry.src}>{entry.label}</option>)}</select></label><label className="studio-import">Import audio<input type="file" accept="audio/*" onChange={importSample} disabled={loadingSample} /></label></div>
          <div className="studio-sample-display"><div className="studio-sample-name"><span>{loadingSample ? 'Loading sample…' : sampleName}</span><span>{sampleData ? `${sampleData.duration.toFixed(1)} s` : 'Load on play'}</span></div><div className="studio-sample-wave" aria-hidden="true">{(sampleData?.peaks || Array.from({ length: 160 }, () => 0.08)).map((peak, index) => <span key={index} style={{ height: `${Math.max(4, peak * 100)}%` }} />)}<i style={{ left: `${controls.position * 100}%` }} /></div></div>
          <div className="studio-synth-actions"><button className="studio-primary" disabled={loadingSample} aria-pressed={isGrains} onClick={toggleGrains}>{loadingSample ? 'Loading…' : isGrains ? 'Stop grains' : 'Start grains'}</button><button disabled={loadingSample} onClick={async () => { const engine = sampleData ? getEngine() : await loadSample(); if (engine) { await engine.resume(); engine.playPreview() } }}>Play original</button><button aria-pressed={controls.reverse} onClick={() => change('reverse', !controls.reverse)}>Reverse</button></div>
          <div className="studio-patches studio-grain-patches" aria-label="Grain textures">{Object.keys(GRAIN_PATCHES).map((name) => <button key={name} onClick={() => applyGrainPatch(name)}>{name}</button>)}<button className="studio-randomise" aria-label="Randomise grains" onClick={() => randomiseInstrument('grains')}>Randomise</button></div>
          <div className="studio-controls">
            <Control name="Position" min={0} max={1} value={controls.position} display={`${Math.round(controls.position * 100)}%`} onChange={(value) => change('position', value)} />
            <Control name="Grain size" min={0.006} max={0.4} step={0.001} value={controls.grainSize} display={`${Math.round(controls.grainSize * 1000)} ms`} onChange={(value) => change('grainSize', value)} />
            <Control name="Density" min={2} max={60} value={controls.density} step={1} display={`${controls.density}/s`} onChange={(value) => change('density', value)} />
            <Control name="Spray" min={0} max={0.4} value={controls.spray} display={`${Math.round(controls.spray * 100)}%`} onChange={(value) => change('spray', value)} />
            <Control name="Pitch" min={-24} max={24} value={controls.pitch} step={1} display={`${controls.pitch > 0 ? '+' : ''}${controls.pitch} st`} onChange={(value) => change('pitch', value)} />
            <Control name="Sample level" min={0} max={1} value={controls.grainLevel} display={`${Math.round(controls.grainLevel * 100)}%`} onChange={(value) => change('grainLevel', value)} />
            <Control name="Texture" min={0} max={1} value={controls.texture} display={`${Math.round(controls.texture * 100)}%`} onChange={(value) => change('texture', value)} />
          </div>
        </section>
      </div>

      <section className="studio-output" aria-label="Recording">
        <div className="studio-recorder"><div><span className="studio-kicker">Capture your experiment</span><span className="studio-time">{String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}</span></div><button className={`studio-record${recording ? ' recording' : ''}`} disabled={!recordAvailable} onClick={toggleRecording}><i />{recording ? 'Finish take' : 'Record take'}</button><p>{recordAvailable ? 'Records the instruments, samples, and effects in this studio.' : 'Recording is unavailable in this browser.'}</p></div>
      </section>

      {take && <section className="studio-take" aria-label="Your recorded take"><div><span className="studio-kicker">Your latest take</span><audio ref={takeAudioRef} aria-label="Play recorded take" controls src={take.url} onPlay={() => stopAll(false)} /></div><a href={take.url} download={take.filename}>Download audio ↗</a></section>}
      <p className="studio-status" role="status">{status}</p>
      <footer className="studio-footer"><span>Made for exploration, by Vinayak Arora.</span><a href="/#contact">Let's make something together ↗</a></footer>
      <aside className={`studio-floating-fx${isFxOpen ? ' open' : ''}`} aria-label="Floating studio effects">
        <div className="studio-fx-heading">
          {isFxOpen && <span className="studio-kicker">Space & echo</span>}
          <button aria-expanded={isFxOpen} aria-controls="studio-floating-fx-controls" onClick={() => setIsFxOpen(!isFxOpen)}>{isFxOpen ? 'Hide FX' : 'FX unit'}</button>
        </div>
        <div className="studio-effects" id="studio-floating-fx-controls" hidden={!isFxOpen}>
          <label><span>Delay<output>{Math.round(controls.delay * 100)}%</output></span><input aria-label="Studio delay" type="range" min="0" max="0.8" step="0.01" value={controls.delay} onChange={(event) => change('delay', Number(event.target.value))} /></label>
          <label><span>Reverb<output>{Math.round(controls.reverb * 100)}%</output></span><input aria-label="Studio reverb" type="range" min="0" max="0.8" step="0.01" value={controls.reverb} onChange={(event) => change('reverb', Number(event.target.value))} /></label>
        </div>
      </aside>
    </main>
  )
}
