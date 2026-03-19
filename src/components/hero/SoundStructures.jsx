import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { DISCIPLINE_COLORS, DISCIPLINE_ORDER } from './soundSystem'

const dummy = new THREE.Object3D()
const tint = new THREE.Color()

const disciplineMaterial = {
  music: { metalness: 0.38, roughness: 0.18, opacity: 0.72 },
  soundDesign: { metalness: 0.22, roughness: 0.28, opacity: 0.64 },
  gameAudio: { metalness: 0.44, roughness: 0.24, opacity: 0.68 },
  research: { metalness: 0.46, roughness: 0.2, opacity: 0.62 },
  teaching: { metalness: 0.3, roughness: 0.34, opacity: 0.58 },
  technology: { metalness: 0.52, roughness: 0.24, opacity: 0.7 },
}

function GeometryByDiscipline({ discipline }) {
  switch (discipline) {
    case 'music':
      return <torusGeometry args={[1, 0.24, 14, 34]} />
    case 'soundDesign':
      return <sphereGeometry args={[1, 16, 14]} />
    case 'gameAudio':
      return <icosahedronGeometry args={[1, 0]} />
    case 'research':
      return <octahedronGeometry args={[1.05, 0]} />
    case 'teaching':
      return <coneGeometry args={[0.72, 1.4, 7]} />
    case 'technology':
      return <boxGeometry args={[1, 1, 1]} />
    default:
      return <sphereGeometry args={[1, 10, 10]} />
  }
}

export function SoundStructures({ descriptors, structurePositionsRef, motionRef }) {
  const meshRefs = useRef({})

  const groups = useMemo(
    () => DISCIPLINE_ORDER.map((discipline) => ({
      discipline,
      descriptors: descriptors.filter((item) => item.discipline === discipline),
    })),
    [descriptors],
  )

  useEffect(() => {
    groups.forEach((group) => {
      const mesh = meshRefs.current[group.discipline]
      if (!mesh) return

      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)

      group.descriptors.forEach((descriptor, localIndex) => {
        const mixAmount = localIndex / Math.max(1, group.descriptors.length - 1)
        tint.set(DISCIPLINE_COLORS[group.discipline])
        tint.offsetHSL((mixAmount - 0.5) * 0.06, 0.05, 0.03)
        mesh.setColorAt(localIndex, tint)
      })

      if (mesh.instanceColor) {
        mesh.instanceColor.needsUpdate = true
      }
    })
  }, [groups])

  useFrame((state) => {
    const time = state.clock.elapsedTime
    const motion = motionRef.current

    groups.forEach((group) => {
      const mesh = meshRefs.current[group.discipline]
      if (!mesh) return

      group.descriptors.forEach((descriptor, localIndex) => {
        const position = structurePositionsRef.current[descriptor.index]
        const breathe = 1 + (Math.sin((time * 0.94) + descriptor.breatheOffset) * 0.09)
        const pulse = 1 + (motion.audio.level * 0.08)
        const harmonicLift = 1 + (motion.harmony * 0.16)
        const scale = descriptor.baseScale * breathe * pulse * harmonicLift

        dummy.position.copy(position)
        dummy.rotation.set(
          (Math.sin((time * 0.28) + descriptor.routePhase) * 0.36) + (motion.pointer.y * 0.2),
          (time * 0.18) + descriptor.baseAngle + (motion.pointer.x * 0.24),
          Math.cos((time * 0.21) + descriptor.routePhase) * 0.32,
        )

        if (group.discipline === 'teaching') {
          dummy.scale.set(scale * 0.65, scale * 1.4, scale * 0.65)
        } else if (group.discipline === 'music') {
          dummy.scale.set(scale * 1.25, scale * 1.25, scale * 0.65)
        } else if (group.discipline === 'soundDesign') {
          dummy.scale.set(scale * 1.12, scale * 0.86, scale * 1.3)
        } else {
          dummy.scale.setScalar(scale)
        }

        dummy.updateMatrix()
        mesh.setMatrixAt(localIndex, dummy.matrix)
      })

      mesh.instanceMatrix.needsUpdate = true
    })
  })

  return (
    <group>
      {groups.map((group) => {
        const material = disciplineMaterial[group.discipline]
        return (
          <instancedMesh
            key={group.discipline}
            ref={(node) => {
              meshRefs.current[group.discipline] = node
            }}
            args={[null, null, group.descriptors.length]}
            frustumCulled={false}
          >
            <GeometryByDiscipline discipline={group.discipline} />
            <meshStandardMaterial
              vertexColors
              transparent
              opacity={material.opacity}
              metalness={material.metalness}
              roughness={material.roughness}
              emissive={DISCIPLINE_COLORS[group.discipline]}
              emissiveIntensity={0.18}
            />
          </instancedMesh>
        )
      })}
    </group>
  )
}
