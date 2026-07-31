import { useEffect, useMemo, useRef, useState } from 'react'
import { AdaptiveDpr } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { MusicMachine } from './MusicMachine'
import { getHarmonyFactor } from './soundSystem'

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

  vec3 dark = vec3(0.03, 0.036, 0.04);
  vec3 charcoal = vec3(0.085, 0.095, 0.1);
  vec3 brass = vec3(0.28, 0.17, 0.085);
  vec3 teal = vec3(0.07, 0.2, 0.22);

  vec3 color = mix(dark, charcoal, smoothstep(0.0, 1.0, uv.y));
  color = mix(color, brass, smoothstep(0.28, 0.98, uv.x) * 0.5);
  color = mix(color, teal, flow * 0.22);

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
  motionRef,
  audioDataRef,
  audioReactiveEnabled,
  compactView,
  interactionSoundEnabled,
}) {
  const scrollTargetRef = useRef(0)
  const keyLightRef = useRef(null)
  const rimLightRef = useRef(null)

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

    const pointerScale = compactView ? 0.62 : 1
    const cameraZ = compactView
      ? THREE.MathUtils.lerp(10.8, 9.7, motion.scroll)
      : THREE.MathUtils.lerp(8.7, 7.35, motion.scroll)
    const cameraX = (pointer.x * 0.42 * pointerScale)
      + (Math.sin(time * 0.15) * 0.18)
      + (compactView ? 0 : motion.scroll * 0.55)
    const cameraY = (pointer.y * 0.28 * pointerScale)
      + (Math.cos(time * 0.18) * 0.14)
      + (motion.scroll * 0.22)

    state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, cameraX, 0.04)
    state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, cameraY, 0.04)
    state.camera.position.z = THREE.MathUtils.lerp(state.camera.position.z, cameraZ, 0.04)
    state.camera.lookAt(0, 0, 0)

    if (keyLightRef.current) {
      keyLightRef.current.position.x = THREE.MathUtils.lerp(keyLightRef.current.position.x, 2.2 + (pointer.x * 1.4), 0.06)
      keyLightRef.current.position.y = THREE.MathUtils.lerp(keyLightRef.current.position.y, 1.8 + (pointer.y * 0.8), 0.06)
      keyLightRef.current.intensity = 1.2 + (motion.audio.level * 0.5)
    }

    if (rimLightRef.current) {
      rimLightRef.current.position.x = THREE.MathUtils.lerp(rimLightRef.current.position.x, -2.5 + (pointer.x * 0.8), 0.06)
      rimLightRef.current.position.y = THREE.MathUtils.lerp(rimLightRef.current.position.y, -1.3 + (pointer.y * 0.4), 0.06)
      rimLightRef.current.intensity = THREE.MathUtils.lerp(
        rimLightRef.current.intensity,
        0.82 + (motion.harmony * 0.34),
        Math.min(1, delta * 4),
      )
    }
  })

  return (
    <>
      <color attach="background" args={['#07090b']} />
      <fog attach="fog" args={['#080a0d', 10, 18]} />
      <ambientLight intensity={0.72} color="#9a856d" />
      <directionalLight ref={keyLightRef} intensity={1.28} color="#86d2de" position={[2.2, 1.8, 4.2]} />
      <directionalLight ref={rimLightRef} intensity={0.9} color="#e0ae70" position={[-2.5, -1.3, 3.4]} />
      <pointLight intensity={1.65} color="#e0aa66" position={[2.2, 0.6, 3]} distance={11} />
      <Backdrop motionRef={motionRef} />
      <MusicMachine
        motionRef={motionRef}
        compactView={compactView}
        interactionSoundEnabled={interactionSoundEnabled}
      />
    </>
  )
}

export function HeroScene({
  audioDataRef,
  audioReactiveEnabled,
  interactionSoundEnabled = true,
}) {
  const [compactView, setCompactView] = useState(false)
  const [reducedMotionMode, setReducedMotionMode] = useState(false)

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
          motionRef={motionRef}
          audioDataRef={audioDataRef}
          audioReactiveEnabled={audioReactiveEnabled}
          compactView={compactView}
          interactionSoundEnabled={interactionSoundEnabled}
        />
      </Canvas>
    </div>
  )
}
