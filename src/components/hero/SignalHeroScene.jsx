import { useEffect, useMemo, useRef, useState } from 'react'
import { AdaptiveDpr } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { SignalSculpture } from './SignalSculpture'

function SignalField() {
  const positions = useMemo(() => {
    const points = []
    for (let row = 0; row < 13; row += 1) {
      for (let column = 0; column < 55; column += 1) {
        points.push((column - 27) * 0.36, (row - 6) * 0.36, -2.5)
      }
    }
    return new Float32Array(points)
  }, [])
  return <points><bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry><pointsMaterial color="#a39175" size={0.012} transparent opacity={0.3} sizeAttenuation depthWrite={false} /></points>
}

function SceneGraph({ motionRef, audioDataRef, audioReactiveEnabled, reducedMotion, shellRef }) {
  const scrollTargetRef = useRef(0)
  useEffect(() => {
    const updateScroll = () => {
      const rect = shellRef.current?.getBoundingClientRect()
      if (rect) scrollTargetRef.current = THREE.MathUtils.clamp((window.innerHeight - rect.top) / (window.innerHeight + rect.height), 0, 1)
    }
    updateScroll()
    window.addEventListener('scroll', updateScroll, { passive: true })
    window.addEventListener('resize', updateScroll)
    return () => { window.removeEventListener('scroll', updateScroll); window.removeEventListener('resize', updateScroll) }
  }, [shellRef])

  useFrame((state, delta) => {
    const motion = motionRef.current
    const smoothing = 1 - Math.exp(-Math.min(delta, 0.1) * 5)
    motion.pointer.lerp(reducedMotion ? motion.neutralPointer : motion.targetPointer, smoothing)
    motion.scroll = THREE.MathUtils.lerp(motion.scroll, reducedMotion ? 0 : scrollTargetRef.current, smoothing)
    const source = audioReactiveEnabled && audioDataRef.current.active ? audioDataRef.current : null
    motion.audio.level = THREE.MathUtils.lerp(motion.audio.level, source?.level || 0, smoothing)
    for (let index = 0; index < 32; index += 1) {
      motion.audio.spectrum[index] = THREE.MathUtils.lerp(motion.audio.spectrum[index], source?.spectrum[index] || 0, smoothing)
    }
  })

  return (
    <>
      <color attach="background" args={['#10120f']} />
      <ambientLight intensity={1.2} color="#e4dbc9" />
      <directionalLight intensity={4} color="#fff5e5" position={[0, 4, 5]} />
      <directionalLight intensity={3} color="#b5b9ae" position={[-4, -2, 3]} />
      <pointLight intensity={20} color="#d9b679" position={[4, 1, 2]} distance={16} decay={2} />
      <SignalField />
      <SignalSculpture motionRef={motionRef} reducedMotion={reducedMotion} />
      {/* Track the whole field, not just the narrow ribbon surfaces. */}
      <mesh position={[0, 0, 3]} onPointerMove={(event) => motionRef.current.targetPointer.copy(event.pointer)} onPointerOut={() => motionRef.current.targetPointer.set(0, 0)}>
        <planeGeometry args={[40, 20]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </>
  )
}

export function HeroScene({ audioDataRef, audioReactiveEnabled }) {
  const shellRef = useRef(null)
  const [compactView, setCompactView] = useState(() => window.matchMedia('(max-width: 860px)').matches)
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [sceneVisible, setSceneVisible] = useState(true)
  const [pageVisible, setPageVisible] = useState(() => !document.hidden)
  const motionRef = useRef({ pointer: new THREE.Vector2(), targetPointer: new THREE.Vector2(), neutralPointer: new THREE.Vector2(), scroll: 0, audio: { level: 0, spectrum: Array(32).fill(0) } })

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setSceneVisible(entry.isIntersecting))
    observer.observe(shellRef.current)
    const visibility = () => setPageVisible(!document.hidden)
    document.addEventListener('visibilitychange', visibility)
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', visibility) }
  }, [])

  useEffect(() => {
    const mobile = window.matchMedia('(max-width: 860px)')
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => { setCompactView(mobile.matches); setReducedMotion(reduced.matches) }
    mobile.addEventListener('change', sync)
    reduced.addEventListener('change', sync)
    return () => { mobile.removeEventListener('change', sync); reduced.removeEventListener('change', sync) }
  }, [])

  return (
    <div ref={shellRef} className="hero-scene-shell" aria-hidden="true">
      <Canvas frameloop={sceneVisible && pageVisible ? (reducedMotion ? 'demand' : 'always') : 'never'}
        camera={{ fov: 35, position: [0, 0, 8], near: 0.1, far: 30 }}
        dpr={compactView ? [1, 1.2] : [1, 1.5]}
        gl={{ antialias: true, alpha: false, powerPreference: 'default' }}>
        <AdaptiveDpr />
        <SceneGraph motionRef={motionRef} audioDataRef={audioDataRef} audioReactiveEnabled={audioReactiveEnabled} reducedMotion={reducedMotion} shellRef={shellRef} />
      </Canvas>
    </div>
  )
}
