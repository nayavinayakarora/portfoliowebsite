import test from 'node:test'
import assert from 'node:assert/strict'
import { CD_CURSOR_PIXELS } from '../src/components/discCursorArt.js'

test('pixel CD has a translucent silver body, a contrasting rim, and an open centre', () => {
  assert.ok(CD_CURSOR_PIXELS.length > 100)
  assert.ok(CD_CURSOR_PIXELS.every(pixel => pixel.x % 2 === 0 && pixel.y % 2 === 0))
  assert.ok(CD_CURSOR_PIXELS.every(pixel => pixel.x >= 0 && pixel.x <= 32 && pixel.y >= 0 && pixel.y <= 32))
  assert.ok(CD_CURSOR_PIXELS.filter(pixel => pixel.kind === 'silver').every(pixel => pixel.opacity === 0.55))
  assert.ok(CD_CURSOR_PIXELS.filter(pixel => pixel.kind === 'rim').every(pixel => pixel.opacity >= 0.9))
  assert.ok(!CD_CURSOR_PIXELS.some(pixel => pixel.x === 16 && pixel.y === 16), 'the dot has its own clear centre')
})
