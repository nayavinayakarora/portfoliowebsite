import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { DUST_FRAGMENT, DUST_VERTEX } from './shaders'
import { seeded } from './soundSystem'

const PARTICLE_COUNT = 1200

export function AtmosphereParticles({ motionRef }) {
  const pointsRef = useRef(null)

  const baseData = useMemo(() => {
    const base = new Float32Array(PARTICLE_COUNT * 3)
    const seed = new Float32Array(PARTICLE_COUNT)
    const size = new Float32Array(PARTICLE_COUNT)
    const layer = new Float32Array(PARTICLE_COUNT)

    for (let index = 0; index < PARTICLE_COUNT; index += 1) {
      const r0 = seeded(index, 201)
      const r1 = seeded(index, 211)
      const r2 = seeded(index, 223)
      const r3 = seeded(index, 227)

      base[index * 3] = (r0 - 0.5) * 14
      base[(index * 3) + 1] = (r1 - 0.5) * 8.6
      base[(index * 3) + 2] = -6 + (r2 * 11)

      seed[index] = r3
      size[index] = 4 + (r1 * 6.8)
      layer[index] = THREE.MathUtils.clamp((base[(index * 3) + 2] + 6) / 11, 0, 1)
    }

    return { base, seed, size, layer }
  }, [])

  const geometry = useMemo(() => {
    const geom = new THREE.BufferGeometry()
    geom.setAttribute('position', new THREE.BufferAttribute(baseData.base.slice(), 3))
    geom.setAttribute('aSize', new THREE.BufferAttribute(baseData.size, 1))
    geom.setAttribute('aLayer', new THREE.BufferAttribute(baseData.layer, 1))
    return geom
  }, [baseData])

  const uniforms = useMemo(
    () => ({
      uParallax: { value: 0.1 },
    }),
    [],
  )

  useEffect(() => {
    geometry.getAttribute('position').setUsage(THREE.DynamicDrawUsage)
  }, [geometry])

  useFrame((state) => {
    const time = state.clock.elapsedTime
    const motion = motionRef.current
    const positions = geometry.getAttribute('position').array

    const cursorX = motion.pointer.x * 2.7
    const cursorY = motion.pointer.y * 1.7

    for (let index = 0; index < PARTICLE_COUNT; index += 1) {
      const slot = index * 3
      const baseX = baseData.base[slot]
      const baseY = baseData.base[slot + 1]
      const baseZ = baseData.base[slot + 2]
      const seed = baseData.seed[index]
      const layer = baseData.layer[index]

      const driftX = Math.sin((time * 0.08) + (seed * 15) + (baseZ * 0.22)) * 0.34
      const driftY = Math.cos((time * 0.07) + (seed * 12) + (baseX * 0.16)) * 0.26
      const driftZ = Math.sin((time * 0.06) + (seed * 10)) * 0.24

      let x = baseX + driftX + (motion.pointer.x * (0.32 + (1 - layer) * 0.36))
      let y = baseY + driftY + (motion.pointer.y * (0.26 + (1 - layer) * 0.28))
      let z = baseZ + driftZ + (motion.scroll * layer * 0.65)

      const dx = x - cursorX
      const dy = y - cursorY
      const dz = z * 0.08
      const dist = Math.sqrt((dx * dx) + (dy * dy) + (dz * dz)) + 0.0001
      const influence = THREE.MathUtils.clamp(1 - (dist / 1.9), 0, 1)

      const polarity = Math.sin((time * 0.45) + (seed * 16)) > 0 ? -1 : 1
      const force = influence * 0.2
      x += (dx / dist) * force * polarity
      y += (dy / dist) * force * polarity

      const swirl = Math.sin((time * 0.72) + (seed * 30)) * influence * 0.07
      x += -dy * swirl
      y += dx * swirl

      z += Math.sin((time * 0.33) + (seed * 20)) * motion.harmony * 0.16

      positions[slot] = x
      positions[slot + 1] = y
      positions[slot + 2] = z
    }

    geometry.getAttribute('position').needsUpdate = true
    uniforms.uParallax.value = THREE.MathUtils.lerp(uniforms.uParallax.value, motion.pointer.length() * 0.5, 0.06)

    if (pointsRef.current) {
      pointsRef.current.rotation.y = Math.sin(time * 0.05) * 0.12
      pointsRef.current.rotation.x = Math.cos(time * 0.04) * 0.05
    }
  })

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <primitive object={geometry} attach="geometry" />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={DUST_VERTEX}
        fragmentShader={DUST_FRAGMENT}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  )
}
