import { SEQUENCE_SCALES } from './studioSequences.js'

const pick = (values, random) => values[Math.floor(random() * values.length)]
const between = (min, max, random) => min + random() * (max - min)
const rounded = (value, places = 2) => Number(value.toFixed(places))

export function randomSynth(random = Math.random) {
  return {
    waveform: pick(['sine', 'triangle', 'sawtooth', 'square'], random),
    cutoff: Math.round(Math.exp(between(Math.log(250), Math.log(9000), random))),
    resonance: rounded(between(0.3, 3.5, random)),
    detune: Math.round(between(0, 24, random)),
    attack: rounded(between(0.008, 0.7, random), 3),
    release: rounded(between(0.12, 1.8, random)),
  }
}

export function randomGrains(random = Math.random) {
  return {
    position: rounded(between(0.05, 0.95, random)),
    grainSize: rounded(Math.exp(between(Math.log(0.008), Math.log(0.18), random)), 3),
    density: Math.round(between(8, 48, random)),
    spray: rounded(between(0.02, 0.4, random)),
    pitch: pick([-12, -7, -5, 0, 5, 7, 12], random),
    texture: rounded(between(0.35, 1, random)),
    reverse: random() < 0.5,
  }
}

export function randomSequence(previous, root, scale, random = Math.random) {
  const degrees = SEQUENCE_SCALES[scale] || SEQUENCE_SCALES.Minor
  const pool = [0, 12].flatMap((octave) => degrees.map((degree) => 48 + root + octave + degree))
  let degree = Math.floor(random() * degrees.length)
  const notes = previous.map((_, index) => {
    if (index > 0 && random() < 0.24) return null
    // Nearby scale steps create a phrase rather than unrelated notes.
    degree = Math.max(0, Math.min(pool.length - 1, degree + pick([-2, -1, 0, 1, 2, 4], random)))
    return pool[degree]
  })
  if (notes.every((note, index) => note === previous[index])) {
    notes[0] = pool[(pool.indexOf(notes[0]) + 1) % pool.length]
  }
  return notes
}
