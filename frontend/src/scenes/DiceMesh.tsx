import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import { RapierRigidBody, CuboidCollider, RigidBody } from '@react-three/rapier';
import * as THREE from 'three';

const PIP_POSITIONS: Record<number, [number, number, number][]> = {
  1: [[0, 0, 0]],
  2: [[-0.12, 0.12, 0], [0.12, -0.12, 0]],
  3: [[-0.12, 0.12, 0], [0, 0, 0], [0.12, -0.12, 0]],
  4: [[-0.12, 0.12, 0], [0.12, 0.12, 0], [-0.12, -0.12, 0], [0.12, -0.12, 0]],
  5: [[-0.12, 0.12, 0], [0.12, 0.12, 0], [0, 0, 0], [-0.12, -0.12, 0], [0.12, -0.12, 0]],
  6: [[-0.12, 0.14, 0], [0.12, 0.14, 0], [-0.12, 0, 0], [0.12, 0, 0], [-0.12, -0.14, 0], [0.12, -0.14, 0]],
};

function PipFace({ value, position, rotation }: { value: number; position: [number, number, number]; rotation: [number, number, number] }) {
  const pips = PIP_POSITIONS[value] ?? PIP_POSITIONS[1];
  return (
    <group position={position} rotation={rotation}>
      {pips.map((p, i) => (
        <mesh key={i} position={p}>
          <circleGeometry args={[value === 1 ? 0.065 : 0.045, 32]} />
          <meshStandardMaterial color="#1a1a2e" roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

interface DiceMeshProps {
  position: [number, number, number];
  impulse?: [number, number, number];
  torque?: [number, number, number];
  onSettle?: (value: number) => void;
  color?: string;
}

export function DiceMesh({ position, impulse, torque, onSettle, color = '#f8f8ff' }: DiceMeshProps) {
  const ref = useRef<RapierRigidBody>(null);
  const settled = useRef(false);
  const settleTimer = useRef(0);
  const impulseApplied = useRef(false);
  const hasMovedOnce = useRef(false);
  // Store impulse/torque at mount time so they survive the 100ms clear
  const savedImpulse = useRef(impulse);
  const savedTorque = useRef(torque);
  if (impulse) savedImpulse.current = impulse;
  if (torque) savedTorque.current = torque;

  const faceRotations: { value: number; position: [number, number, number]; rotation: [number, number, number] }[] = useMemo(
    () => [
      { value: 1, position: [0, 0, 0.251], rotation: [0, 0, 0] },
      { value: 6, position: [0, 0, -0.251], rotation: [Math.PI, 0, 0] },
      { value: 2, position: [0.251, 0, 0], rotation: [0, Math.PI / 2, 0] },
      { value: 5, position: [-0.251, 0, 0], rotation: [0, -Math.PI / 2, 0] },
      { value: 3, position: [0, 0.251, 0], rotation: [-Math.PI / 2, 0, 0] },
      { value: 4, position: [0, -0.251, 0], rotation: [Math.PI / 2, 0, 0] },
    ],
    []
  );

  useFrame((_, delta) => {
    if (!ref.current) return;

    // Apply impulse on first available frame when the body is ready
    if (!impulseApplied.current && savedImpulse.current) {
      try {
        ref.current.applyImpulse(
          { x: savedImpulse.current[0], y: savedImpulse.current[1], z: savedImpulse.current[2] },
          true
        );
        if (savedTorque.current) {
          ref.current.applyTorqueImpulse(
            { x: savedTorque.current[0], y: savedTorque.current[1], z: savedTorque.current[2] },
            true
          );
        }
        impulseApplied.current = true;
      } catch {
        // Body not ready yet, will retry next frame
      }
      return;
    }

    if (settled.current) return;

    const vel = ref.current.linvel();
    const angVel = ref.current.angvel();
    const speed = Math.sqrt(vel.x ** 2 + vel.y ** 2 + vel.z ** 2);
    const angSpeed = Math.sqrt(angVel.x ** 2 + angVel.y ** 2 + angVel.z ** 2);

    // Only start checking for settle after the dice has actually moved
    if (!hasMovedOnce.current) {
      if (speed > 0.5 || angSpeed > 1) {
        hasMovedOnce.current = true;
      }
      return;
    }

    if (speed < 0.05 && angSpeed < 0.5) {
      settleTimer.current += delta;
      if (settleTimer.current > 0.5) {
        settled.current = true;
        const rot = ref.current.rotation();
        const quat = new THREE.Quaternion(rot.x, rot.y, rot.z, rot.w);
        const up = new THREE.Vector3(0, 1, 0);
        const faceValues = [3, 4, 2, 5, 1, 6];
        const normals = [
          new THREE.Vector3(0, 1, 0),
          new THREE.Vector3(0, -1, 0),
          new THREE.Vector3(1, 0, 0),
          new THREE.Vector3(-1, 0, 0),
          new THREE.Vector3(0, 0, 1),
          new THREE.Vector3(0, 0, -1),
        ];
        let bestDot = -1;
        let bestValue = 1;
        normals.forEach((n, i) => {
          const rotated = n.clone().applyQuaternion(quat);
          const dot = rotated.dot(up);
          if (dot > bestDot) {
            bestDot = dot;
            bestValue = faceValues[i];
          }
        });
        onSettle?.(bestValue);
      }
    } else {
      settleTimer.current = 0;
    }
  });

  return (
    <RigidBody
      ref={ref}
      position={position}
      restitution={0.45}
      friction={0.8}
      linearDamping={0.3}
      angularDamping={0.4}
      colliders={false}
    >
      <CuboidCollider args={[0.26, 0.26, 0.26]} />
      <RoundedBox args={[0.5, 0.5, 0.5]} radius={0.06} smoothness={4} castShadow receiveShadow>
        <meshStandardMaterial color={color} roughness={0.25} metalness={0.1} />
      </RoundedBox>
      {faceRotations.map((face) => (
        <PipFace key={face.value} value={face.value} position={face.position} rotation={face.rotation} />
      ))}
    </RigidBody>
  );
}
