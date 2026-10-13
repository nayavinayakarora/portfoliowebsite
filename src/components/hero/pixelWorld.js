export function portalVisible(interaction, now) {
  if (interaction.failed || interaction.focused || interaction.hovered) return true
  return now - interaction.lastAt < (interaction.touch ? 4500 : 2200)
}

export function studioPixelOpacity(pixel, portal, exposure) {
  if (!portal || exposure <= 0 || pixel.part.startsWith('hand-') || pixel.part === 'record-left') return 1
  const margin = portal.width * 0.06
  const edgeDistance = Math.min(pixel.x - portal.x + margin, portal.x + portal.width + margin - pixel.x, pixel.y - portal.y + margin, portal.y + portal.width * 16 / 44 + margin - pixel.y)
  if (edgeDistance <= 0) return 1
  // A translucent window feathers back to solid pixels, without a noisy speckled mask.
  const clearance = Math.min(1, edgeDistance / margin)
  return 1 - Math.min(1, exposure) * clearance * 0.75
}

export function recordHandScratch(time, reduced = false) {
  if (reduced) return 0
  const phase = time % 2.4
  // Push and pull across the platter, easing into a pause between scratch gestures.
  return phase < 1.2 ? 3.5 * Math.sin(phase / 1.2 * Math.PI * 2) * Math.sin(phase / 1.2 * Math.PI) : 0
}

export function drawPixelWorld(ctx, width, height, { time, dark, mobile }) {
  const grid = mobile ? 5 : 8
  const rect = (x, y, w, h, colour) => {
    ctx.fillStyle = colour
    ctx.fillRect(Math.round(x / grid) * grid, Math.round(y / grid) * grid, Math.ceil(w / grid) * grid, Math.ceil(h / grid) * grid)
  }
  const cloud = (x, y, scale) => {
    const colour = dark ? '#26231b' : '#fff8df'
    const u = grid * scale
    rect(x, y + u * 2, u * 14, u * 2, colour)
    rect(x + u * 2, y + u, u * 9, u * 2, colour)
    rect(x + u * 4, y, u * 4, u * 2, colour)
  }
  const drift = Math.sin(time * 0.12) * grid * 2
  cloud(width * 0.04 + drift, height * 0.05, mobile ? 1.3 : 1.8)
  cloud(width * 0.76 - drift, height * 0.08, mobile ? 0.9 : 1.2)
  cloud(width * 0.44 + drift, height * 0.39, mobile ? 0.6 : 0.9)
  const sun = dark ? '#916236' : '#ffd396'
  rect(width * 0.87, height * 0.21, grid * 8, grid * 6, sun)
  rect(width * 0.87 + grid, height * 0.21 - grid, grid * 6, grid * 8, sun)
  const floor = height - grid * 4
  rect(0, floor - grid, width, grid, dark ? '#c39a64' : '#9c7145')
  rect(0, floor, width, height - floor, dark ? '#292019' : '#c8a26a')
  for (let x = 0; x < width; x += grid * 9) {
    rect(x, floor + grid, grid * 8, grid, dark ? '#3d3024' : '#e1bb82')
    rect(x + grid * 3, floor + grid * 3, grid * 8, grid, dark ? '#3d3024' : '#e1bb82')
  }
  for (let i = 0; i < 11; i += 1) {
    const x = width * (0.03 + i * 0.097)
    const y = floor - grid * (1 + (i % 3))
    rect(x, y, grid, floor - y, dark ? '#655239' : '#b78e58')
    rect(x + grid * 2, y + grid, grid, floor - y - grid, dark ? '#655239' : '#b78e58')
  }
  // Small musical-note sprites float above the performer, not over the copy.
  for (let i = 0; i < 3; i += 1) {
    const x = width * (mobile ? 0.70 + i * 0.09 : 0.63 + i * 0.13)
    const y = height * (mobile ? 0.54 : 0.16 + i * 0.06) + Math.sin(time + i * 2) * grid
    rect(x, y, grid, grid * 3, dark ? '#ad8753' : '#ae704d')
    rect(x - grid, y + grid * 2, grid * 2, grid, dark ? '#ad8753' : '#ae704d')
    rect(x, y, grid * 2, grid, dark ? '#ad8753' : '#ae704d')
  }
}
