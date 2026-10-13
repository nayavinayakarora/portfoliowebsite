export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
export const noteName = (midi) => `${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`
export const SEQUENCE_SCALES = {
  Minor: [0, 2, 3, 5, 7, 8, 10],
  Major: [0, 2, 4, 5, 7, 9, 11],
  Dorian: [0, 2, 3, 5, 7, 9, 10],
  Pentatonic: [0, 3, 5, 7, 10],
  Chromatic: Array.from({ length: 12 }, (_, index) => index),
}
export const SEQUENCE_PATTERNS = {
  'Night drive': [0, null, 4, 7, 2, null, 6, 4, 0, 7, null, 9, 6, 4, 2, null],
  'Slow orbit': [0, null, null, 4, null, 7, null, null, 2, null, 6, null, 4, null, null, 7],
  'Broken pulse': [0, 0, null, 4, null, 7, 2, null, 0, null, 6, 6, 4, null, 2, 7],
  'Up the stairs': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
  'Coming down': [14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0, null],
  'Octave bounce': [0, 7, 0, 7, 2, 9, 2, 9, 4, 11, 4, 11, 6, 13, 4, 11],
  'Wide angles': [0, 9, null, 4, 12, null, 2, 7, 0, 11, 4, null, 9, 6, null, 2],
  'Offbeat steps': [null, 0, null, 4, null, 7, null, 2, null, 6, null, 4, null, 9, null, 7],
}

export function makeSequence(pattern = 'Night drive', root = 0, scale = 'Minor', length = 16) {
  const degrees = SEQUENCE_SCALES[scale] || SEQUENCE_SCALES.Minor
  const phrase = SEQUENCE_PATTERNS[pattern] || SEQUENCE_PATTERNS['Night drive']
  return Array.from({ length }, (_, index) => {
    const degree = phrase[index % phrase.length]
    if (degree === null) return null
    return Math.min(83, 48 + root + degrees[degree % degrees.length] + Math.floor(degree / degrees.length) * 12)
  })
}

export const DEFAULT_SEQUENCE = {
  notes: makeSequence(), bpm: 110, swing: 0.08, gate: 0.65, octave: 0,
}
