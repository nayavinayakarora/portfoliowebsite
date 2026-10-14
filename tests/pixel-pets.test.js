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

test('the beagle retains two eyes under its shades and an unobstructed nose', () => {
  const cells = new Map(createPixelPet('beagle').filter(pixel => !pixel.part.endsWith('shades')).map(pixel => [`${pixel.x},${pixel.y}`, pixel]))
  for (const x of [28, 34]) {
    assert.equal(cells.get(`${x},10`).colour, '#f4e9d6')
    assert.equal(cells.get(`${x + 1},11`).colour, '#2c262a')
    assert.equal(cells.get(`${x + 1},11`).part, 'beagle-head')
  }
  assert.equal(cells.get('38,14').colour, '#2c262a')
  assert.equal(cells.get('38,14').part, 'beagle-head')
})

test('both pets wear two-lens shades that follow the head nod exactly', () => {
  for (const [kind, lenses] of [['beagle', [27, 34]], ['cat', [6, 14]]]) {
    const pixels = createPixelPet(kind)
    const glasses = pixels.filter(pixel => pixel.part === `${kind}-shades`)
    const cells = new Map(glasses.map(pixel => [`${pixel.x},${pixel.y}`, pixel]))
    const eyeY = kind === 'beagle' ? 10 : 13
    for (const x of lenses) assert.equal(cells.get(`${x},${eyeY}`).colour, '#91958b')
    assert.ok(glasses.some(pixel => pixel.colour === '#343b40'))
    assert.ok(pixels.indexOf(glasses[0]) > pixels.findLastIndex(pixel => pixel.part === `${kind}-head`))
    for (const time of [0, 0.8, 2.1]) {
      assert.deepEqual(pixelPetMotion(`${kind}-shades`, time, 3), pixelPetMotion(`${kind}-head`, time, 3))
      assert.deepEqual(pixelPetMotion(`${kind}-shades`, time, 3, true), { x: 0, y: 0 })
    }
  }
})

test('pets are a little larger, with a distinct head nod rather than a whole-body float', () => {
  const desktop = pixelPetLayout(1373, 768, pixelLayout(1373, 768))
  assert.ok(desktop.unit > 1373 / 500)
  const phone = pixelPetLayout(390, 748, pixelLayout(390, 748), 234)
  assert.ok(phone.unit > 390 / 250)
  for (const kind of ['beagle', 'cat']) {
    const nod = pixelPetMotion(`${kind}-head`, 0.8, 3)
    const body = pixelPetMotion(`${kind}-body`, 0.8, 3)
    assert.ok(nod.y - body.y > 4)
    assert.notEqual(nod.x, body.x)
    assert.deepEqual(pixelPetMotion(`${kind}-paws`, 0.8, 3), { x: 0, y: 0 })
  }
})

test('pets bob and nod with stationary paws, and reduced motion freezes every frame', () => {
  for (const part of ['beagle-head','beagle-body','beagle-ears','beagle-tail','beagle-shades','cat-head','cat-body','cat-tail','cat-shades']) assert.deepEqual(pixelPetMotion(part, 0.7, 3, true), { x: 0, y: 0 })
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

test('hovering either pet scatters local pixels and leaving lets them settle back', () => {
  const layout = pixelPetLayout(1373, 768, pixelLayout(1373, 768))
  const ctx = { fillRect() {} }
  for (const kind of ['beagle', 'cat']) {
    const sprites = { beagle: createPixelPet('beagle'), cat: createPixelPet('cat') }
    const left = kind === 'beagle' ? layout.left : layout.catLeft
    const pointer = { active: true, x: left + 26 * layout.unit, y: layout.top + 14 * layout.unit }
    let hit
    for (let frame = 0; frame < 30; frame += 1) hit = drawPixelPets(ctx, sprites, layout, 0, false, false, { pointer })
    assert.ok(hit.touched > 4)
    assert.ok(hit.closest.part.startsWith(kind))
    assert.ok(sprites[kind].some(pixel => Math.hypot(pixel.dx, pixel.dy) > 3))
    const other = kind === 'cat' ? 'beagle' : 'cat'
    assert.ok(sprites[other].every(pixel => pixel.dx === 0 && pixel.dy === 0))
    pointer.active = false
    for (let frame = 0; frame < 160; frame += 1) drawPixelPets(ctx, sprites, layout, 0, false, false, { pointer })
    assert.ok(sprites[kind].every(pixel => Math.hypot(pixel.dx, pixel.dy) < 0.01))
  }
})

test('pet scatter respects reduced motion even with a pointer directly over the face', () => {
  const sprites = { beagle: createPixelPet('beagle'), cat: createPixelPet('cat') }
  const layout = pixelPetLayout(390, 748, pixelLayout(390, 748))
  const pointer = { active: true, x: layout.left + 28 * layout.unit, y: layout.top + 10 * layout.unit }
  const ctx = { fillRect() {} }
  for (let frame = 0; frame < 30; frame += 1) drawPixelPets(ctx, sprites, layout, 0, true, false, { pointer })
  assert.ok(Object.values(sprites).flat().every(pixel => pixel.dx === 0 && pixel.dy === 0))
})
