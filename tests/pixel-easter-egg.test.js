import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createPixelCharacter } from '../src/components/hero/pixelCharacter.js'
import { pixelLayout } from '../src/components/hero/pixelPortrait.js'
import { SHOE_GREETING, SHOE_GREETING_PIXELS, drawShoeGreeting, shoeGreetingLayout, touchingShoeGreeting } from '../src/components/hero/pixelEasterEgg.js'

test('the greeting is tiny pixel lettering confined to the screen-right shoe', () => {
  assert.equal(SHOE_GREETING, 'Hi Ambar!')
  assert.ok(SHOE_GREETING_PIXELS.length > 40)
  const shoePixels = createPixelCharacter().filter(pixel => pixel.part === 'shoe-right')
  assert.equal(shoePixels.length, 51)
  assert.ok(shoePixels.every(pixel => pixel.u * 128 >= 72 && pixel.u * 128 < 89 && pixel.v * 128 >= 124))
  for (const [width, height] of [[1440, 768], [390, 744]]) {
    const shoe = shoeGreetingLayout(pixelLayout(width, height))
    const cells = []
    drawShoeGreeting({ fillRect: (...args) => cells.push(args) }, shoe)
    assert.ok(cells.every(([x, y, w, h]) => x >= shoe.x && x + w <= shoe.x + shoe.width && y >= shoe.y && y + h <= shoe.y + shoe.height))
    const letters = cells
    const letteringWidth = Math.max(...letters.map(([x, , w]) => x + w)) - Math.min(...letters.map(([x]) => x))
    assert.ok(letteringWidth > shoe.width * 0.65 && letteringWidth <= shoe.width * 0.73, 'larger lettering remains inside the shoe')
    assert.equal(cells.length, SHOE_GREETING_PIXELS.length, 'only letter pixels are painted, with no background rectangle')
  }
})

test('the shoe hotspot stays local, but lettering is always drawn without interaction or a timer', () => {
  const shoe = { x: 200, y: 500, width: 60, height: 12 }
  assert.equal(touchingShoeGreeting({ active: true, x: 230, y: 506 }, shoe), true)
  assert.equal(touchingShoeGreeting({ active: false, x: 230, y: 506 }, shoe), false)
  assert.equal(touchingShoeGreeting({ active: true, x: 230, y: 200 }, shoe), false)
  assert.equal(touchingShoeGreeting({ active: true, x: 230, y: 490 }, shoe), false)
  const cells = []
  drawShoeGreeting({ fillRect: (...args) => cells.push(args) }, shoe)
  assert.equal(cells.length, SHOE_GREETING_PIXELS.length)
})

test('the greeting sits behind opaque shoe pixels, with no timed reveal or label backing', async () => {
  const shoe = { x: 72, y: 124, width: 17, height: 3 }
  for (const dark of [false, true]) {
    const cells = []
    const ctx = { fillRect: (...args) => cells.push(args) }
    drawShoeGreeting(ctx, shoe, dark)
    assert.equal(cells.length, SHOE_GREETING_PIXELS.length)
    assert.equal(ctx.fillStyle, dark ? '#dfb778' : '#795132')
    assert.equal(ctx.globalAlpha, 1)
  }
  const source = await readFile(new URL('../src/components/hero/PixelHero.jsx', import.meta.url), 'utf8')
  assert.ok(source.indexOf('drawShoeGreeting(ctx, shoe') < source.indexOf('for (const pixel of pixels)'))
  assert.doesNotMatch(source, /shoeSecret|shoeTarget|shoeGreetingOpacity/)
})
