export const PET_WIDTH = 44
export const PET_HEIGHT = 36

export function createPixelPet(kind) {
  if (kind !== 'beagle' && kind !== 'cat') throw new Error('Unknown pixel pet')
  const layers = []
  let cells
  let part
  const layer = (name) => { part = `${kind}-${name}`; cells = Array(PET_WIDTH * PET_HEIGHT).fill(null); layers.push(cells) }
  const c = { ink: '#342a29', white: '#f4e9d6', shade: '#d7c9b0', tan: '#b67a46', tanLight: '#d8a774', brown: '#795132', black: '#2c262a', tabby: '#8a7053', stripe: '#4c3e34', pink: '#cc9582' }
  const put = (x, y, colour) => {
    if (x >= 0 && x < PET_WIDTH && y >= 0 && y < PET_HEIGHT) cells[y * PET_WIDTH + x] = { colour, part }
  }
  const rect = (x, y, w, h, colour) => {
    for (let row = y; row < y + h; row += 1) for (let col = x; col < x + w; col += 1) put(col, row, colour)
  }
  const ellipse = (x, y, rx, ry, colour) => {
    for (let row = y - ry; row <= y + ry; row += 1) for (let col = x - rx; col <= x + rx; col += 1) {
      if (((col - x) / rx) ** 2 + ((row - y) / ry) ** 2 <= 1) put(col, row, colour)
    }
  }
  const polygon = (points, colour) => {
    for (let y = Math.min(...points.map(point => point[1])); y <= Math.max(...points.map(point => point[1])); y += 1) {
      for (let x = Math.min(...points.map(point => point[0])); x <= Math.max(...points.map(point => point[0])); x += 1) {
        let inside = false
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
          const [xi, yi] = points[i]; const [xj, yj] = points[j]
          if ((yi > y + 0.5) !== (yj > y + 0.5) && x + 0.5 < (xj - xi) * (y + 0.5 - yi) / (yj - yi) + xi) inside = !inside
        }
        if (inside) put(x, y, colour)
      }
    }
  }

  if (kind === 'beagle') {
    layer('tail')
    polygon([[7,25],[3,23],[0,17],[0,11],[3,12],[4,18],[9,22]], c.ink)
    rect(1, 12, 2, 5, c.white); rect(2, 17, 2, 5, c.tanLight)
    layer('body')
    ellipse(17, 24, 15, 9, c.ink); ellipse(17, 24, 13, 7, c.white)
    ellipse(10, 25, 7, 6, c.tan)
    polygon([[8,18],[17,16],[27,18],[29,24],[26,28],[17,29],[11,26]], c.black)
    rect(24, 22, 5, 9, c.tan); rect(28, 22, 3, 8, c.white)
    layer('paws')
    rect(8, 28, 6, 6, c.ink); rect(9, 28, 4, 5, c.white); rect(7, 33, 8, 2, c.ink); rect(8, 33, 6, 1, c.white)
    rect(24, 27, 5, 7, c.ink); rect(25, 27, 3, 6, c.white); rect(24, 33, 7, 2, c.ink); rect(25, 33, 5, 1, c.white)
    layer('head')
    ellipse(30, 11, 10, 10, c.ink); ellipse(30, 11, 8, 8, c.tan)
    polygon([[27,4],[31,3],[34,8],[33,15],[27,17],[28,10]], c.white)
    ellipse(34, 16, 8, 5, c.ink); ellipse(34, 16, 7, 4, c.white)
    rect(38, 13, 4, 3, c.black); rect(38, 13, 1, 1, c.shade)
    rect(25, 10, 2, 3, c.black); rect(34, 9, 2, 3, c.black)
    rect(25, 10, 1, 1, c.white); rect(34, 9, 1, 1, c.white)
    rect(33, 19, 4, 1, c.brown); rect(34, 20, 2, 2, c.pink)
    layer('ears')
    polygon([[23,5],[19,9],[20,18],[23,22],[26,20],[27,10]], c.ink)
    polygon([[23,7],[21,10],[22,18],[24,20],[25,18],[25,10]], c.brown)
    rect(22, 10, 1, 6, c.tan)
    polygon([[37,6],[40,8],[41,15],[39,19],[37,17],[36,9]], c.ink)
    rect(38, 9, 2, 7, c.brown)
  } else {
    // The reference cat has a bobtail: only a three-by-three-pixel stump.
    layer('tail')
    rect(39, 20, 3, 3, c.tabby); rect(39, 22, 2, 1, c.stripe)
    layer('body')
    ellipse(25, 23, 15, 8, c.ink); ellipse(25, 23, 13, 6, c.white)
    rect(11, 18, 8, 11, c.white)
    polygon([[18,18],[23,17],[26,20],[25,25],[23,28],[18,26]], c.tabby)
    polygon([[30,18],[35,18],[38,22],[36,28],[31,29],[28,25]], c.tabby)
    for (const x of [19, 23, 31, 35]) {
      rect(x, 20, 1, 3, c.stripe); rect(x + 1, 23, 1, 3, c.stripe)
    }
    layer('paws')
    for (const [x, y] of [[12,27],[17,28],[29,28],[35,27]]) {
      rect(x, y, 4, 7, c.ink); rect(x + 1, y, 2, 6, c.white)
      rect(x - 1, 33, 6, 2, c.ink); rect(x, 33, 4, 1, c.white)
    }
    layer('head')
    polygon([[2,12],[3,5],[10,9],[16,9],[19,6],[22,12],[18,21],[7,21]], c.ink)
    polygon([[4,12],[4,8],[10,11],[15,11],[18,9],[20,13],[17,19],[7,19]], c.tabby)
    rect(5, 9, 1, 2, c.pink); rect(18, 10, 1, 2, c.pink)
    polygon([[10,9],[13,9],[14,14],[18,17],[16,21],[7,21],[5,17],[10,14]], c.white)
    rect(6, 11, 1, 3, c.stripe); rect(8, 10, 1, 3, c.stripe); rect(15, 10, 1, 3, c.stripe)
    rect(7, 14, 2, 2, c.black); rect(15, 14, 2, 2, c.black)
    rect(11, 17, 2, 1, c.pink); rect(11, 18, 1, 2, c.stripe)
    rect(5, 18, 3, 1, c.shade); rect(16, 18, 3, 1, c.shade)
  }
  return layers.flatMap(layerCells => layerCells.flatMap((cell, index) => cell ? [{ ...cell, x: index % PET_WIDTH, y: Math.floor(index / PET_WIDTH) }] : []))
}

