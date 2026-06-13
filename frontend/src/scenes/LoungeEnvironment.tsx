import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Environment, MeshReflectorMaterial, SpotLight } from '@react-three/drei';
import * as THREE from 'three';

function FloatingDust() {
  const pointsRef = useRef<THREE.Points>(null);
  const count = 300;

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20; // x
      pos[i * 3 + 1] = Math.random() * 10; // y
      pos[i * 3 + 2] = (Math.random() - 0.5) * 20; // z
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
      <pointsMaterial size={0.04} color="#F6B73C" transparent opacity={0.4} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

function AbstractLounge() {
  // Simulating large glass windows and neon accents
  return (
    <group position={[0, 0, 0]}>
      {/* Floor */}
      <mesh receiveShadow position={[0, -5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#0A0812" roughness={0.8} />
      </mesh>
      
      {/* City Skyline simulated by neon vertical strips */}
      {Array.from({ length: 20 }).map((_, i) => (
        <mesh key={i} position={[(Math.random() - 0.5) * 40, Math.random() * 5 + 2, -20]} receiveShadow>
          <boxGeometry args={[Math.random() * 2 + 0.5, Math.random() * 15 + 5, 0.5]} />
          <meshStandardMaterial color={Math.random() > 0.5 ? "#3B82F6" : "#22C55E"} emissive={Math.random() > 0.5 ? "#3B82F6" : "#22C55E"} emissiveIntensity={0.2} roughness={0.2} metalness={0.8} />
        </mesh>
      ))}

      {/* Glass Pane "Windows" */}
      <mesh position={[0, 5, -15]} rotation={[0, 0, 0]}>
        <planeGeometry args={[60, 20]} />
        <meshPhysicalMaterial color="#ffffff" transmission={0.9} opacity={1} transparent roughness={0.1} ior={1.5} thickness={0.5} />
      </mesh>
    </group>
  );
}

export function LoungeEnvironment() {
  return (
    <group>
      {/* High-quality studio environment for reflections (simulating city lights/lounge) */}
      <Environment preset="night" background blur={0.6} />

      <AbstractLounge />

      {/* Main Luxury Wooden Table */}
      <mesh receiveShadow position={[0, -0.2, 0]}>
        <cylinderGeometry args={[12, 12, 0.4, 64]} />
        <meshStandardMaterial color="#2d1b10" roughness={0.15} metalness={0.1} />
      </mesh>

      {/* Table Gold Trim */}
      <mesh receiveShadow position={[0, 0.02, 0]}>
        <ringGeometry args={[11.8, 12.2, 64]} />
        <meshStandardMaterial color="#F6B73C" roughness={0.2} metalness={0.8} />
      </mesh>
      <mesh receiveShadow position={[0, -0.42, 0]}>
        <cylinderGeometry args={[12.2, 12.2, 0.05, 64]} />
        <meshStandardMaterial color="#F6B73C" roughness={0.2} metalness={0.8} />
      </mesh>

      {/* Glass overlay on table for reflections */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[11.8, 64]} />
        <MeshReflectorMaterial
          blur={[400, 100]}
          resolution={1024}
          mirror={0.9}
          mixBlur={1.5}
          mixStrength={50}
          roughness={0.15}
          depthScale={1.2}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          color="#0A0812"
          metalness={0.6}
        />
      </mesh>

      {/* Ambient Lounge Lighting */}
      <ambientLight intensity={0.15} color="#ffffff" />
      
      {/* Warm god ray spotlight above the table */}
      <SpotLight
        position={[0, 18, 0]}
        angle={0.7}
        penumbra={0.8}
        intensity={2.0}
        color="#F6B73C"
        castShadow
        shadow-mapSize={[2048, 2048]}
        distance={30}
        attenuation={5}
        anglePower={4}
        volumetric={true}
      />

      {/* Cool neon rim lights */}
      <pointLight position={[-12, 5, -12]} intensity={2.5} color="#3B82F6" distance={25} />
      <pointLight position={[12, 5, -12]} intensity={2.5} color="#22C55E" distance={25} />
      <pointLight position={[0, 3, 12]} intensity={1.5} color="#EF4444" distance={20} />

      {/* Ambient dust */}
      <FloatingDust />

      <fog attach="fog" args={['#0A0812', 15, 35]} />
    </group>
  );
}
