import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { NETWORK_FRAGMENT, NETWORK_VERTEX } from './shaders'
import {
  CONNECTION_STEPS,
  getConnectionReroute,
  seeded,
} from './soundSystem'

const pulseDummy = new THREE.Object3D()
const pulseColor = new THREE.Color()
const upAxis = new THREE.Vector3(0, 1, 0)
const tempStart = new THREE.Vector3()
const tempEnd = new THREE.Vector3()
const tempReroute = new THREE.Vector3()
const tempTo = new THREE.Vector3()
const tempMid = new THREE.Vector3()
const tempDir = new THREE.Vector3()
const tempNormal = new THREE.Vector3()
const tempControl = new THREE.Vector3()
const tempCurveA = new THREE.Vector3()
const tempCurveB = new THREE.Vector3()
const tempCurveResult = new THREE.Vector3()

const PULSE_COUNT = 96

function quadraticPoint(start, control, end, t, target) {
  tempCurveA.copy(start).lerp(control, t)
  tempCurveB.copy(control).lerp(end, t)
  target.copy(tempCurveA).lerp(tempCurveB, t)
  return target
}

function getConnectionCurve(connection, positions, time, pointer, outStart, outControl, outEnd) {
  outStart.copy(positions[connection.from])
  tempEnd.copy(positions[connection.to])
  tempReroute.copy(positions[connection.rerouteTo])

  const rerouteMix = getConnectionReroute(connection, time)
  outEnd.copy(tempEnd).lerp(tempReroute, rerouteMix)

  tempMid.copy(outStart).lerp(outEnd, 0.5)
  tempDir.copy(outEnd).sub(outStart)
  tempNormal.crossVectors(tempDir, upAxis).normalize()

  outControl.copy(tempMid)
  outControl.addScaledVector(tempNormal, connection.bend * (0.58 + rerouteMix * 0.42))
  outControl.y += Math.sin((time * 0.9) + connection.phase) * 0.22
  outControl.x += pointer.x * 0.32
  outControl.y += pointer.y * 0.24
}

