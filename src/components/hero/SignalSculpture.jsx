import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

const SEGMENTS = 160
const WIDTH_STEPS = 6

function createRibbon() {
  const geometry = new THREE.BufferGeometry()
  const positions = new Float32Array((SEGMENTS + 1) * (WIDTH_STEPS + 1) * 3)
  const indices = []
  for (let segment = 0; segment < SEGMENTS; segment += 1) {
    for (let column = 0; column < WIDTH_STEPS; column += 1) {
      const a = segment * (WIDTH_STEPS + 1) + column
      const b = a + WIDTH_STEPS + 1
      indices.push(a, b, a + 1, b, b + 1, a + 1)
    }
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage))
  geometry.setIndex(indices)
  return geometry
}

function Ribbon({ lane, motionRef, reducedMotion }) {
  const geometry = useMemo(createRibbon, [])
  useEffect(() => () => geometry.dispose(), [geometry])

  useFrame(({ clock }) => {
    const motion = motionRef.current
    const time = reducedMotion ? 0 : clock.elapsedTime * 0.23
    const position = geometry.attributes.position
    const phase = lane * 1.6
    for (let segment = 0; segment <= SEGMENTS; segment += 1) {
      const u = segment / SEGMENTS
      const envelope = Math.sin(u * Math.PI) ** 0.65
      const spectrum = motion.audio.spectrum[Math.min(31, Math.floor(u * 32))]
      const wave = Math.sin(u * Math.PI * (3.4 + motion.pointer.x * 0.7) - time + phase)
      const overtone = Math.sin(u * Math.PI * 8 + time * 0.7 + phase) * 0.12
      const x = (u - 0.5) * 11
      const y = (wave + overtone) * envelope * (1.12 + motion.audio.level * 0.45)
        + (lane - 1) * 0.26 + motion.pointer.y * envelope * 0.5
      const z = Math.cos(u * Math.PI * 3 - time * 0.65 + phase) * envelope * 0.65
        + (lane - 1) * 0.22 + spectrum * 0.22
      const twist = u * Math.PI * 3.5 + phase + time * 0.6 + motion.scroll * 1.8
      const width = 0.035 + envelope * (0.48 + motion.scroll * 0.14)
      for (let column = 0; column <= WIDTH_STEPS; column += 1) {
        const v = column / WIDTH_STEPS - 0.5
        const camber = Math.cos(v * Math.PI) * width * 0.08
        position.setXYZ(segment * (WIDTH_STEPS + 1) + column, x,
          y + Math.cos(twist) * v * width,
          z + Math.sin(twist) * v * width + camber)
      }
    }
    position.needsUpdate = true
    geometry.computeVertexNormals()
  })

  return (
    <mesh geometry={geometry} frustumCulled={false}>
      <meshStandardMaterial color={['#c2a578', '#eee2cc', '#8d7655'][lane]} metalness={0.72} roughness={0.27} side={THREE.DoubleSide} />
    </mesh>
  )
}

export function SignalSculpture({ motionRef, reducedMotion }) {
  const groupRef = useRef(null)
  const { viewport } = useThree()
  useFrame((_, delta) => {
    const motion = motionRef.current
    const group = groupRef.current
    const smoothing = 1 - Math.exp(-Math.min(delta, 0.1) * 4)
    group.rotation.x = THREE.MathUtils.lerp(group.rotation.x, -0.13 + motion.pointer.y * 0.15 + motion.scroll * 0.45, smoothing)
    group.rotation.y = THREE.MathUtils.lerp(group.rotation.y, motion.pointer.x * 0.14 - motion.scroll * 0.2, smoothing)
    group.rotation.z = THREE.MathUtils.lerp(group.rotation.z, -0.08 + motion.pointer.x * 0.04 + motion.scroll * 0.13, smoothing)
    group.scale.setScalar(Math.min(1, viewport.width / 12.3))
  })
  return <group ref={groupRef}>{[0, 1, 2].map((lane) => <Ribbon key={lane} lane={lane} motionRef={motionRef} reducedMotion={reducedMotion} />)}</group>
}
