import test from 'node:test'
import assert from 'node:assert/strict'
import { createPixelPet, pixelPetLayout, pixelPetMotion, drawPixelPets, PET_WIDTH, PET_HEIGHT } from '../src/components/hero/pixelPets.js'
import { pixelLayout } from '../src/components/hero/pixelPortrait.js'

test('hand-authored pets retain the reference markings on bounded, deterministic pixel grids', () => {
  for (const kind of ['beagle', 'cat']) {
    const pixels = createPixelPet(kind)
    assert.ok(pixels.length > 200 && pixels.length < 2500)
    assert.ok(pixels.every(pixel => Number.isInteger(pixel.x) && Number.isInteger(pixel.y) && pixel.x >= 0 && pixel.x < PET_WIDTH && pixel.y >= 0 && pixel.y < PET_HEIGHT))
    assert.deepEqual(createPixelPet(kind), pixels)
    for (const part of ['body', 'head', 'paws', 'tail']) assert.ok(pixels.some(pixel => pixel.part === `${kind}-${part}`))
  }
  const beagle = createPixelPet('beagle')
  for (const colour of ['#2c262a', '#b67a46', '#f4e9d6']) assert.ok(beagle.some(pixel => pixel.part === 'beagle-body' && pixel.colour === colour))
  assert.ok(beagle.some(pixel => pixel.part === 'beagle-head' && pixel.x === 30 && pixel.y === 7 && pixel.colour === '#f4e9d6'), 'the face has a white blaze')
  const cat = createPixelPet('cat')
  assert.ok(cat.some(pixel => pixel.part === 'cat-body' && pixel.colour === '#4c3e34'), 'the white cat has striped tabby patches')
  const tail = cat.filter(pixel => pixel.part === 'cat-tail')
  assert.equal(tail.length, 9)
  assert.equal(Math.max(...tail.map(pixel => pixel.x)) - Math.min(...tail.map(pixel => pixel.x)) + 1, 3)
  assert.equal(Math.max(...tail.map(pixel => pixel.y)) - Math.min(...tail.map(pixel => pixel.y)) + 1, 3)
})

test('pets fit desktop, tablet, and phone frames without entering the mobile controls area', () => {
  for (const [width, height] of [[320,704],[375,748],[390,748],[631,784],[760,768],[900,768],[1100,768],[1373,768]]) {
    const character = pixelLayout(width, height)
    const layout = pixelPetLayout(width, height, character, width < 760 ? width * 0.6 : Math.min(330, width * 0.4))
    assert.ok(layout.left >= 0 && layout.top >= 0)
    assert.ok(layout.catLeft + PET_WIDTH * layout.unit <= width)
    assert.ok(layout.top + (PET_HEIGHT - 1) * layout.unit <= height)
    if (width < 760) assert.ok(layout.catLeft + PET_WIDTH * layout.unit < width * 0.5)
  }
})

test('pets bob and nod with stationary paws, and reduced motion freezes every frame', () => {
  for (const part of ['beagle-head','beagle-body','beagle-ears','beagle-tail','cat-head','cat-body','cat-tail']) assert.deepEqual(pixelPetMotion(part, 0.7, 3, true), { x: 0, y: 0 })
  assert.deepEqual(pixelPetMotion('cat-paws', 0.7, 3), { x: 0, y: 0 })
  assert.notDeepEqual(pixelPetMotion('beagle-head', 0, 3), pixelPetMotion('beagle-head', 0.7, 3))
  const sprites = { beagle: createPixelPet('beagle'), cat: createPixelPet('cat') }
  const layout = pixelPetLayout(1373, 768, pixelLayout(1373, 768))
  const render = (time, reduced) => {
    const rects = []
    const ctx = { fillStyle: '', fillRect(...args) { rects.push([...args, this.fillStyle]) } }
    drawPixelPets(ctx, sprites, layout, time, reduced, false)
    return rects
  }
  assert.deepEqual(render(0, true), render(5, true))
  assert.notDeepEqual(render(0, false), render(0.7, false))
})
