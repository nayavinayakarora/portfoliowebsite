import { useEffect, useMemo, useRef, useState } from 'react'
import { AdaptiveDpr } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { AtmosphereParticles } from './AtmosphereParticles'
import { SignalNetwork } from './SignalNetwork'
import { SoundCore } from './SoundCore'
import { SoundStructures } from './SoundStructures'
import {
  buildSignalConnections,
  buildStructureDescriptors,
  getCameraDepthFromScroll,
  getHarmonyFactor,
  getStructurePosition,
} from './soundSystem'

const BACKDROP_VERTEX = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const BACKDROP_FRAGMENT = `
uniform float uTime;
uniform vec2 uPointer;

varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec2 uv = vUv;
  vec2 centered = uv - 0.5;
  centered.x += uPointer.x * 0.06;
  centered.y += uPointer.y * 0.04;

  float radial = length(centered * vec2(1.2, 1.0));
  float vignette = smoothstep(1.02, 0.15, radial);
  float flow = sin((uv.y * 8.0) + (uTime * 0.16)) * 0.5 + 0.5;

  vec3 dark = vec3(0.02, 0.02, 0.06);
  vec3 indigo = vec3(0.07, 0.08, 0.2);
  vec3 violet = vec3(0.12, 0.08, 0.26);
  vec3 blue = vec3(0.09, 0.18, 0.34);

  vec3 color = mix(dark, indigo, smoothstep(0.0, 1.0, uv.y));
  color = mix(color, violet, smoothstep(0.18, 0.86, uv.x));
  color = mix(color, blue, flow * 0.24);

  float grain = (hash(uv * vec2(1100.0, 680.0) + uTime * 0.08) - 0.5) * 0.06;
  color += grain;

  gl_FragColor = vec4(color * vignette, 1.0);
}
`

function Backdrop({ motionRef }) {
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPointer: { value: new THREE.Vector2() },
    }),
    [],
  )

  useFrame((state) => {
    uniforms.uTime.value = state.clock.elapsedTime
    uniforms.uPointer.value.copy(motionRef.current.pointer)
  })

  return (
    <mesh position={[0, 0, -9.8]} scale={[24, 14, 1]}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={BACKDROP_VERTEX}
        fragmentShader={BACKDROP_FRAGMENT}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  )
}

