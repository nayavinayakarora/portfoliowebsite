import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { CORE_SHELL_FRAGMENT, CORE_SHELL_VERTEX } from './shaders'

const BAR_COUNT = 42
const barDummy = new THREE.Object3D()
const barColor = new THREE.Color()

export function SoundCore({ motionRef }) {
  const coreGroupRef = useRef(null)
  const shellUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAudio: { value: 0 },
      uBass: { value: 0 },
      uViewPos: { value: new THREE.Vector3() },
    }),
    [],
  )

  const ringARef = useRef(null)
  const ringBRef = useRef(null)
  const ringCRef = useRef(null)
  const bandsRef = useRef(null)
  const innerSwarmRef = useRef(null)

  const particleGeometry = useMemo(() => {
    const count = 320
    const positions = new Float32Array(count * 3)

    for (let index = 0; index < count; index += 1) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos((Math.random() * 2) - 1)
      const radius = Math.pow(Math.random(), 0.75) * 0.9

      positions[(index * 3)] = Math.sin(phi) * Math.cos(theta) * radius
      positions[(index * 3) + 1] = Math.cos(phi) * radius
      positions[(index * 3) + 2] = Math.sin(phi) * Math.sin(theta) * radius
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return geometry
  }, [])

  useEffect(() => {
    if (!bandsRef.current) return undefined

    bandsRef.current.instanceMatrix.setUsage(THREE.DynamicDrawUsage)

    for (let index = 0; index < BAR_COUNT; index += 1) {
      const tint = index / BAR_COUNT
      barColor.setRGB(
        THREE.MathUtils.lerp(0.24, 0.60, tint),
        THREE.MathUtils.lerp(0.36, 0.82, tint),
        THREE.MathUtils.lerp(0.88, 0.98, tint),
      )
      bandsRef.current.setColorAt(index, barColor)
    }

    bandsRef.current.instanceColor.needsUpdate = true
    return undefined
  }, [])

  useFrame((state, delta) => {
    const motion = motionRef.current
    const time = state.clock.elapsedTime

    if (coreGroupRef.current) {
      const drift = Math.sin(time * 0.4) * 0.08
      coreGroupRef.current.position.y = THREE.MathUtils.lerp(coreGroupRef.current.position.y, drift, 0.08)
      coreGroupRef.current.rotation.y += delta * 0.05
      coreGroupRef.current.rotation.z = Math.sin(time * 0.17) * 0.04
    }

    shellUniforms.uTime.value = time
    shellUniforms.uAudio.value = motion.audio.level
    shellUniforms.uBass.value = motion.audio.bass
    shellUniforms.uViewPos.value.copy(state.camera.position)

    if (ringARef.current) {
      ringARef.current.rotation.x += delta * 0.23
      ringARef.current.rotation.z += delta * 0.08
    }

    if (ringBRef.current) {
      ringBRef.current.rotation.y -= delta * 0.17
      ringBRef.current.rotation.x += delta * 0.04
    }

    if (ringCRef.current) {
      ringCRef.current.rotation.z -= delta * 0.12
      ringCRef.current.rotation.y += delta * 0.06
    }

    if (innerSwarmRef.current) {
      innerSwarmRef.current.rotation.y += delta * 0.08
      innerSwarmRef.current.rotation.x = Math.sin(time * 0.21) * 0.12
    }

    if (bandsRef.current) {
      for (let index = 0; index < BAR_COUNT; index += 1) {
        const t = index / BAR_COUNT
        const angle = t * Math.PI * 2
        const energy = 0.12 + (Math.sin((time * 1.7) + (t * 18)) * 0.08)
        const audioLift = motion.audio.spectrum[t % motion.audio.spectrum.length] * 0.45
        const harmonicLift = motion.harmony * 0.2

        const height = 0.1 + energy + audioLift + harmonicLift
        const radius = 0.76 + (Math.sin((time * 0.42) + (t * 5.7)) * 0.03)

        barDummy.position.set(Math.cos(angle) * radius, Math.sin((time * 0.8) + (t * 12)) * 0.08, Math.sin(angle) * radius)
        barDummy.lookAt(0, 0, 0)
        barDummy.rotateX(Math.PI / 2)
        barDummy.scale.set(0.04, height, 0.04)
        barDummy.updateMatrix()

        bandsRef.current.setMatrixAt(index, barDummy.matrix)
      }

      bandsRef.current.instanceMatrix.needsUpdate = true
    }
  })

  return (
    <group ref={coreGroupRef}>
      <mesh>
        <sphereGeometry args={[1.12, 72, 72]} />
        <shaderMaterial
          uniforms={shellUniforms}
          vertexShader={CORE_SHELL_VERTEX}
          fragmentShader={CORE_SHELL_FRAGMENT}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <mesh>
        <sphereGeometry args={[1.02, 48, 48]} />
        <meshBasicMaterial color="#4868f1" transparent opacity={0.12} toneMapped={false} />
      </mesh>

      <mesh scale={1.24}>
        <sphereGeometry args={[1, 40, 40]} />
        <meshBasicMaterial color="#5069dc" transparent opacity={0.07} depthWrite={false} toneMapped={false} />
      </mesh>

      <group ref={ringARef}>
        <mesh rotation={[Math.PI * 0.4, 0.2, 0]}>
          <torusGeometry args={[0.84, 0.014, 20, 120]} />
          <meshBasicMaterial color="#8a7dff" transparent opacity={0.5} toneMapped={false} />
        </mesh>
      </group>

      <group ref={ringBRef}>
        <mesh rotation={[0.4, Math.PI * 0.6, 0.1]}>
          <torusGeometry args={[0.67, 0.011, 18, 120]} />
          <meshBasicMaterial color="#3fafff" transparent opacity={0.42} toneMapped={false} />
        </mesh>
      </group>

      <group ref={ringCRef}>
        <mesh rotation={[Math.PI * 0.2, 0.4, Math.PI * 0.45]}>
          <torusGeometry args={[0.53, 0.01, 18, 120]} />
          <meshBasicMaterial color="#d0a266" transparent opacity={0.38} toneMapped={false} />
        </mesh>
      </group>

      <instancedMesh ref={bandsRef} args={[null, null, BAR_COUNT]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial
          vertexColors
          transparent
          opacity={0.72}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </instancedMesh>

      <points ref={innerSwarmRef} geometry={particleGeometry} frustumCulled={false}>
        <pointsMaterial
          color="#84c8ff"
          size={0.022}
          sizeAttenuation
          transparent
          opacity={0.85}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </points>
    </group>
  )
}
