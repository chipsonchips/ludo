import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import * as THREE from 'three';

function FloatingDust() {
  const pointsRef = useRef<THREE.Points>(null);
  const count = 200;

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 16;
      pos[i * 3 + 1] = Math.random() * 8;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 16;
    }
    return pos;
  }, []);

  useFrame((state) => {
    if (!pointsRef.current) return;
    pointsRef.current.rotation.y = state.clock.elapsedTime * 0.01;
    pointsRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.1) * 0.2;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.03} color="#F6B73C" transparent opacity={0.3} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

export function LoungeEnvironment() {
  return (
    <group>
      <Environment preset="night" background blur={0.8} />

      {/* Floor far below */}
      <mesh receiveShadow position={[0, -5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#0A0812" roughness={0.9} />
      </mesh>

      {/* Table — snug around the board */}
      <mesh receiveShadow position={[0, -0.15, 0]}>
        <cylinderGeometry args={[5, 5, 0.3, 64]} />
        <meshStandardMaterial color="#2d1b10" roughness={0.6} metalness={0.05} />
      </mesh>

      {/* Table gold rim */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[4.85, 5.05, 64]} />
        <meshStandardMaterial color="#F6B73C" roughness={0.3} metalness={0.7} />
      </mesh>

      {/* ── Lighting ── */}

      {/* Strong ambient so the board is always readable */}
      <ambientLight intensity={0.5} color="#ffffff" />

      {/* Warm key light directly above the board */}
      <directionalLight
        position={[0, 14, 0]}
        intensity={1.8}
        color="#fff5e0"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={1}
        shadow-camera-far={25}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
      />

      {/* Subtle colored accent lights pushed far out */}
      <pointLight position={[-8, 4, -8]} intensity={1.2} color="#3B82F6" distance={18} />
      <pointLight position={[8, 4, -8]} intensity={1.2} color="#22C55E" distance={18} />
      <pointLight position={[0, 3, 8]} intensity={0.8} color="#EF4444" distance={15} />

      <FloatingDust />

      {/* Fog pushed far enough to not affect the board */}
      <fog attach="fog" args={['#0A0812', 25, 50]} />
    </group>
  );
}
