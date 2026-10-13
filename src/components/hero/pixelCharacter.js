export const SPRITE_SIZE = 128

export function createPixelCharacter() {
  const cells = Array(SPRITE_SIZE * SPRITE_SIZE).fill(null)
  let paintLayer = cells
  const c = {
    ink: '#28242a', hair: '#352f33', hairLight: '#51433c', skin: '#dfa575', skinLight: '#f2c394', skinShade: '#b87853',
    shirt: '#ba5845', shirtLight: '#d46e52', shirtShade: '#853f38', cream: '#f6deab', metal: '#a69c87',
    deck: '#494344', darkDeck: '#302c32', groove: '#6c6054', led: '#a5b57a', gold: '#c39461',
    headphones: '#171b22', headphonePad: '#3a3034', headphoneAccent: '#e6a45c',
    wood: '#9d613e', woodLight: '#ce9160', cableAmber: '#e9b961', cableCoral: '#d87259', cableGreen: '#a5b57a',
    shadeFrame: '#141318', shadeLens: '#24262b', shadeReflection: '#53565a',
  }
  let part = 'body'
  const put = (x, y, colour) => {
    if (x >= 0 && y >= 0 && x < SPRITE_SIZE && y < SPRITE_SIZE) paintLayer[y * SPRITE_SIZE + x] = { colour, part }
  }
  const rect = (x, y, width, height, colour) => {
    for (let row = y; row < y + height; row += 1) for (let col = x; col < x + width; col += 1) put(col, row, colour)
  }
  const ellipse = (x, y, rx, ry, colour) => {
    for (let row = Math.floor(y - ry); row <= y + ry; row += 1) {
      for (let col = Math.floor(x - rx); col <= x + rx; col += 1) {
        if (((col - x) / rx) ** 2 + ((row - y) / ry) ** 2 <= 1) put(col, row, colour)
      }
    }
  }
  const polygon = (points, colour) => {
    const minX = Math.min(...points.map(([x]) => x))
    const maxX = Math.max(...points.map(([x]) => x))
    const minY = Math.min(...points.map(([, y]) => y))
    const maxY = Math.max(...points.map(([, y]) => y))
    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        let inside = false
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
          const [xi, yi] = points[i]; const [xj, yj] = points[j]
          if ((yi > y + 0.5) !== (yj > y + 0.5) && x + 0.5 < (xj - xi) * (y + 0.5 - yi) / (yj - yi) + xi) inside = !inside
        }
        if (inside) put(x, y, colour)
      }
    }
  }
  const line = (x0, y0, x1, y1, colour, thickness = 1) => {
    const dx = Math.abs(x1 - x0); const dy = -Math.abs(y1 - y0)
    const sx = x0 < x1 ? 1 : -1; const sy = y0 < y1 ? 1 : -1
    let error = dx + dy
    while (true) {
      rect(x0, y0, thickness, thickness, colour)
      if (x0 === x1 && y0 === y1) break
      const twice = 2 * error
      if (twice >= dy) { error += dy; x0 += sx }
      if (twice <= dx) { error += dx; y0 += sy }
    }
  }

  // A wood-sided analogue synth: patch panel above a small, playable-looking keybed.
  part = 'synth'
  rect(2, 36, 41, 31, c.ink); rect(3, 37, 4, 29, c.wood); rect(38, 37, 4, 29, c.wood)
  rect(4, 38, 1, 26, c.woodLight); rect(7, 38, 31, 18, c.darkDeck)
  for (const x of [10, 18, 26, 34]) {
    rect(x - 1, 41, 4, 4, c.ink); rect(x, 41, 2, 2, c.metal); rect(x + 1, 41, 1, 1, c.cream)
    rect(x, 48, 2, 2, c.gold); rect(x, 52, 2, 2, c.ink)
  }
  rect(9, 46, 7, 1, c.groove); rect(25, 46, 10, 1, c.groove)
  rect(7, 57, 31, 9, c.ink)
  for (let key = 0; key < 10; key += 1) rect(8 + key * 3, 58, 2, 7, c.cream)
  for (const key of [0, 1, 3, 4, 5, 7, 8]) rect(9 + key * 3, 58, 2, 4, c.ink)
  rect(5, 67, 3, 19, c.ink); rect(37, 67, 3, 19, c.ink)
  part = 'patch-cable'
  const cable = (points, colour) => {
    for (let i = 1; i < points.length; i += 1) line(...points[i - 1], ...points[i], colour)
    for (const [x, y] of [points[0], points[points.length - 1]]) rect(x, y, 2, 2, c.cream)
  }
  cable([[10,49],[8,46],[8,32],[12,28],[19,28],[22,32],[22,46],[26,49]], c.cableAmber)
  cable([[18,49],[16,52],[12,52],[10,48],[10,34],[14,31],[23,31],[29,37],[34,49]], c.cableCoral)
  cable([[26,53],[29,55],[34,55],[36,52],[36,43],[32,39],[20,39],[18,42]], c.cableGreen)

  // The rounded metal bayan and narrower wooden dayan have distinct black syahi centres.
  part = 'tabla'
  ellipse(12, 83, 10, 3, c.ink)
  polygon([[2,73],[22,73],[21,82],[18,86],[7,86],[3,82]], c.ink)
  polygon([[4,75],[20,75],[19,82],[17,84],[8,84],[5,81]], c.metal)
  for (const x of [6, 10, 15, 18]) line(x, 75, x, 83, c.cream)
  ellipse(12, 74, 10, 4, c.ink); ellipse(12, 73, 9, 3, c.cream)
  ellipse(12, 73, 4, 2, c.ink); rect(11, 72, 2, 1, c.groove)
  polygon([[26,73],[40,73],[39,86],[27,86]], c.ink)
  rect(28, 75, 10, 10, c.wood)
  for (const x of [28, 31, 35, 38]) line(x, 75, x, 84, c.cream)
  rect(28, 79, 2, 2, c.gold); rect(35, 80, 2, 2, c.gold)
  ellipse(33, 73, 8, 4, c.ink); ellipse(33, 72, 7, 3, c.cream)
  ellipse(33, 72, 3, 2, c.ink); rect(32, 71, 2, 1, c.groove)

  // A guitar on a stand leaves both hands free for the decks.
  part = 'guitar'
  rect(107, 28, 10, 12, c.ink); rect(109, 29, 6, 10, c.gold)
  rect(105, 30, 2, 2, c.cream); rect(117, 33, 2, 2, c.cream); rect(105, 36, 2, 2, c.cream)
  rect(110, 39, 5, 32, c.ink); rect(111, 40, 3, 30, c.gold)
  polygon([[106,65],[111,61],[117,62],[122,67],[120,74],[117,77],[123,83],[124,89],[120,97],[108,98],[101,95],[98,89],[100,82],[105,77],[103,71]], c.ink)
  polygon([[107,66],[111,63],[116,64],[120,68],[118,74],[114,78],[121,84],[122,89],[118,95],[108,96],[103,93],[100,88],[102,83],[108,78],[105,71]], c.gold)
  ellipse(111, 80, 4, 5, c.cream); ellipse(111, 80, 3, 4, c.ink)
  rect(107, 90, 9, 2, c.ink); line(112, 31, 111, 91, c.cream)
  for (let y = 43; y < 68; y += 4) rect(111, y, 3, 1, c.ink)
  line(105, 100, 99, 125, c.ink, 2); line(119, 100, 125, 125, c.ink, 2)

  part = 'body'
  rect(53, 103, 13, 22, c.ink); rect(72, 103, 13, 22, c.ink)
  rect(51, 124, 16, 3, c.hair); rect(72, 124, 17, 3, c.hair)
  rect(60, 49, 14, 14, c.skinShade); rect(63, 50, 11, 10, c.skin)
  polygon([[57,56],[76,56],[83,65],[79,100],[51,100],[50,68]], c.ink)
  polygon([[57,59],[75,59],[79,67],[76,100],[54,100],[54,69]], c.shirt)
  polygon([[57,59],[60,59],[62,64],[71,64],[75,59],[77,64],[72,69],[62,69]], c.shirtShade)
  rect(54, 72, 2, 27, c.shirtLight); rect(76, 72, 2, 28, c.shirtShade)
  polygon([[55,60],[50,62],[39,76],[45,81],[61,69]], c.ink)
  polygon([[55,63],[51,65],[42,75],[45,78],[58,69]], c.shirtLight)
  part = 'arm-left'
  polygon([[42,77],[46,79],[34,94],[27,96],[26,91]], c.skinShade)
  polygon([[42,78],[44,79],[32,94],[28,94],[29,91]], c.skin)
  part = 'body'
  polygon([[76,59],[82,62],[91,76],[85,82],[71,69]], c.ink)
  polygon([[77,63],[81,65],[88,75],[85,78],[74,69]], c.shirtLight)
  polygon([[85,77],[90,78],[81,91],[73,97],[68,93],[78,86]], c.skinShade)
  polygon([[85,79],[87,79],[79,90],[72,94],[70,92],[79,86]], c.skin)
  // A small music-note emblem, rather than an invented logo or costume.
  rect(64, 76, 2, 9, c.cream); rect(64, 76, 6, 2, c.cream); rect(61, 83, 5, 3, c.cream)

  part = 'head'
  ellipse(67, 35, 16, 19, c.ink)
  ellipse(67, 35, 14, 17, c.skinShade)
  ellipse(66, 34, 13, 16, c.skin)
  rect(57, 25, 17, 5, c.skinLight)
  ellipse(49, 37, 3, 5, c.skinShade); ellipse(84, 37, 3, 5, c.skin)
  polygon([[49,28],[50,19],[54,18],[55,13],[63,10],[71,12],[76,11],[83,17],[86,27],[80,26],[76,22],[71,25],[58,23],[53,30]], c.hair)
  polygon([[55,19],[60,14],[64,14],[69,16],[74,14],[79,18],[76,19],[70,18],[65,20]], c.hairLight)
  rect(63, 45, 8, 1, c.skinShade); rect(64, 46, 6, 1, c.cream)
  // Dark wayfarer lenses with stepped, rounded lower corners and restrained reflections.
  polygon([[54,30],[65,30],[67,32],[66,38],[63,41],[56,41],[53,38],[52,33]], c.shadeFrame)
  polygon([[55,32],[64,32],[65,34],[64,37],[62,39],[57,39],[55,37],[54,34]], c.shadeLens)
  polygon([[71,30],[81,30],[83,33],[82,38],[79,41],[73,41],[70,38],[69,32]], c.shadeFrame)
  polygon([[72,32],[80,32],[81,34],[80,37],[78,39],[74,39],[72,37],[71,34]], c.shadeLens)
  rect(65, 32, 5, 2, c.shadeFrame); rect(49, 32, 5, 2, c.shadeFrame); rect(82, 32, 4, 2, c.shadeFrame)
  line(56, 33, 58, 35, c.shadeReflection); line(73, 33, 75, 35, c.shadeReflection)
  rect(53, 32, 1, 1, c.gold); rect(81, 32, 1, 1, c.gold)
  rect(67, 37, 2, 5, c.skinShade); rect(67, 41, 4, 1, c.skinLight)
  // The band sits above the hair, with matching over-ear cups outside the face.
  rect(57, 5, 20, 4, c.headphones); rect(54, 8, 4, 4, c.headphones)
  rect(50, 11, 5, 6, c.headphones); rect(47, 16, 4, 15, c.headphones)
  rect(76, 8, 4, 4, c.headphones); rect(79, 11, 5, 6, c.headphones); rect(83, 16, 4, 15, c.headphones)
  rect(58, 6, 18, 1, c.headphoneAccent); rect(51, 12, 2, 4, c.headphoneAccent); rect(81, 12, 2, 4, c.headphoneAccent)
  rect(44, 29, 9, 15, c.headphones); rect(49, 31, 4, 11, c.headphonePad)
  rect(45, 32, 3, 8, c.headphoneAccent); rect(46, 34, 1, 4, c.headphones)
  rect(82, 29, 9, 15, c.headphones); rect(82, 31, 4, 11, c.headphonePad)
  rect(87, 32, 3, 8, c.headphoneAccent); rect(88, 34, 1, 4, c.headphones)

  part = 'console'
  polygon([[8,86],[119,86],[126,112],[2,112]], c.ink)
  polygon([[10,88],[117,88],[122,110],[6,110]], c.deck)
  rect(2, 112, 124, 8, c.ink); rect(3, 112, 122, 2, c.metal)
  rect(8, 115, 5, 2, c.gold); rect(17, 115, 3, 2, c.gold)
  rect(117, 115, 3, 2, c.led); rect(11, 120, 7, 5, c.ink); rect(110, 120, 7, 5, c.ink)
  for (const [x, center, name] of [[10,28,'record-left'],[82,100,'record-right']]) {
    part = 'console'
    rect(x, 90, 36, 19, c.darkDeck); rect(x, 90, 36, 1, c.metal)
    part = name
    ellipse(center, 98, 13, 7, c.ink); ellipse(center, 98, 12, 6, c.groove)
    ellipse(center, 98, 10, 5, c.ink); ellipse(center, 98, 8, 4, c.deck); ellipse(center, 98, 7, 3, c.ink)
    ellipse(center, 98, 3, 2, c.gold); rect(center, 98, 1, 1, c.cream)
    part = 'console'
    line(x + 31, 92, x + 28, 92, c.metal, 1); line(x + 28, 92, x + 25, 99, c.metal, 1)
    rect(x + 24, 99, 3, 2, c.cream)
    rect(x + 2, 104, 4, 3, c.shirt); rect(x + 7, 104, 3, 3, c.led)
    for (let i = 0; i < 4; i += 1) rect(x + 16 + i * 4, 106, 3, 2, i % 2 ? c.gold : c.shirtLight)
  }
  part = 'mixer'
  rect(48, 89, 32, 21, c.darkDeck)
  for (let channel = 0; channel < 4; channel += 1) {
    const x = 51 + channel * 7
    rect(x, 92, 3, 2, c.metal); rect(x, 96, 3, 2, c.gold)
    rect(x + 1, 99, 1, 7, c.groove); rect(x, 100 + channel % 3, 3, 2, c.cream)
  }
  rect(56, 108, 17, 2, c.ink); rect(63, 108, 4, 2, c.metal)
  part = 'meter'
  for (let y = 91; y < 105; y += 2) { rect(46, y, 1, 1, c.led); rect(80, y, 1, 1, y < 95 ? c.shirtLight : c.led) }
  // Moving hands must cover the decks, not erase their underlying pixels.
  const hands = Array(SPRITE_SIZE * SPRITE_SIZE).fill(null)
  paintLayer = hands
  part = 'hand-left'
  polygon([[25,91],[31,90],[34,93],[34,97],[30,99],[23,97],[22,94]], c.skinShade)
  rect(24, 92, 7, 4, c.skin); rect(25, 96, 2, 2, c.skinLight); rect(28, 96, 2, 2, c.skinLight)
  part = 'hand-right'
  polygon([[67,90],[73,90],[76,93],[74,96],[65,96],[63,93]], c.skinShade)
  rect(65, 91, 8, 3, c.skin); rect(65, 94, 2, 2, c.skinLight); rect(68, 94, 2, 2, c.skinLight)

  return [cells, hands].flatMap(layer => layer.flatMap((cell, index) => cell ? [{
    u: (index % SPRITE_SIZE) / SPRITE_SIZE, v: Math.floor(index / SPRITE_SIZE) / SPRITE_SIZE,
    colour: cell.colour, part: cell.part, x: 0, y: 0, dx: 0, dy: 0, vx: 0, vy: 0, seed: (index * 13) % 31,
  }] : []))
}