export function SignalNetwork({ connections, structurePositionsRef, motionRef }) {
  const lineGeometry = useMemo(() => {
    const segmentCount = connections.length * (CONNECTION_STEPS - 1)
    const vertexCount = segmentCount * 2

    const positions = new Float32Array(vertexCount * 3)
    const along = new Float32Array(vertexCount)
    const phase = new Float32Array(vertexCount)
    const speed = new Float32Array(vertexCount)
    const brightness = new Float32Array(vertexCount)

    let cursor = 0
    connections.forEach((connection) => {
      for (let step = 0; step < CONNECTION_STEPS - 1; step += 1) {
        const t0 = step / (CONNECTION_STEPS - 1)
        const t1 = (step + 1) / (CONNECTION_STEPS - 1)

        along[cursor] = t0
        phase[cursor] = connection.phase
        speed[cursor] = connection.speed
        brightness[cursor] = connection.brightness
        cursor += 1

        along[cursor] = t1
        phase[cursor] = connection.phase
        speed[cursor] = connection.speed
        brightness[cursor] = connection.brightness
        cursor += 1
      }
    })

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('aAlong', new THREE.BufferAttribute(along, 1))
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1))
    geometry.setAttribute('aSpeed', new THREE.BufferAttribute(speed, 1))
    geometry.setAttribute('aBrightness', new THREE.BufferAttribute(brightness, 1))
    return geometry
  }, [connections])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAudio: { value: 0 },
      uHarmony: { value: 0 },
    }),
    [],
  )

  const pulseMeshRef = useRef(null)

  const pulseMeta = useMemo(
    () =>
      Array.from({ length: PULSE_COUNT }, (_, index) => ({
        connectionIndex: Math.floor(seeded(index, 170) * connections.length),
        progress: seeded(index, 177),
        speed: 0.06 + (seeded(index, 183) * 0.16),
      })),
    [connections.length],
  )

  useEffect(() => {
    lineGeometry.getAttribute('position').setUsage(THREE.DynamicDrawUsage)
  }, [lineGeometry])

  useEffect(() => {
    if (!pulseMeshRef.current) return
    pulseMeshRef.current.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    for (let index = 0; index < PULSE_COUNT; index += 1) {
      pulseColor.setRGB(0.3, 0.62, 1)
      pulseMeshRef.current.setColorAt(index, pulseColor)
    }
    if (pulseMeshRef.current.instanceColor) {
      pulseMeshRef.current.instanceColor.needsUpdate = true
    }
  }, [])

  useFrame((state, delta) => {
    const motion = motionRef.current
    const positions = structurePositionsRef.current
    const time = state.clock.elapsedTime
    const positionAttr = lineGeometry.getAttribute('position')
    const data = positionAttr.array

    uniforms.uTime.value = time
    uniforms.uAudio.value = motion.audio.level
    uniforms.uHarmony.value = motion.harmony

    let cursor = 0
    for (let index = 0; index < connections.length; index += 1) {
      const connection = connections[index]
      getConnectionCurve(
        connection,
        positions,
        time,
        motion.pointer,
        tempStart,
        tempControl,
        tempTo,
      )

      for (let step = 0; step < CONNECTION_STEPS - 1; step += 1) {
        const t0 = step / (CONNECTION_STEPS - 1)
        const t1 = (step + 1) / (CONNECTION_STEPS - 1)

        quadraticPoint(tempStart, tempControl, tempTo, t0, tempCurveResult)
        data[cursor * 3] = tempCurveResult.x
        data[(cursor * 3) + 1] = tempCurveResult.y
        data[(cursor * 3) + 2] = tempCurveResult.z
        cursor += 1

        quadraticPoint(tempStart, tempControl, tempTo, t1, tempCurveResult)
        data[cursor * 3] = tempCurveResult.x
        data[(cursor * 3) + 1] = tempCurveResult.y
        data[(cursor * 3) + 2] = tempCurveResult.z
        cursor += 1
      }
    }

    positionAttr.needsUpdate = true

    if (!pulseMeshRef.current) return

    pulseMeta.forEach((pulse, index) => {
      const connection = connections[pulse.connectionIndex]
      getConnectionCurve(
        connection,
        positions,
        time,
        motion.pointer,
        tempStart,
        tempControl,
        tempTo,
      )

      pulse.progress = (pulse.progress + (delta * pulse.speed * (1.1 + motion.audio.level * 0.65))) % 1
      quadraticPoint(tempStart, tempControl, tempTo, pulse.progress, tempCurveResult)

      pulseDummy.position.copy(tempCurveResult)
      pulseDummy.scale.setScalar(0.022 + (motion.audio.level * 0.018) + (motion.harmony * 0.014))
      pulseDummy.updateMatrix()

      pulseMeshRef.current.setMatrixAt(index, pulseDummy.matrix)

      const hot = Math.exp(-Math.abs(0.5 - pulse.progress) * 6)
      pulseColor.setRGB(
        0.28 + hot * 0.64,
        0.58 + (motion.audio.level * 0.24),
        1.0,
      )
      pulseMeshRef.current.setColorAt(index, pulseColor)
    })

    pulseMeshRef.current.instanceMatrix.needsUpdate = true
    if (pulseMeshRef.current.instanceColor) {
      pulseMeshRef.current.instanceColor.needsUpdate = true
    }
  })

  return (
    <group>
      <lineSegments frustumCulled={false}>
        <primitive object={lineGeometry} attach="geometry" />
        <shaderMaterial
          uniforms={uniforms}
          vertexShader={NETWORK_VERTEX}
          fragmentShader={NETWORK_FRAGMENT}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </lineSegments>

      <instancedMesh ref={pulseMeshRef} args={[null, null, PULSE_COUNT]} frustumCulled={false}>
        <sphereGeometry args={[1, 10, 10]} />
        <meshBasicMaterial
          vertexColors
          transparent
          opacity={0.88}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </instancedMesh>
    </group>
  )
}
