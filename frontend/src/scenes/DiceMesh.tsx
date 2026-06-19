import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import { RapierRigidBody, CuboidCollider, RigidBody } from '@react-three/rapier';
import * as THREE from 'three';

const S = 0.6;

const PIP_POSITIONS: Record<number, [number, number, number][]> = {
  1: [[0, 0, 0]],
  2: [[-0.12 * S, 0.12 * S, 0], [0.12 * S, -0.12 * S, 0]],
  3: [[-0.12 * S, 0.12 * S, 0], [0, 0, 0], [0.12 * S, -0.12 * S, 0]],
  4: [[-0.12 * S, 0.12 * S, 0], [0.12 * S, 0.12 * S, 0], [-0.12 * S, -0.12 * S, 0], [0.12 * S, -0.12 * S, 0]],
  5: [[-0.12 * S, 0.12 * S, 0], [0.12 * S, 0.12 * S, 0], [0, 0, 0], [-0.12 * S, -0.12 * S, 0], [0.12 * S, -0.12 * S, 0]],
  6: [[-0.12 * S, 0.14 * S, 0], [0.12 * S, 0.14 * S, 0], [-0.12 * S, 0, 0], [0.12 * S, 0, 0], [-0.12 * S, -0.14 * S, 0], [0.12 * S, -0.14 * S, 0]],
};

function PipFace({ value, position, rotation, pipColor }: { value: number; position: [number, number, number]; rotation: [number, number, number]; pipColor: string }) {
  const pips = PIP_POSITIONS[value] ?? PIP_POSITIONS[1];
  return (
    <group position={position} rotation={rotation}>
      {pips.map((p, i) => (
        <mesh key={i} position={p}>
          <circleGeometry args={[value === 1 ? 0.065 * S : 0.045 * S, 32]} />
          <meshStandardMaterial color={pipColor} roughness={0.4} metalness={0.6} />
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
  pipColor?: string;
}

const FACE_OFFSET = 0.251 * S;

export function DiceMesh({ position, impulse, torque, onSettle, color = '#f8f8ff', pipColor = '#1a1a2e' }: DiceMeshProps) {
  const ref = useRef<RapierRigidBody>(null);
  const settled = useRef(false);
  const settleTimer = useRef(0);
  const elapsedTime = useRef(0);
  const impulseApplied = useRef(false);
  const savedImpulse = useRef(impulse);
  const savedTorque = useRef(torque);
  if (impulse) savedImpulse.current = impulse;
  if (torque) savedTorque.current = torque;

  const faceRotations: { value: number; position: [number, number, number]; rotation: [number, number, number] }[] = useMemo(
    () => [
      { value: 1, position: [0, 0, FACE_OFFSET], rotation: [0, 0, 0] },
      { value: 6, position: [0, 0, -FACE_OFFSET], rotation: [Math.PI, 0, 0] },
      { value: 2, position: [FACE_OFFSET, 0, 0], rotation: [0, Math.PI / 2, 0] },
      { value: 5, position: [-FACE_OFFSET, 0, 0], rotation: [0, -Math.PI / 2, 0] },
      { value: 3, position: [0, FACE_OFFSET, 0], rotation: [-Math.PI / 2, 0, 0] },
      { value: 4, position: [0, -FACE_OFFSET, 0], rotation: [Math.PI / 2, 0, 0] },
    ],
    []
  );

  useFrame((_, delta) => {
    if (!ref.current) return;

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
        // Body not ready yet
      }
      return;
    }

    if (settled.current) return;

    elapsedTime.current += delta;

    const vel = ref.current.linvel();
    const angVel = ref.current.angvel();
    const speed = Math.sqrt(vel.x ** 2 + vel.y ** 2 + vel.z ** 2);
    const angSpeed = Math.sqrt(angVel.x ** 2 + angVel.y ** 2 + angVel.z ** 2);

    const isSlowEnough = speed < 0.1 && angSpeed < 0.8;
    const timedOut = elapsedTime.current > 4;

    if (isSlowEnough || timedOut) {
      settleTimer.current += delta;
      if (settleTimer.current > 0.3 || timedOut) {
        settled.current = true;
        if (timedOut && ref.current) {
          ref.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
          ref.current.setAngvel({ x: 0, y: 0, z: 0 }, true);
        }
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

  const halfExtent = 0.26 * S;
  const boxSize = 0.5 * S;

  return (
    <RigidBody
      ref={ref}
      position={position}
      restitution={0.25}
      friction={1.0}
      linearDamping={0.8}
      angularDamping={0.8}
      colliders={false}
    >
      <CuboidCollider args={[halfExtent, halfExtent, halfExtent]} />
      <RoundedBox args={[boxSize, boxSize, boxSize]} radius={0.04} smoothness={4} castShadow receiveShadow>
        <meshStandardMaterial color={color} roughness={0.25} metalness={0.1} />
      </RoundedBox>
      {faceRotations.map((face) => (
        <PipFace key={face.value} value={face.value} position={face.position} rotation={face.rotation} pipColor={pipColor} />
      ))}
    </RigidBody>
  );
}
