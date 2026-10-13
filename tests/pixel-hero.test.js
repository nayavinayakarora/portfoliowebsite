import test from 'node:test'
import assert from 'node:assert/strict'
import { PixelHeroAudio } from '../src/components/hero/pixelHeroAudio.js'
import { pixelColour, pixelLayout, PIXEL_PALETTE, PORTAL_PIXELS } from '../src/components/hero/pixelPortrait.js'
import { portalVisible, recordHandScratch, studioPixelOpacity } from '../src/components/hero/pixelWorld.js'
import { createPixelCharacter, SPRITE_SIZE } from '../src/components/hero/pixelCharacter.js'

test('hand-authored character has distinct decks, mixer, hands, and guitar on a bounded pixel grid', () => {
  const pixels = createPixelCharacter()
  const parts = new Set(pixels.map(pixel=>pixel.part))
  for (const part of ['head','body','hand-left','hand-right','record-left','record-right','console','mixer','meter','guitar','tabla','synth','patch-cable']) assert.ok(parts.has(part), part)
  assert.ok(pixels.length > 2000 && pixels.length < 10000)
  assert.ok(pixels.every(pixel=>pixel.u >= 0 && pixel.u < 1 && pixel.v >= 0 && pixel.v < 1))
  assert.ok(pixels.every(pixel=>Number.isInteger(pixel.u * SPRITE_SIZE) && Number.isInteger(pixel.v * SPRITE_SIZE)))
  assert.ok(pixels.filter(pixel=>pixel.part === 'record-left').length > 100)
  assert.ok(pixels.filter(pixel=>pixel.part === 'record-right').length > 100)
  assert.deepEqual(createPixelCharacter(), pixels, 'artwork is deterministic and uses no photo loading or generation')
})

test('pixel instrument props include two tabla heads and three coloured patch cables', () => {
  const pixels = createPixelCharacter()
  const at = (x, y) => pixels.find(pixel => pixel.u * SPRITE_SIZE === x && pixel.v * SPRITE_SIZE === y)
  for (const [x, y] of [[12, 73], [33, 72]]) {
    assert.equal(at(x, y).part, 'tabla')
    assert.equal(at(x, y).colour, '#28242a', 'both drums have a black syahi centre')
  }
  const colours = new Set(pixels.filter(pixel => pixel.part === 'patch-cable').map(pixel => pixel.colour))
  for (const colour of ['#e9b961', '#d87259', '#a5b57a']) assert.ok(colours.has(colour))
  assert.ok(pixels.filter(pixel => pixel.part === 'synth').length > 500)
})

test('studio portal hides after inactivity and stays usable for hover, keyboard, and touch', () => {
  const interaction = { lastAt: -Infinity, touch: false, hovered: false, focused: false, failed: false }
  assert.equal(portalVisible(interaction, 100), false)
  interaction.lastAt = 100
  assert.equal(portalVisible(interaction, 500), true)
  assert.equal(portalVisible(interaction, 1200), true)
  assert.equal(portalVisible(interaction, 2400), false)
  interaction.hovered = true
  assert.equal(portalVisible(interaction, 5000), true)
  interaction.hovered = false; interaction.focused = true
  assert.equal(portalVisible(interaction, 5000), true)
  interaction.focused = false; interaction.touch = true
  assert.equal(portalVisible(interaction, 4000), true)
  assert.equal(portalVisible(interaction, 4700), false)
  interaction.failed = true
  assert.equal(portalVisible(interaction, 9999), true)
})

test('studio reveal softens covering pixels but retains texture and the scratching record', () => {
  const portal = { x: 100, y: 200, width: 440 }
  const pixel = { x: 120, y: 220, part: 'console', seed: 1 }
  assert.equal(studioPixelOpacity(pixel, portal, 0), 1)
  assert.equal(studioPixelOpacity(pixel, portal, 1), 0.25)
  assert.ok(studioPixelOpacity({ ...pixel, x: 75 }, portal, 1) > 0.9, 'the edges feather back into solid pixels')
  for (const part of ['record-left', 'hand-left', 'hand-right']) assert.equal(studioPixelOpacity({ ...pixel, part }, portal, 1), 1)
  assert.equal(studioPixelOpacity({ ...pixel, x: 60 }, portal, 1), 1, 'the rest of the scene stays unchanged')
})

test('record hand pushes and pulls across the disc, pauses, and respects reduced motion', () => {
  assert.equal(recordHandScratch(0), 0)
  assert.ok(recordHandScratch(0.3) > 2, 'the forward stroke')
  assert.ok(recordHandScratch(0.9) < -2, 'the backward stroke')
  assert.equal(recordHandScratch(1.2), 0)
  assert.equal(recordHandScratch(1.8), 0)
  assert.ok(Math.abs(recordHandScratch(2.7) - recordHandScratch(0.3)) < 0.0001, 'the motion repeats')
  assert.equal(recordHandScratch(0.3, true), 0)
  const pixels = createPixelCharacter()
  assert.ok(pixels.some(pixel => pixel.part === 'arm-left'), 'the forearm follows the hand')
})

