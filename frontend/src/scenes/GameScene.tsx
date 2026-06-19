import { Suspense, useState, useCallback, useEffect, useRef } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier';
import * as THREE from 'three';
import { LudoBoard } from './LudoBoard';
import { DiceMesh } from './DiceMesh';
import { ParticleEffects } from './ParticleEffects';
import { useGameStore } from '@/stores/gameStore';
import { useSound } from '@/hooks/useSound';
import { BOARD_CENTER } from '@/ludo/constants';
import { LoungeEnvironment } from './LoungeEnvironment';

const BOARD_TARGET = new THREE.Vector3(0, 0, 0);
const DEFAULT_CAMERA_POS = new THREE.Vector3(0, 12, 10);
const ROLL_CAMERA_POS = new THREE.Vector3(0, 8, 8);

function CinematicCamera() {
  const { camera } = useThree();
  const ludo = useGameStore((s) => s.ludo);
  const isRolling = useGameStore((s) => s.isRolling);
  
  const targetPos = useRef(DEFAULT_CAMERA_POS.clone());
  const targetLook = useRef(BOARD_TARGET.clone());

  useEffect(() => {
    if (isRolling) {
      targetPos.current.copy(ROLL_CAMERA_POS);
      targetLook.current.copy(BOARD_TARGET);
    } else if (ludo.winnerId) {
      targetPos.current.set(0, 15, 15); // zoom out
    } else {
      targetPos.current.copy(DEFAULT_CAMERA_POS);
      
      // Slight tilt toward active player
      if (ludo.players[ludo.currentPlayerIndex]) {
        const color = ludo.players[ludo.currentPlayerIndex].color;
        const offset = 1.5;
        if (color === 'yellow') targetLook.current.set(-offset, 0, -offset);
        if (color === 'blue') targetLook.current.set(offset, 0, -offset);
        if (color === 'red') targetLook.current.set(offset, 0, offset);
        if (color === 'green') targetLook.current.set(-offset, 0, offset);
      }
    }
  }, [isRolling, ludo.winnerId, ludo.currentPlayerIndex, ludo.players]);

  useFrame((state, delta) => {
    // Smooth camera interpolation
    camera.position.lerp(targetPos.current, delta * 2);
    
    // Smooth lookat interpolation
    // Assuming camera has a lookAt target, we can interpolate a dummy object or just lerp a vector and call lookAt
    // But since OrbitControls are gone, we manage lookAt manually
    // For simplicity, we just look at board center, slightly offset by orbit
    
    // Let's add slight idle orbit
    if (!isRolling && !ludo.winnerId) {
      const time = state.clock.elapsedTime;
      camera.position.x += Math.sin(time * 0.2) * 0.02;
      camera.position.z += Math.cos(time * 0.2) * 0.02;
    }

    camera.lookAt(targetLook.current);
  });

  return null;
}

