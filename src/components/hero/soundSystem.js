import * as THREE from 'three'

export const STRUCTURE_COUNT = 36
export const CONNECTION_COUNT = 72
export const CONNECTION_STEPS = 7

export const DISCIPLINE_ORDER = ['music', 'soundDesign', 'gameAudio', 'research', 'teaching', 'technology']

export const DISCIPLINE_COLORS = {
  music: '#7f76ff',
  soundDesign: '#6d50c7',
  gameAudio: '#2f9df5',
  research: '#5f79ff',
  teaching: '#c5a16f',
  technology: '#4f63d9',
}

function fract(value) {
  return value - Math.floor(value)
}

export function seeded(index, offset = 0) {
  return fract(Math.sin((index * 127.1) + (offset * 311.7)) * 43758.5453123)
}

export function smoothWindow(phase, start, peak, end) {
  const rise = THREE.MathUtils.smoothstep(phase, start, peak)
  const fall = 1 - THREE.MathUtils.smoothstep(phase, peak, end)
  return THREE.MathUtils.clamp(rise * fall, 0, 1)
}

export function getHarmonyFactor(time) {
  // Signature moment: every cycle the structure aligns into harmonic geometry, then dissolves.
  const cycle = 20
  const phase = (time % cycle) / cycle
  return smoothWindow(phase, 0.56, 0.69, 0.86)
}

export function getCameraDepthFromScroll(progress) {
  // Scroll dolly path: outer layers to inner identity core.
  const points = [
    { at: 0, z: 8.6 },
    { at: 0.25, z: 7.8 },
    { at: 0.5, z: 6.95 },
    { at: 0.75, z: 6.15 },
    { at: 1, z: 5.45 },
  ]

  for (let index = 0; index < points.length - 1; index += 1) {
    const left = points[index]
    const right = points[index + 1]
    if (progress >= left.at && progress <= right.at) {
      const t = (progress - left.at) / (right.at - left.at)
      return THREE.MathUtils.lerp(left.z, right.z, t)
    }
  }

  return points[points.length - 1].z
}

export function getDisciplineLayer(discipline) {
  switch (discipline) {
    case 'music':
      return 1.1
    case 'soundDesign':
      return 0.62
    case 'gameAudio':
      return 0.16
    case 'research':
      return -0.22
    case 'teaching':
      return -0.56
    case 'technology':
      return -0.06
    default:
      return 0
  }
}

export function buildStructureDescriptors(count = STRUCTURE_COUNT) {
  return Array.from({ length: count }, (_, index) => {
    const discipline = DISCIPLINE_ORDER[index % DISCIPLINE_ORDER.length]
    const orbitRadius = 2 + (seeded(index, 1) * 2.5)
    const orbitHeight = (seeded(index, 2) - 0.5) * 2.5
    const orbitDepth = (seeded(index, 3) - 0.5) * 2.4
    const orbitSpeed = 0.07 + (seeded(index, 4) * 0.17)
    const baseAngle = seeded(index, 5) * Math.PI * 2
    const breatheOffset = seeded(index, 6) * Math.PI * 2
    const routePhase = seeded(index, 7) * Math.PI * 2
    const baseScale = 0.17 + (seeded(index, 8) * 0.25)

    const harmonicAngle = (index % 12) / 12 * Math.PI * 2
    const harmonicTier = Math.floor(index / 12)
    const harmonicRadius = 1.62 + (harmonicTier * 0.58)

    return {
      index,
      discipline,
      orbitRadius,
      orbitHeight,
      orbitDepth,
      orbitSpeed,
      baseAngle,
      breatheOffset,
      routePhase,
      baseScale,
      harmonicTarget: new THREE.Vector3(
        Math.cos(harmonicAngle) * harmonicRadius,
        ((harmonicTier - 1) * 0.62) + (Math.sin(harmonicAngle * 2) * 0.12),
        Math.sin(harmonicAngle) * harmonicRadius * 0.64,
      ),
    }
  })
}

export function buildSignalConnections(structureCount = STRUCTURE_COUNT, count = CONNECTION_COUNT) {
  const list = []

  for (let index = 0; index < count; index += 1) {
    const from = Math.floor(seeded(index, 31) * structureCount)

    let to = Math.floor(seeded(index, 47) * structureCount)
    if (to === from) {
      to = (to + 5) % structureCount
    }

    let rerouteTo = Math.floor(seeded(index, 59) * structureCount)
    if (rerouteTo === from || rerouteTo === to) {
      rerouteTo = (rerouteTo + 9) % structureCount
    }

    list.push({
      index,
      from,
      to,
      rerouteTo,
      speed: 0.35 + (seeded(index, 71) * 0.62),
      phase: seeded(index, 83) * Math.PI * 2,
      brightness: 0.45 + (seeded(index, 97) * 0.55),
      bend: (seeded(index, 113) - 0.5) * 1.2,
    })
  }

  return list
}

export function getStructurePosition(descriptor, time, pointer, harmony, target) {
  const orbit = descriptor.baseAngle + (time * descriptor.orbitSpeed)
  const breathe = 1 + (Math.sin((time * 0.46) + descriptor.breatheOffset) * 0.07)

  const x = Math.cos(orbit) * descriptor.orbitRadius * breathe
  const y = descriptor.orbitHeight + getDisciplineLayer(descriptor.discipline) * 0.36
    + (Math.sin((time * 0.34) + descriptor.routePhase) * 0.2)
    + (pointer.y * 0.28)
  const z = descriptor.orbitDepth
    + (Math.sin((orbit * 0.82) + (time * 0.26)) * 0.32)
    + (pointer.x * 0.4)

  target.set(x, y, z)
  target.lerp(descriptor.harmonicTarget, harmony * 0.86)
  return target
}

export function getConnectionReroute(connection, time) {
  const gate = (Math.sin((time * 0.17) + connection.phase) + 1) * 0.5
  return THREE.MathUtils.smoothstep(gate, 0.83, 0.98)
}