test('moving hands retain complete record and mixer pixels underneath, with hands painted last', () => {
  const pixels = createPixelCharacter()
  const layersAt = (x, y) => pixels.filter(pixel => pixel.u * SPRITE_SIZE === x && pixel.v * SPRITE_SIZE === y).map(pixel => pixel.part)
  assert.deepEqual(layersAt(28, 94), ['record-left', 'hand-left'])
  assert.deepEqual(layersAt(65, 92), ['mixer', 'hand-right'])
  const firstHand = pixels.findIndex(pixel => pixel.part.startsWith('hand-'))
  assert.ok(pixels.slice(firstHand).every(pixel => pixel.part.startsWith('hand-')), 'the foreground hands cannot be overwritten by later deck pixels')
  const underneath = new Set(pixels.slice(0, firstHand).map(pixel => `${pixel.u},${pixel.v}`))
  assert.ok(pixels.filter(pixel => pixel.part === 'hand-left').every(pixel => underneath.has(`${pixel.u},${pixel.v}`)), 'every moving hand pixel has a solid deck underneath')
})

test('character has a slim torso, a clean-shaven face, and headphones separate from the hair', () => {
  const pixels = createPixelCharacter()
  const at = (x, y) => pixels.find(pixel => pixel.u * SPRITE_SIZE === x && pixel.v * SPRITE_SIZE === y)
  const torso = pixels.filter(pixel => pixel.part === 'body' && pixel.v * SPRITE_SIZE === 84 && ['#ba5845', '#d46e52', '#853f38', '#f6deab'].includes(pixel.colour))
  assert.ok(torso.length > 20 && torso.length <= 26, 'the shirt has a narrow waist')
  assert.equal(at(65, 49).colour, '#dfa575', 'the chin is skin, not a beard')
  assert.equal(at(65, 5).colour, '#171b22', 'the dark band sits above the hair')
  for (const x of [45, 87]) assert.equal(at(x, 33).colour, '#e6a45c', 'both ear cups have matching accents')
  assert.ok(!pixels.some(pixel => pixel.part === 'head' && pixel.colour === '#a69c87'), 'no grey metal band that reads as hair')
})

test('character wears dark sunglasses with rounded lower corners, not clear prescription lenses', () => {
  const pixels = createPixelCharacter()
  const at = (x, y) => pixels.find(pixel => pixel.u * SPRITE_SIZE === x && pixel.v * SPRITE_SIZE === y)
  for (const x of [60, 77]) assert.equal(at(x, 36).colour, '#24262b', 'both lenses are opaque charcoal')
  assert.equal(at(67, 32).colour, '#141318', 'the lenses have a dark bridge')
  assert.equal(at(54, 40).colour, '#dfa575', 'the lower outer corner is rounded back to the face')
  assert.equal(at(56, 33).colour, '#53565a', 'the reflection stays dark rather than showing an eye')
})

test('pixel scene fits desktop and phone without enlarging the portrait past the frame', () => {
  for (const [width, height] of [[375,848],[390,848],[631,848],[1373,768]]) {
    const layout = pixelLayout(width, height)
    assert.ok(layout.left >= 0)
    assert.ok(layout.left + layout.size <= width)
    assert.ok(layout.top >= 0)
    assert.ok(layout.top + layout.size <= height)
    assert.ok(layout.resolution <= 160)
  }
  for (const value of [0,50,100,150,200,255]) assert.ok(PIXEL_PALETTE.includes(pixelColour(value,value,value)))
  assert.ok(PORTAL_PIXELS.length > 100)
  assert.ok(PORTAL_PIXELS.every(([x,y]) => x >= 0 && x < 44 && y >= 0 && y < 16))
})

class Param {
  value = 0
  setTargetAtTime(value) { this.value = value }
  setValueAtTime(value) { this.value = value }
  linearRampToValueAtTime(value) { this.value = value }
  exponentialRampToValueAtTime(value) { this.value = value }
}
const node = (properties = {}) => ({ connect() { return this }, disconnect() {}, ...properties })
class TestContext {
  currentTime = 0
  state = 'running'
  destination = {}
  oscillators = []
  createGain() { return node({ gain: new Param() }) }
  createDynamicsCompressor() { return node(Object.fromEntries(['threshold','knee','ratio','attack','release'].map(key=>[key,new Param()]))) }
  createOscillator() { const oscillator = node({ frequency: new Param(), start() {}, stop() { this.stopped = true } }); this.oscillators.push(oscillator); return oscillator }
  async close() { this.state = 'closed' }
}

test('pixel sounds require a gesture unlock, respect mute, and limit overlapping voices', async () => {
  const previousWindow = globalThis.window
  globalThis.window = { AudioContext: TestContext }
  const audio = new PixelHeroAudio()
  try {
    audio.play(0.5,0.5)
    assert.equal(audio.context, null)
    await audio.unlock()
    audio.play(0.5,0.5)
    assert.equal(audio.context.oscillators.length, 1)
    audio.play(0.6,0.5)
    assert.equal(audio.context.oscillators.length, 1, 'brush events are rate limited')
    audio.setEnabled(false)
    audio.context.currentTime = 0.2
    audio.play(0.5,0.5)
    assert.equal(audio.context.oscillators.length, 1)
    assert.equal(audio.master.gain.value, 0)
    audio.setEnabled(true)
    for (let i=1; i<20; i+=1) { audio.context.currentTime=i*0.2; audio.play(0.5,0.5) }
    assert.equal(audio.voices.size, 6)
    assert.equal(audio.context.oscillators.length, 6)
    audio.dispose()
    assert.equal(audio.context.state, 'closed')
    assert.ok(audio.context.oscillators.every(oscillator=>oscillator.stopped))
  } finally { audio.dispose(); globalThis.window = previousWindow }
})
