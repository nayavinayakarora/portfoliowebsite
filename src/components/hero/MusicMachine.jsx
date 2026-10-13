import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { HERO_BPM, createInstrumentAudio, getRecordPosition, holdRecord, setTransportMotion, startTransport } from './heroInstrumentAudio'

const WAVE_POINTS = 144
const EQ_BAR_COUNT = 48
const STEP_COUNT = 16
const dummy = new THREE.Object3D()
const color = new THREE.Color()

function StereoWaveform({ motionRef, compactView, onFilterChange }) {
  const lineRefs = useRef([])
  const geometries = useMemo(
    () => Array.from({ length: 3 }, () => {
      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute(
        'position',
        new THREE.BufferAttribute(new Float32Array(WAVE_POINTS * 3), 3),
      )
      return geometry
    }),
    [],
  )

  useEffect(
    () => () => geometries.forEach((geometry) => geometry.dispose()),
    [geometries],
  )

  useFrame((state) => {
    const time = state.clock.elapsedTime
    const motion = motionRef.current
    const width = compactView ? 9.6 : 14
    const amplitude = compactView ? 0.68 : 0.9

    geometries.forEach((geometry, lane) => {
      const positions = geometry.getAttribute('position')

      for (let index = 0; index < WAVE_POINTS; index += 1) {
        const progress = index / (WAVE_POINTS - 1)
        const x = (progress - 0.5) * width
        const envelope = Math.sin(progress * Math.PI)
        const primary = Math.sin((progress * 31) - (time * 2.7) + lane * 1.1)
        const harmonic = Math.sin((progress * 67) + (time * 1.35) + lane) * 0.34
        const beat = Math.pow(Math.max(0, Math.sin(time * 2.35 - progress * 7)), 5)
        const energy = 0.48 + motion.audio.level * 1.8 + beat * 0.32
        const y = ((primary + harmonic) * amplitude * envelope * energy)
          + ((lane - 1) * (compactView ? 0.45 : 0.62))
        const z = -1.25 + (lane * 0.2) + Math.sin(progress * 8 + time) * 0.08

        positions.setXYZ(index, x, y, z)
      }

      positions.needsUpdate = true
      lineRefs.current[lane].rotation.z = (motion.scroll - 0.5) * (lane - 1) * 0.08
    })
  })

  const colors = ['#c69a62', '#7bc8d6', '#f1d5a8']

  return (
    <group position={[0, compactView ? 0.1 : -0.05, 0]}>
      <mesh
        position={[0, 0, -0.75]}
        onPointerMove={(event) => {
          event.stopPropagation()
          onFilterChange(event.uv?.x ?? 0.5)
        }}
      >
        <planeGeometry args={[compactView ? 9.6 : 14, compactView ? 3.2 : 4.4]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {geometries.map((geometry, index) => (
        <line key={colors[index]} ref={(node) => { lineRefs.current[index] = node }}>
          <primitive object={geometry} attach="geometry" />
          <lineBasicMaterial
            color={colors[index]}
            transparent
            opacity={index === 1 ? 0.78 : 0.38}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </line>
      ))}
    </group>
  )
}

function VinylInstrument({
  motionRef,
  compactView,
  isPlaying,
  onRecordToggle,
  onScratchStart,
  onScratch,
  onScratchEnd,
}) {
  const groupRef = useRef(null)
  const recordRef = useRef(null)
  const needleRef = useRef(null)
  const barsRef = useRef(null)
  const dragRef = useRef({
    active: false,
    pointerId: null,
    lastX: 0,
    moved: false,
    velocity: 0,
    lastAt: 0,
    distance: 0,
  })

  useEffect(() => {
    if (!barsRef.current) return
    barsRef.current.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  }, [])

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime
    const motion = motionRef.current
    const beat = Math.pow(Math.max(0, Math.sin(time * 2.35)), 7)

    if (groupRef.current) {
      groupRef.current.rotation.x = -0.16 + Math.sin(time * 0.22) * 0.035
      groupRef.current.rotation.y = -0.42 + motion.pointer.x * 0.1
      groupRef.current.rotation.z = 0.08 + motion.pointer.y * 0.06
      const pulse = 1 + beat * 0.025 + motion.audio.bass * 0.05
      groupRef.current.scale.setScalar((compactView ? 0.82 : 1) * pulse)
    }

    if (recordRef.current) {
      const drag = dragRef.current
      const transportSpeed = isPlaying && !drag.active ? 0.48 : 0
      recordRef.current.rotation.y -= delta * transportSpeed
      recordRef.current.rotation.y += drag.velocity * delta
      drag.velocity = THREE.MathUtils.lerp(drag.velocity, 0, Math.min(1, delta * 4.5))
    }

    if (needleRef.current) {
      needleRef.current.rotation.z = -0.32 + Math.sin(time * 0.3) * 0.07
    }

    if (barsRef.current) {
      const activeStep = Math.floor(time * 4.7) % STEP_COUNT

      for (let index = 0; index < EQ_BAR_COUNT; index += 1) {
        const progress = index / EQ_BAR_COUNT
        const angle = progress * Math.PI * 2
        const spectrum = motion.audio.spectrum[index % motion.audio.spectrum.length]
        const phrase = Math.sin(time * 2.35 - index * 0.38) * 0.5 + 0.5
        const stepAccent = index % 3 === activeStep % 3 ? beat * 0.42 : 0
        const height = 0.12 + spectrum * 0.6 + phrase * 0.16 + stepAccent
        const radius = 2.05

        dummy.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0.03)
        dummy.rotation.set(0, 0, angle - Math.PI / 2)
        dummy.scale.set(0.045, height, 0.05)
        dummy.updateMatrix()
        barsRef.current.setMatrixAt(index, dummy.matrix)

        color.set(index % 4 === 0 ? '#f0c98f' : '#70bfd0')
        color.multiplyScalar(0.72 + phrase * 0.45)
        barsRef.current.setColorAt(index, color)
      }

      barsRef.current.instanceMatrix.needsUpdate = true
      barsRef.current.instanceColor.needsUpdate = true
    }
  })

  return (
    <group
      ref={groupRef}
      position={[compactView ? 1.45 : 2.65, compactView ? 2.65 : 0.05, -0.15]}
    >
      <group ref={recordRef} rotation={[Math.PI / 2, 0, 0]}>
        <mesh
          onPointerDown={(event) => {
            event.stopPropagation()
            event.target.setPointerCapture(event.pointerId)
            dragRef.current.active = true
            dragRef.current.pointerId = event.pointerId
            dragRef.current.lastX = event.clientX
            dragRef.current.lastAt = event.timeStamp
            dragRef.current.moved = false
            dragRef.current.distance = 0
            onScratchStart()
            document.body.style.cursor = 'grabbing'
          }}
          onPointerMove={(event) => {
            const drag = dragRef.current
            if (!drag.active || drag.pointerId !== event.pointerId) return
            event.stopPropagation()
            const deltaX = event.clientX - drag.lastX
            const elapsed = (event.timeStamp - drag.lastAt) / 1000
            drag.lastX = event.clientX
            drag.lastAt = event.timeStamp
            drag.distance += Math.abs(deltaX)
            drag.moved = drag.distance > 2
            drag.velocity = THREE.MathUtils.clamp(deltaX * 0.72, -18, 18)
            onScratch(deltaX, elapsed)
          }}
          onPointerUp={(event) => {
            const drag = dragRef.current
            if (!drag.active) return
            event.stopPropagation()
            event.target.releasePointerCapture(event.pointerId)
            drag.active = false
            drag.pointerId = null
            document.body.style.cursor = 'grab'
            if (drag.moved) onScratchEnd()
            else onRecordToggle()
          }}
          onPointerCancel={() => {
            dragRef.current.active = false
            dragRef.current.pointerId = null
            onScratchEnd()
            document.body.style.cursor = ''
          }}
          onPointerEnter={() => { document.body.style.cursor = 'grab' }}
          onPointerLeave={() => {
            if (!dragRef.current.active) document.body.style.cursor = ''
          }}
        >
          <cylinderGeometry args={[1.72, 1.72, 0.15, 96]} />
          <meshStandardMaterial
            color={isPlaying ? '#285d69' : '#252a2d'}
            metalness={0.72}
            roughness={0.28}
          />
        </mesh>

        {[0.48, 0.72, 0.96, 1.2, 1.44, 1.61].map((radius) => (
          <mesh key={radius} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.081, 0]}>
            <torusGeometry args={[radius, 0.008, 8, 120]} />
            <meshBasicMaterial color="#d5a96d" transparent opacity={0.72} toneMapped={false} />
          </mesh>
        ))}

        <mesh position={[0, 0.09, 0]}>
          <cylinderGeometry args={[0.43, 0.43, 0.025, 64]} />
          <meshStandardMaterial color="#c69a62" metalness={0.52} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.12, 0]}>
          <cylinderGeometry args={[0.085, 0.085, 0.08, 32]} />
          <meshStandardMaterial color="#e8d2ad" metalness={0.85} roughness={0.16} />
        </mesh>
        <mesh position={[0.26, 0.135, 0]}>
          <boxGeometry args={[0.22, 0.025, 0.045]} />
          <meshBasicMaterial color="#3a2718" toneMapped={false} />
        </mesh>
      </group>

      <group ref={needleRef} position={[1.7, 0.2, 0.18]}>
        <mesh rotation={[0, 0, 0.55]} position={[-0.7, 0.42, 0]}>
          <boxGeometry args={[1.55, 0.055, 0.07]} />
          <meshStandardMaterial color="#f1d1a1" metalness={0.84} roughness={0.2} />
        </mesh>
        <mesh>
          <cylinderGeometry args={[0.18, 0.22, 0.14, 32]} />
          <meshStandardMaterial color="#69513b" metalness={0.7} roughness={0.24} />
        </mesh>
      </group>

      <instancedMesh ref={barsRef} args={[null, null, EQ_BAR_COUNT]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial
          vertexColors
          transparent
          opacity={0.86}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </instancedMesh>
    </group>
  )
}

