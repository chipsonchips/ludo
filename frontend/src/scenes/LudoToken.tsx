import { useRef, useState } from 'react';
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
  const ringRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const hex = getColorHex(color);

  useFrame((state) => {
    if (!groupRef.current) return;
    
    // Smooth vertical position interpolation
    const targetY = position[1] + (hovered || isSelected ? 0.08 : 0) + (isSelectable ? Math.sin(state.clock.elapsedTime * 4) * 0.04 : 0);
    groupRef.current.position.y += (targetY - groupRef.current.position.y) * 0.2;

    if (ringRef.current && isSelectable) {
      ringRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 6) * 0.1);
      (ringRef.current.material as THREE.MeshBasicMaterial).opacity = 0.5 + Math.sin(state.clock.elapsedTime * 6) * 0.3;
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
      onPointerOver={(e) => {
        e.stopPropagation();
        if (isSelectable) {
          document.body.style.cursor = 'pointer';
          setHovered(true);
        }
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default';
        setHovered(false);
      }}
    >
      {isSelectable && (
        <mesh ref={ringRef} position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.16, 0.22, 32]} />
          <meshBasicMaterial color="#F6B73C" transparent opacity={0.8} />
        </mesh>
      )}
      {isSelected && (
        <pointLight position={[0, 0.4, 0]} intensity={1.5} color={hex} distance={1.5} />
      )}
      
      {/* Pawn base */}
      <mesh castShadow receiveShadow position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.1, 0.12, 0.06, 32]} />
        <meshStandardMaterial color={hex} roughness={0.1} metalness={0.6} />
      </mesh>
      
      {/* Pawn body */}
      <mesh castShadow receiveShadow position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.07, 0.09, 0.09, 32]} />
        <meshStandardMaterial color={hex} roughness={0.1} metalness={0.6} />
      </mesh>
      
      {/* Pawn head */}
      <mesh castShadow receiveShadow position={[0, 0.19, 0]}>
        <sphereGeometry args={[0.08, 32, 32]} />
        <meshStandardMaterial
          color={hex}
          roughness={0.05}
          metalness={0.8}
          emissive={isSelected || hovered ? hex : '#000000'}
          emissiveIntensity={isSelected ? 0.6 : hovered ? 0.3 : 0}
        />
      </mesh>
    </group>
  );
}