export function pixelPetLayout(width, height, character, instructionRight = width * 0.24) {
  const mobile = width < 760
  let unit = mobile ? Math.min(1.6, width / 250) : Math.min(3.1, width / 500)
  const gap = mobile ? 12 : 16
  const portalLeft = character.left + character.size * 0.35
  if (!mobile) unit = Math.min(unit, Math.max(0.9, (portalLeft - instructionRight - gap - 28) / (PET_WIDTH * 2)))
  const packWidth = PET_WIDTH * unit * 2 + gap
  const left = mobile ? width * 0.04 : Math.max(instructionRight + 12, character.left - packWidth - 16)
  const base = height - (mobile ? 5 : 8) * 5
  return { unit, left: Math.max(0, Math.min(left, width - packWidth)), catLeft: Math.max(0, Math.min(left, width - packWidth)) + PET_WIDTH * unit + gap, top: base - (PET_HEIGHT - 1) * unit, base }
}

export function pixelPetMotion(part, time, unit, reduced = false) {
  if (reduced || part.endsWith('paws')) return { x: 0, y: 0 }
  const phase = part.startsWith('cat-') ? 0.7 : 0
  const bob = -Math.max(0, Math.sin(time * 3.4 + phase)) * unit * 0.55
  if (part === 'beagle-tail') return { x: Math.sin(time * 5) * unit, y: bob }
  if (part === 'cat-tail') return { x: Math.sin(time * 3.4) * unit * 0.12, y: bob }
  const head = part.endsWith('head') || part.endsWith('ears')
  return { x: part.endsWith('ears') ? Math.sin(time * 3.4) * unit * 0.35 : 0, y: bob + (head ? Math.sin(time * 3.4 + phase + 0.4) * unit * 0.9 : 0) }
}

export function drawPixelPets(ctx, sprites, layout, time, reduced, dark) {
  const unit = layout.unit
  for (const [kind, left] of [['beagle', layout.left], ['cat', layout.catLeft]]) {
    ctx.fillStyle = dark ? '#29231c' : '#c1a071'
    ctx.fillRect(Math.round(left + unit * 5), Math.round(layout.base), Math.round(unit * 32), Math.max(2, Math.round(unit)))
    const motion = {}
    for (const pixel of sprites[kind]) {
      const offset = motion[pixel.part] ??= pixelPetMotion(pixel.part, time, unit, reduced)
      ctx.fillStyle = pixel.colour
      ctx.fillRect(Math.round(left + pixel.x * unit + offset.x), Math.round(layout.top + pixel.y * unit + offset.y), Math.ceil(unit), Math.ceil(unit))
    }
  }
}
