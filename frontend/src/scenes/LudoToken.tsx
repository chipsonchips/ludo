import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { LudoColor } from '@/ludo/types';
import { getColorHex } from '@/ludo/boardLayout';

interface LudoTokenMeshProps {
  color: LudoColor;
  position: [number, number, number];
  isSelectable: boolean;
  isSelected: boolean;
  onClick?: () => void;
}

export function LudoTokenMesh({
  color,
  position,
  isSelectable,
  isSelected,
  onClick,
}: LudoTokenMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const hex = getColorHex(color);

  useFrame((state) => {
    if (!groupRef.current) return;
    if (isSelectable) {
      groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 4) * 0.04;
    } else {
      groupRef.current.position.y = position[1];
    }
  });

  return (
    <group
      ref={groupRef}
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        if (isSelectable) onClick?.();
      }}
    >
      {isSelectable && (
        <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.14, 0.2, 32]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.6} />
        </mesh>
      )}
      {isSelected && (
        <pointLight position={[0, 0.3, 0]} intensity={0.5} color={hex} distance={1} />
      )}
      {/* Pawn base */}
      <mesh castShadow position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.1, 0.12, 0.06, 20]} />
        <meshStandardMaterial color={hex} roughness={0.25} metalness={0.35} />
      </mesh>
      {/* Pawn body */}
      <mesh castShadow position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.07, 0.09, 0.09, 20]} />
        <meshStandardMaterial color={hex} roughness={0.2} metalness={0.4} />
      </mesh>
      {/* Pawn head */}
      <mesh castShadow position={[0, 0.19, 0]}>
        <sphereGeometry args={[0.07, 16, 16]} />
        <meshStandardMaterial
          color={hex}
          roughness={0.15}
          metalness={0.45}
          emissive={isSelected ? hex : '#000000'}
          emissiveIntensity={isSelected ? 0.4 : 0}
        />
      </mesh>
    </group>
  );
}