function SceneGraph({
  descriptors,
  connections,
  structurePositionsRef,
  motionRef,
  audioDataRef,
  audioReactiveEnabled,
  compactView,
}) {
  const scrollTargetRef = useRef(0)
  const keyLightRef = useRef(null)
  const rimLightRef = useRef(null)
  const tempPosition = useRef(new THREE.Vector3())

  useEffect(() => {
    const updateScroll = () => {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
      scrollTargetRef.current = THREE.MathUtils.clamp(window.scrollY / max, 0, 1)
    }

    updateScroll()
    window.addEventListener('scroll', updateScroll, { passive: true })
    window.addEventListener('resize', updateScroll)
    return () => {
      window.removeEventListener('scroll', updateScroll)
      window.removeEventListener('resize', updateScroll)
    }
  }, [])

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime
    const motion = motionRef.current
    const pointer = motion.pointer

    pointer.lerp(state.pointer, 0.07)
    motion.scroll = THREE.MathUtils.lerp(motion.scroll, scrollTargetRef.current, 0.06)
    motion.harmony = getHarmonyFactor(time)

    if (audioReactiveEnabled && audioDataRef.current.active) {
      const source = audioDataRef.current
      motion.audio.level = THREE.MathUtils.lerp(motion.audio.level, source.level, 0.14)
      motion.audio.bass = THREE.MathUtils.lerp(motion.audio.bass, source.bass, 0.14)
      for (let index = 0; index < motion.audio.spectrum.length; index += 1) {
        const incoming = source.spectrum[index] ?? 0
        motion.audio.spectrum[index] = THREE.MathUtils.lerp(motion.audio.spectrum[index], incoming, 0.12)
      }
    } else {
      // Cinematic idle fallback keeps the organism alive even without external audio.
      const idleLevel = 0.1 + ((Math.sin(time * 0.78) + 1) * 0.05)
      const idleBass = 0.08 + ((Math.sin(time * 0.52 + 1.7) + 1) * 0.04)
      motion.audio.level = THREE.MathUtils.lerp(motion.audio.level, idleLevel, 0.06)
      motion.audio.bass = THREE.MathUtils.lerp(motion.audio.bass, idleBass, 0.06)
      for (let index = 0; index < motion.audio.spectrum.length; index += 1) {
        const wave = Math.sin((time * 0.9) + (index * 0.45)) * 0.5 + 0.5
        motion.audio.spectrum[index] = THREE.MathUtils.lerp(
          motion.audio.spectrum[index],
          (0.12 + (wave * 0.2)) * (1 - (index / motion.audio.spectrum.length) * 0.35),
          0.08,
        )
      }
    }

    descriptors.forEach((descriptor) => {
      getStructurePosition(
        descriptor,
        time,
        pointer,
        motion.harmony,
        tempPosition.current,
      )
      structurePositionsRef.current[descriptor.index].copy(tempPosition.current)
    })

    const depthOffset = compactView ? 1.85 : 0
    const pointerScale = compactView ? 0.62 : 1
    const cameraZ = getCameraDepthFromScroll(motion.scroll) + depthOffset
    const cameraX = (pointer.x * 0.42 * pointerScale) + (Math.sin(time * 0.15) * 0.18)
    const cameraY = (pointer.y * 0.28 * pointerScale) + (Math.cos(time * 0.18) * 0.14)

    state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, cameraX, 0.04)
    state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, cameraY, 0.04)
    state.camera.position.z = THREE.MathUtils.lerp(state.camera.position.z, cameraZ, 0.04)
    state.camera.lookAt(0, 0, 0)

    if (keyLightRef.current) {
      keyLightRef.current.position.x = THREE.MathUtils.lerp(keyLightRef.current.position.x, 2.2 + (pointer.x * 1.4), 0.06)
      keyLightRef.current.position.y = THREE.MathUtils.lerp(keyLightRef.current.position.y, 1.8 + (pointer.y * 0.8), 0.06)
      keyLightRef.current.intensity = 0.8 + (motion.audio.level * 0.2)
    }

    if (rimLightRef.current) {
      rimLightRef.current.position.x = THREE.MathUtils.lerp(rimLightRef.current.position.x, -2.5 + (pointer.x * 0.8), 0.06)
      rimLightRef.current.position.y = THREE.MathUtils.lerp(rimLightRef.current.position.y, -1.3 + (pointer.y * 0.4), 0.06)
      rimLightRef.current.intensity = THREE.MathUtils.lerp(
        rimLightRef.current.intensity,
        0.44 + (motion.harmony * 0.2),
        Math.min(1, delta * 4),
      )
    }
  })

  return (
    <>
      <color attach="background" args={['#06070e']} />
      <fog attach="fog" args={['#070911', 9, 17]} />
      <ambientLight intensity={0.28} color="#4955b8" />
      <directionalLight ref={keyLightRef} intensity={0.86} color="#4fa8ff" position={[2.2, 1.8, 4.2]} />
      <directionalLight ref={rimLightRef} intensity={0.44} color="#c69a62" position={[-2.5, -1.3, 3.4]} />
      <pointLight intensity={0.48} color="#7f67eb" position={[0, 0.4, 1.8]} distance={10} />
      <Backdrop motionRef={motionRef} />
      <AtmosphereParticles motionRef={motionRef} />
      <SignalNetwork
        connections={connections}
        structurePositionsRef={structurePositionsRef}
        motionRef={motionRef}
      />
      <SoundStructures
        descriptors={descriptors}
        structurePositionsRef={structurePositionsRef}
        motionRef={motionRef}
      />
      <SoundCore motionRef={motionRef} />
    </>
  )
}

export function HeroScene({ audioDataRef, audioReactiveEnabled }) {
  const [compactView, setCompactView] = useState(false)
  const [reducedMotionMode, setReducedMotionMode] = useState(false)
  const descriptors = useMemo(() => buildStructureDescriptors(), [])
  const connections = useMemo(() => buildSignalConnections(descriptors.length), [descriptors.length])

  const structurePositionsRef = useRef(
    descriptors.map(() => new THREE.Vector3()),
  )

  const motionRef = useRef({
    pointer: new THREE.Vector2(),
    scroll: 0,
    harmony: 0,
    audio: {
      level: 0.08,
      bass: 0.08,
      spectrum: Array.from({ length: 32 }, () => 0.1),
    },
  })

  useEffect(() => {
    const query = window.matchMedia('(max-width: 860px)')
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

    const sync = () => {
      setCompactView(query.matches)
      setReducedMotionMode(reducedMotion.matches)
    }

    sync()
    query.addEventListener('change', sync)
    reducedMotion.addEventListener('change', sync)

    return () => {
      query.removeEventListener('change', sync)
      reducedMotion.removeEventListener('change', sync)
    }
  }, [])

  if (reducedMotionMode) {
    return (
      <div className="hero-mobile-fallback" aria-label="Living Sound Entity mobile fallback">
        <div className="hero-mobile-gradient" />
        <div className="hero-mobile-noise" />
      </div>
    )
  }

  return (
    <div className="hero-scene-shell" aria-hidden="true">
      <Canvas
        camera={{ fov: compactView ? 54 : 45, position: [0, 0, compactView ? 10.4 : 8], near: 0.1, far: 60 }}
        dpr={compactView ? [1, 1.2] : [1, 1.5]}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      >
        <AdaptiveDpr pixelated />
        <SceneGraph
          descriptors={descriptors}
          connections={connections}
          structurePositionsRef={structurePositionsRef}
          motionRef={motionRef}
          audioDataRef={audioDataRef}
          audioReactiveEnabled={audioReactiveEnabled}
          compactView={compactView}
        />
      </Canvas>
    </div>
  )
}