function CenterDiceArena({
  isRolling,
  onRollComplete,
}: {
  isRolling: boolean;
  onRollComplete: (values: number[]) => void;
}) {
  const [diceKey, setDiceKey] = useState(0);
  const [showDice, setShowDice] = useState(false);
  const [impulse1, setImpulse1] = useState<[number, number, number] | undefined>();
  const [impulse2, setImpulse2] = useState<[number, number, number] | undefined>();
  const [torque1, setTorque1] = useState<[number, number, number] | undefined>();
  const [torque2, setTorque2] = useState<[number, number, number] | undefined>();
  const settledValues = useRef<number[]>([]);
  const { play } = useSound();

  const handleRoll = useCallback(() => {
    if (!isRolling) return;
    settledValues.current = [];
    setShowDice(true);
    setDiceKey((k) => k + 1);
    
    setImpulse1([
      (Math.random() - 0.5) * 0.15,
      0.4 + Math.random() * 0.2,
      (Math.random() - 0.5) * 0.15,
    ]);
    setImpulse2([
      (Math.random() - 0.5) * 0.15,
      0.4 + Math.random() * 0.2,
      (Math.random() - 0.5) * 0.15,
    ]);
    setTorque1([
      (Math.random() - 0.5) * 1.5,
      (Math.random() - 0.5) * 1.5,
      (Math.random() - 0.5) * 1.5,
    ]);
    setTorque2([
      (Math.random() - 0.5) * 1.5,
      (Math.random() - 0.5) * 1.5,
      (Math.random() - 0.5) * 1.5,
    ]);
    play('roll');
    setTimeout(() => {
      setImpulse1(undefined);
      setImpulse2(undefined);
      setTorque1(undefined);
      setTorque2(undefined);
    }, 100);
  }, [isRolling, play]);

  const handleSettle = useCallback(
    (value: number) => {
      if (settledValues.current.length >= 2) return;
      settledValues.current.push(value);
      play('land');
      
      if (settledValues.current.length === 2) {
        onRollComplete([...settledValues.current]);
        setTimeout(() => setShowDice(false), 2000); // Wait longer to show result
      }
    },
    [onRollComplete, play]
  );

  useEffect(() => {
    if (isRolling && !showDice) handleRoll();
  }, [isRolling, showDice, handleRoll]);

  return (
    <>
      {showDice && (
        <>
          <DiceMesh
            key={`die1-${diceKey}`}
            position={[BOARD_CENTER[0] - 0.18, 0.8, BOARD_CENTER[2]]}
            impulse={impulse1}
            torque={torque1}
            onSettle={(v) => handleSettle(v)}
            color="#FFFaf0"
            pipColor="#C9A84C"
          />
          <DiceMesh
            key={`die2-${diceKey}`}
            position={[BOARD_CENTER[0] + 0.18, 0.8, BOARD_CENTER[2]]}
            impulse={impulse2}
            torque={torque2}
            onSettle={(v) => handleSettle(v)}
            color="#FFFaf0"
            pipColor="#C9A84C"
          />
        </>
      )}
      {/* Physics collider for center dice arena */}
      <RigidBody type="fixed" colliders={false} position={BOARD_CENTER}>
        {/* Floor */}
        <CuboidCollider args={[0.9, 0.05, 0.9]} position={[0, -0.05, 0]} />
        {/* Invisible walls — 1.8×1.8 arena with thick walls */}
        <CuboidCollider args={[0.9, 3, 0.15]} position={[0, 3, -0.9]} />
        <CuboidCollider args={[0.9, 3, 0.15]} position={[0, 3, 0.9]} />
        <CuboidCollider args={[0.15, 3, 0.9]} position={[-0.9, 3, 0]} />
        <CuboidCollider args={[0.15, 3, 0.9]} position={[0.9, 3, 0]} />
      </RigidBody>
    </>
  );
}

export function GameScene() {
  const { ludo, isRolling, completeRoll, selectToken, selectedTokenId } = useGameStore();
  const [particles, setParticles] = useState(false);
  const { play } = useSound();

  const handleRollComplete = useCallback(
    (values: number[]) => {
      if (values.includes(6)) {
        setParticles(true);
        play('win'); // mini win sound for a 6
        setTimeout(() => setParticles(false), 2000);
      }
      completeRoll(values);
    },
    [completeRoll, play]
  );

  return (
    <div className="absolute inset-0">
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
        camera={{ position: [0, 12, 10], fov: 42, near: 0.1, far: 100 }}
      >
        <color attach="background" args={['#0A0812']} />
        <Suspense fallback={null}>
          <CinematicCamera />
          
          <LoungeEnvironment />

          <LudoBoard
            ludo={ludo}
            selectedTokenId={selectedTokenId}
            onSelectToken={selectToken}
          />

          <Physics gravity={[0, -35, 0]}>
            <CenterDiceArena isRolling={isRolling} onRollComplete={handleRollComplete} />
          </Physics>

          <ParticleEffects active={particles} color="#F6B73C" />
        </Suspense>
      </Canvas>
    </div>
  );
}
