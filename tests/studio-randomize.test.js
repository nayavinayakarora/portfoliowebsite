import test from 'node:test'
import assert from 'node:assert/strict'
import { randomGrains, randomSequence, randomSynth } from '../src/studioRandomize.js'
import { SEQUENCE_SCALES } from '../src/studioSequences.js'

test('random patches vary without changing volume or shared effects', () => {
  for (let i = 0; i < 200; i += 1) {
    const synth = randomSynth()
    const grains = randomGrains()
    assert.ok(synth.cutoff >= 250 && synth.cutoff <= 9000)
    assert.ok(synth.attack >= 0.008 && synth.attack <= 0.7)
    assert.ok(synth.resonance >= 0.3 && synth.resonance <= 3.5)
    assert.ok(grains.grainSize >= 0.008 && grains.grainSize <= 0.18)
    assert.ok(grains.density >= 8 && grains.density <= 48)
    assert.ok(grains.position >= 0.05 && grains.position <= 0.95)
    for (const patch of [synth, grains]) {
      for (const untouched of ['synthLevel', 'grainLevel', 'delay', 'reverb']) {
        assert.equal(Object.hasOwn(patch, untouched), false)
      }
    }
  }
  assert.notDeepEqual(randomSynth(() => 0.1), randomSynth(() => 0.9))
  assert.notDeepEqual(randomGrains(() => 0.1), randomGrains(() => 0.9))
})

test('random phrases keep length, fit every key and scale, and contain notes', () => {
  for (const [scale, degrees] of Object.entries(SEQUENCE_SCALES)) {
    for (let root = 0; root < 12; root += 1) {
      for (const length of [8, 16, 32]) {
        const previous = Array(length).fill(null)
        const notes = randomSequence(previous, root, scale)
        assert.equal(notes.length, length)
        assert.ok(notes.some((note) => note !== null))
        assert.notDeepEqual(notes, previous)
        for (const note of notes.filter((note) => note !== null)) {
          assert.ok(note >= 24 && note <= 83)
          assert.ok(degrees.includes((note - root) % 12))
        }
      }
    }
  }
})

test('even repeated random input produces a changed phrase', () => {
  const previous = randomSequence(Array(16).fill(null), 0, 'Minor', () => 0.5)
  assert.notDeepEqual(randomSequence(previous, 0, 'Minor', () => 0.5), previous)
})
