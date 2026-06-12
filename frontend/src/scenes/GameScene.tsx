import { Suspense, useState, useCallback, useEffect, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier';
import { Environment, OrbitControls, ContactShadows } from '@react-three/drei';
import { LudoBoard } from './LudoBoard';
import { DiceMesh } from './DiceMesh';
import { ParticleEffects } from './ParticleEffects';
import { useGameStore } from '@/stores/gameStore';
import { useSound } from '@/hooks/useSound';
import { BOARD_CENTER } from '@/ludo/constants';

const BOARD_TARGET: [number, number, number] = [0, 0, 0];

function SceneLighting() {
  return (
    <>
      <ambientLight intensity={0.65} />
      <directionalLight
        position={[3, 14, 8]}
        intensity={1.6}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={25}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
      />
      <directionalLight position={[-6, 10, -4]} intensity={0.4} color="#fff5e6" />
      <pointLight position={[0, 3, 0]} intensity={0.5} color="#f59e0b" distance={8} />
    </>
  );
}

function BoardCamera() {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(0, 10, 10);
    camera.lookAt(...BOARD_TARGET);
  }, [camera]);
  return null;
}

function BoardControls() {
  return (
    <OrbitControls
      target={BOARD_TARGET}
      minDistance={7}
      maxDistance={17}
      minPolarAngle={0.35}
      maxPolarAngle={Math.PI / 2.15}
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.7}
      zoomSpeed={0.9}
    />
  );
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
      (Math.random() - 0.5) * 0.2,
      0.6 + Math.random() * 0.4,
      (Math.random() - 0.5) * 0.2,
    ]);
    setImpulse2([
      (Math.random() - 0.5) * 0.2,
      0.6 + Math.random() * 0.4,
      (Math.random() - 0.5) * 0.2,
    ]);
    setTorque1([
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2,
    ]);
    setTorque2([
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2,
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
        setTimeout(() => setShowDice(false), 1800);
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
            position={[BOARD_CENTER[0] - 0.15, 1.4, BOARD_CENTER[2]]}
            impulse={impulse1}
            torque={torque1}
            onSettle={(v) => handleSettle(v, 0)}
            color="#fffef9"
          />
          <DiceMesh
            key={`die2-${diceKey}`}
            position={[BOARD_CENTER[0] + 0.15, 1.4, BOARD_CENTER[2]]}
            impulse={impulse2}
            torque={torque2}
            onSettle={(v) => handleSettle(v, 1)}
            color="#fffef9"
          />
        </>
      )}
      {/* Physics collider for center dice arena */}
      <RigidBody type="fixed" colliders={false} position={BOARD_CENTER}>
        {/* Floor */}
        <CuboidCollider args={[0.6, 0.05, 0.6]} position={[0, -0.05, 0]} />
        {/* Invisible walls around the center (tight 1.2x1.2 area, tall to prevent escape) */}
        <CuboidCollider args={[0.6, 5, 0.05]} position={[0, 5, -0.6]} />
        <CuboidCollider args={[0.6, 5, 0.05]} position={[0, 5, 0.6]} />
        <CuboidCollider args={[0.05, 5, 0.6]} position={[-0.6, 5, 0]} />
        <CuboidCollider args={[0.05, 5, 0.6]} position={[0.6, 5, 0]} />
      </RigidBody>
    </>
  );
}

export function GameScene() {
  const { ludo, isRolling, completeRoll, selectToken, selectedTokenId } = useGameStore();
  const [particles, setParticles] = useState(false);

  const handleRollComplete = useCallback(
    (values: number[]) => {
      setParticles(true);
      completeRoll(values);
      setTimeout(() => setParticles(false), 2000);
    },
    [completeRoll]
  );

  return (
    <div className="absolute inset-0">
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false }}
        camera={{ position: [0, 10, 10], fov: 42, near: 0.1, far: 100 }}
      >
        <color attach="background" args={['#1a1410']} />
        <Suspense fallback={null}>
          <BoardCamera />
          <BoardControls />
          <SceneLighting />
          <Environment preset="apartment" />
          <ContactShadows position={[0, 0.1, 0]} opacity={0.5} scale={7} blur={2} far={3} />

          <LudoBoard
            ludo={ludo}
            selectedTokenId={selectedTokenId}
            onSelectToken={selectToken}
          />

          <Physics gravity={[0, -25, 0]}>
            <CenterDiceArena isRolling={isRolling} onRollComplete={handleRollComplete} />
          </Physics>

          <ParticleEffects active={particles} />
        </Suspense>
      </Canvas>
    </div>
  );
}
