const SILVER = ['#b4bdba', '#dce4df', '#f0d9b4', '#c9d2ce', '#b3b9b7']

// Two-pixel cells keep the CD's rim stepped, rather than a smooth SVG circle.
export const CD_CURSOR_PIXELS = Array.from({ length: 17 * 17 }, (_, index) => {
  const x = index % 17
  const y = Math.floor(index / 17)
  const radius = Math.hypot(x - 8, y - 8)
  if (radius > 7.8 || radius < 2.7) return null
  if (radius > 7) return { x: x * 2, y: y * 2, colour: '#fff8df', opacity: 0.95, kind: 'rim' }
  if (radius > 6.4 || radius < 3.3) return { x: x * 2, y: y * 2, colour: '#28242a', opacity: 0.9, kind: 'rim' }
  return { x: x * 2, y: y * 2, colour: SILVER[Math.floor((x + y) / 3) % SILVER.length], opacity: 0.55, kind: 'silver' }
}).filter(Boolean)
