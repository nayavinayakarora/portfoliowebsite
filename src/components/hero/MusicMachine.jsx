import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

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
      const transportSpeed = isPlaying ? 0.48 + motion.scroll * 0.7 : 0
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
            dragRef.current.moved = false
            document.body.style.cursor = 'grabbing'
          }}
          onPointerMove={(event) => {
            const drag = dragRef.current
            if (!drag.active || drag.pointerId !== event.pointerId) return
            event.stopPropagation()
            const deltaX = event.clientX - drag.lastX
            drag.lastX = event.clientX
            drag.moved = drag.moved || Math.abs(deltaX) > 2
            drag.velocity = THREE.MathUtils.clamp(deltaX * 0.72, -18, 18)
            onScratch(deltaX)
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
}) {
  const padRefs = useRef([])
  const lastStepRef = useRef(-1)

  useFrame((state) => {
    const time = state.clock.elapsedTime
    const activeStep = isPlaying ? Math.floor(time * 4.7) % STEP_COUNT : -1

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

function createInstrumentAudio() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext
  if (!AudioContextClass) return null

  const context = new AudioContextClass()
  const filter = context.createBiquadFilter()
  const compressor = context.createDynamicsCompressor()
  const master = context.createGain()
  const noiseBuffer = context.createBuffer(1, context.sampleRate * 0.12, context.sampleRate)
  const noise = noiseBuffer.getChannelData(0)
  const loopDuration = 4
  const loopBuffer = context.createBuffer(1, context.sampleRate * loopDuration, context.sampleRate)
  const reverseLoopBuffer = context.createBuffer(1, context.sampleRate * loopDuration, context.sampleRate)
  const loop = loopBuffer.getChannelData(0)
  const reverseLoop = reverseLoopBuffer.getChannelData(0)
  const chord = [110, 130.81, 164.81, 196]

  for (let index = 0; index < noise.length; index += 1) {
    noise[index] = (Math.random() * 2) - 1
  }

  for (let index = 0; index < loop.length; index += 1) {
    const time = index / context.sampleRate
    const eighth = (time * 4) % 1
    const pluckEnvelope = Math.exp(-eighth * 7)
    const chordTone = chord.reduce((sum, frequency, chordIndex) => (
      sum + Math.sin(Math.PI * 2 * frequency * time + chordIndex * 0.42)
    ), 0) / chord.length
    const bassEnvelope = Math.exp(-((time * 2) % 1) * 9)
    const bass = Math.sin(Math.PI * 2 * 55 * time) * bassEnvelope
    const texture = (Math.random() * 2 - 1) * 0.018
    loop[index] = (chordTone * pluckEnvelope * 0.34) + (bass * 0.22) + texture
  }

  for (let index = 0; index < loop.length; index += 1) {
    reverseLoop[index] = loop[loop.length - index - 1]
  }

  filter.type = 'lowpass'
  filter.frequency.value = 6200
  filter.Q.value = 0.8
  compressor.threshold.value = -18
  compressor.knee.value = 12
  compressor.ratio.value = 8
  compressor.attack.value = 0.004
  compressor.release.value = 0.12
  master.gain.value = 0.16

  filter.connect(compressor)
  compressor.connect(master)
  master.connect(context.destination)

  return {
    context,
    filter,
    master,
    noiseBuffer,
    loopBuffer,
    reverseLoopBuffer,
    transport: null,
    transportDirection: 1,
    lastScratchAt: 0,
  }
}

function startTransport(engine, direction = 1, rate = 1, audible = true) {
  const now = engine.context.currentTime
  const previous = engine.transport
  const source = engine.context.createBufferSource()
  const gain = engine.context.createGain()

  source.buffer = direction < 0 ? engine.reverseLoopBuffer : engine.loopBuffer
  source.loop = true
  source.playbackRate.value = rate
  gain.gain.setValueAtTime(0.001, now)
  gain.gain.exponentialRampToValueAtTime(audible ? 0.095 : 0.001, now + 0.025)
  source.connect(gain)
  gain.connect(engine.filter)
  source.start(now)

  if (previous) {
    previous.gain.gain.cancelScheduledValues(now)
    previous.gain.gain.setValueAtTime(
      Math.max(0.001, previous.gain.gain.value),
      now,
    )
    previous.gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025)
    previous.source.stop(now + 0.04)
  }

  engine.transport = { source, gain }
  engine.transportDirection = direction
}

function setTransportMotion(engine, amount, audible) {
  const direction = amount < 0 ? -1 : 1
  const rate = THREE.MathUtils.clamp(Math.abs(amount) / 3.5, 0.22, 4)

  if (!engine.transport || engine.transportDirection !== direction) {
    startTransport(engine, direction, rate, audible)
    return
  }

  engine.transport.source.playbackRate.setTargetAtTime(
    rate,
    engine.context.currentTime,
    0.018,
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

  const triggerStep = (step) => {
    if (!audioArmed || !pattern[step]) return
    const engine = audioRef.current
    if (!engine) return

    const { context, filter } = engine
    const now = context.currentTime
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    const isDownbeat = step % 4 === 0

    oscillator.type = isDownbeat ? 'sine' : 'triangle'
    oscillator.frequency.setValueAtTime(isDownbeat ? 118 : 310 + (step % 5) * 42, now)
    oscillator.frequency.exponentialRampToValueAtTime(isDownbeat ? 46 : 155, now + 0.11)
    gain.gain.setValueAtTime(isDownbeat ? 0.34 : 0.13, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + (isDownbeat ? 0.2 : 0.09))
    oscillator.connect(gain)
    gain.connect(filter)
    oscillator.start(now)
    oscillator.stop(now + 0.22)
    interactionPulseRef.current = isDownbeat ? 0.7 : 0.42
  }

  const triggerScratch = (amount) => {
    const engine = ensureAudio()
    if (!engine || Math.abs(amount) < 0.5) return
    setTransportMotion(engine, amount, true)
    const now = engine.context.currentTime
    if (now - engine.lastScratchAt < 0.03) return
    engine.lastScratchAt = now

    const source = engine.context.createBufferSource()
    const scratchFilter = engine.context.createBiquadFilter()
    const gain = engine.context.createGain()
    const intensity = THREE.MathUtils.clamp(Math.abs(amount) / 18, 0.12, 0.8)

    source.buffer = engine.noiseBuffer
    scratchFilter.type = 'bandpass'
    scratchFilter.frequency.value = 700 + intensity * 3200
    scratchFilter.Q.value = 2.4
    gain.gain.setValueAtTime(intensity * 0.28, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09)
    source.connect(scratchFilter)
    scratchFilter.connect(gain)
    gain.connect(engine.filter)
    source.start(now)
    source.stop(now + 0.095)
    interactionPulseRef.current = Math.max(interactionPulseRef.current, intensity)
  }

  useEffect(() => () => {
    document.body.style.cursor = ''
    if (audioRef.current) audioRef.current.context.close()
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
        onRecordToggle={() => {
          const wasArmed = audioArmed
          const engine = ensureAudio()
          if (wasArmed) {
            setIsPlaying((current) => {
              const next = !current
              if (engine?.transport) {
                engine.transport.gain.gain.setTargetAtTime(
                  next ? 0.095 : 0.001,
                  engine.context.currentTime,
                  0.025,
                )
              }
              return next
            })
          }
        }}
        onScratch={triggerScratch}
        onScratchEnd={() => {
          const engine = audioRef.current
          if (!engine) return
          startTransport(engine, 1, 1, isPlaying)
        }}
      />
      <StepSequencer
        motionRef={motionRef}
        compactView={compactView}
        pattern={pattern}
        isPlaying={isPlaying}
        onStep={triggerStep}
        onPadToggle={(index) => {
          ensureAudio()
          setPattern((current) => current.map((active, padIndex) => (
            padIndex === index ? !active : active
          )))
          interactionPulseRef.current = 0.5
        }}
      />
    </group>
  )
}
