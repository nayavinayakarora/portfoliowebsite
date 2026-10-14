import { SPRITE_SIZE } from './pixelCharacter.js'

const GLYPHS = {
  H: ['101', '101', '111', '101', '101'],
  A: ['010', '101', '111', '101', '101'],
  i: ['1', '0', '1', '1', '1'],
  ' ': ['00', '00', '00', '00', '00'],
  a: ['000', '110', '011', '101', '111'],
  m: ['00000', '11010', '10101', '10101', '10101'],
  b: ['100', '100', '110', '101', '110'],
  r: ['000', '110', '101', '100', '100'],
  '!': ['1', '1', '1', '0', '1'],
}

export const SHOE_GREETING = 'Hi Ambar!'
let cursor = 0
export const SHOE_GREETING_PIXELS = [...SHOE_GREETING].flatMap((letter) => {
  const rows = GLYPHS[letter]
  const left = cursor
  cursor += rows[0].length + 1
  return rows.flatMap((row, y) => [...row].flatMap((value, x) => value === '1' ? [[left + x, y]] : []))
})
const GREETING_WIDTH = cursor - 1

export function shoeGreetingLayout(character, scroll = 0, time = 0) {
  const unit = character.size / SPRITE_SIZE
  return {
    x: character.left + 72 * unit + Math.sin(time * 0.9) * 0.6,
    y: character.top + 124 * unit - scroll * 20,
    width: 17 * unit,
    height: 3 * unit,
  }
}

export function touchingShoeGreeting(pointer, shoe) {
  const margin = Math.max(3, shoe.height * 0.25)
  return pointer.active && pointer.x >= shoe.x - margin && pointer.x <= shoe.x + shoe.width + margin
    && pointer.y >= shoe.y - margin && pointer.y <= shoe.y + shoe.height + margin
}

export function drawShoeGreeting(ctx, shoe, dark = false) {
  const cell = Math.min(shoe.width * 0.72 / GREETING_WIDTH, shoe.height * 0.72 / 5)
  const left = shoe.x + (shoe.width - GREETING_WIDTH * cell) / 2
  const top = shoe.y + (shoe.height - 5 * cell) / 2
  ctx.globalAlpha = 1
  ctx.fillStyle = dark ? '#dfb778' : '#795132'
  for (const [x, y] of SHOE_GREETING_PIXELS) {
    ctx.fillRect(left + x * cell, top + y * cell, cell, cell)
  }
  ctx.globalAlpha = 1
}