function StepSequencer({
  motionRef,
  compactView,
  pattern,
  isPlaying,
  onStep,
  onPadToggle,
  audioRef,
}) {
  const padRefs = useRef([])
  const lastStepRef = useRef(-1)

  useFrame((state) => {
    const time = state.clock.elapsedTime
    const engine = audioRef.current
    const beatTime = engine?.transport ? getRecordPosition(engine) : time
    const activeStep = isPlaying && !engine?.scratching ? Math.floor(beatTime * HERO_BPM / 60 * 4) % STEP_COUNT : -1

    if (activeStep !== lastStepRef.current) {
      lastStepRef.current = activeStep
      if (activeStep >= 0) onStep(activeStep)
    }

    for (let index = 0; index < STEP_COUNT; index += 1) {
      const column = index % 8
      const row = Math.floor(index / 8)
      const isActive = index === activeStep
      const isProgrammed = pattern[index]
      const pad = padRefs.current[index]
      if (!pad) continue

      pad.position.set(
        (column - 3.5) * (compactView ? 0.38 : 0.48),
        (row - 0.5) * 0.34,
        0,
      )
      pad.rotation.set(-0.18, 0, 0)
      pad.scale.set(
        isActive ? 0.34 : 0.3,
        isActive ? 0.23 : 0.2,
        isActive ? 0.2 : 0.1,
      )

      if (isActive && isProgrammed) color.set('#fff2c7')
      else if (isActive) color.set('#8ce5f1')
      else if (isProgrammed) color.set('#e3aa66')
      else color.set('#568895')
      pad.material.color.copy(color)
    }
  })

  return (
    <group
      position={[
        compactView ? -0.75 : -2.7,
        compactView ? -2.75 : -1.95,
        compactView ? 0.1 : -0.25,
      ]}
      rotation={[0.04, 0, -0.025]}
    >
      <mesh position={[0, 0, -0.1]} renderOrder={4}>
        <boxGeometry args={[compactView ? 3.45 : 4.25, 1.1, 0.18]} />
        <meshBasicMaterial color="#6b472a" depthTest={false} depthWrite={false} />
      </mesh>
      {pattern.map((isProgrammed, index) => (
        <mesh
          key={index}
          ref={(node) => { padRefs.current[index] = node }}
          renderOrder={5}
          onPointerDown={(event) => {
            event.stopPropagation()
            onPadToggle(index)
          }}
          onPointerEnter={() => { document.body.style.cursor = 'pointer' }}
          onPointerLeave={() => { document.body.style.cursor = '' }}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial
            color={isProgrammed ? '#e3aa66' : '#568895'}
            toneMapped={false}
            depthTest={false}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  )
}


export function MusicMachine({ motionRef, compactView, interactionSoundEnabled = true }) {
  const stageRef = useRef(null)
  const audioRef = useRef(null)
  const interactionPulseRef = useRef(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [audioArmed, setAudioArmed] = useState(false)
  const [pattern, setPattern] = useState([
    true, false, false, false,
    true, false, true, false,
    true, false, false, true,
    true, false, true, false,
  ])

  const ensureAudio = () => {
    if (!interactionSoundEnabled) return null
    if (!audioRef.current) audioRef.current = createInstrumentAudio()
    const engine = audioRef.current
    if (engine?.context.state === 'suspended') engine.context.resume()
    if (engine && !engine.transport) startTransport(engine, 1, 1, isPlaying)
    setAudioArmed(Boolean(engine))
    return engine
  }

  const playAccent = (engine, step, immediate = false) => {
    if (!engine) return
    const source = engine.context.createBufferSource()
    const gain = engine.context.createGain()
    source.buffer = engine.drums[step % 4 === 0 ? 'kick' : step % 4 === 2 ? 'snare' : 'hat']
    gain.gain.value = immediate ? 0.24 : 0.07
    source.connect(gain)
    gain.connect(engine.filter)
    source.onended = () => { source.disconnect(); gain.disconnect() }
    source.start()
    interactionPulseRef.current = step % 4 === 0 ? 0.7 : 0.42
  }

  const triggerStep = (step) => {
    if (!audioArmed || !pattern[step]) return
    playAccent(audioRef.current, step)
  }

  const triggerScratch = (amount, elapsed) => {
    const engine = ensureAudio()
    if (!engine) return
    engine.scratching = true
    clearTimeout(engine.scratchHoldTimeout)
    if (Math.abs(amount) < 0.25) holdRecord(engine)
    else setTransportMotion(engine, amount, elapsed)
    engine.scratchHoldTimeout = setTimeout(() => holdRecord(engine), 50)
    interactionPulseRef.current = THREE.MathUtils.clamp(Math.abs(amount) / 18, 0.12, 0.8)
  }

  useEffect(() => {
    audioRef.current?.master.gain.setTargetAtTime(interactionSoundEnabled ? 0.28 : 0, audioRef.current.context.currentTime, 0.02)
  }, [interactionSoundEnabled])

  useEffect(() => () => {
    document.body.style.cursor = ''
    if (audioRef.current) {
      clearTimeout(audioRef.current.scratchHoldTimeout)
      audioRef.current.context.close().catch(() => {})
    }
  }, [])

  useFrame((state, delta) => {
    const motion = motionRef.current
    const time = state.clock.elapsedTime
    interactionPulseRef.current = Math.max(0, interactionPulseRef.current - delta * 2.8)
    motion.audio.level = Math.max(motion.audio.level, interactionPulseRef.current)
    motion.audio.bass = Math.max(motion.audio.bass, interactionPulseRef.current * 0.78)

    if (stageRef.current) {
      stageRef.current.rotation.y = THREE.MathUtils.lerp(
        stageRef.current.rotation.y,
        (motion.scroll - 0.5) * 0.34,
        0.045,
      )
      stageRef.current.position.y = Math.sin(time * 0.2) * 0.06
    }
  })

  return (
    <group ref={stageRef}>
      <StereoWaveform
        motionRef={motionRef}
        compactView={compactView}
        onFilterChange={(position) => {
          const engine = audioRef.current
          if (!engine) return
          const frequency = 220 * Math.pow(36, THREE.MathUtils.clamp(position, 0, 1))
          engine.filter.frequency.setTargetAtTime(
            frequency,
            engine.context.currentTime,
            0.025,
          )
        }}
      />
      <VinylInstrument
        motionRef={motionRef}
        compactView={compactView}
        isPlaying={isPlaying}
        onScratchStart={() => {
          const engine = audioRef.current
          if (!engine) return
          engine.scratching = true
          holdRecord(engine)
        }}
        onRecordToggle={() => {
          const wasArmed = audioArmed
          const engine = ensureAudio()
          if (engine) {
            clearTimeout(engine.scratchHoldTimeout)
            engine.scratching = false
          }
          if (wasArmed) {
            const next = !isPlaying
            setIsPlaying(next)
            if (engine) {
              if (next) startTransport(engine)
              else holdRecord(engine)
            }
          }
        }}
        onScratch={triggerScratch}
        onScratchEnd={() => {
          const engine = audioRef.current
          if (!engine) return
          clearTimeout(engine.scratchHoldTimeout)
          engine.scratching = false
          if (isPlaying) startTransport(engine)
          else holdRecord(engine)
        }}
      />
      <StepSequencer
        motionRef={motionRef}
        compactView={compactView}
        pattern={pattern}
        isPlaying={isPlaying}
        onStep={triggerStep}
        audioRef={audioRef}
        onPadToggle={(index) => {
          playAccent(ensureAudio(), index, true)
          setPattern((current) => current.map((active, padIndex) => (
            padIndex === index ? !active : active
          )))
          interactionPulseRef.current = 0.5
        }}
      />
    </group>
  )
}
