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
  onRollComplete: (value: number) => void;
}) {
  const [diceKey, setDiceKey] = useState(0);
  const [showDice, setShowDice] = useState(false);
  const [impulse, setImpulse] = useState<[number, number, number] | undefined>();
  const [torque, setTorque] = useState<[number, number, number] | undefined>();
  const settled = useRef(false);
  const { play } = useSound();

  const handleRoll = useCallback(() => {
    if (!isRolling) return;
    settled.current = false;
    setShowDice(true);
    setDiceKey((k) => k + 1);
    setImpulse([
      (Math.random() - 0.5) * 0.3,
      0.6 + Math.random() * 0.4,
      (Math.random() - 0.5) * 0.3,
    ]);
    setTorque([
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2,
    ]);
    play('roll');
    setTimeout(() => {
      setImpulse(undefined);
      setTorque(undefined);
    }, 100);
  }, [isRolling, play]);

  const handleSettle = useCallback(
    (value: number) => {
      if (settled.current) return;
      settled.current = true;
      play('land');
      onRollComplete(value);
      setTimeout(() => setShowDice(false), 1800);
    },
    [onRollComplete, play]
  );

  useEffect(() => {
    if (isRolling && !showDice) handleRoll();
  }, [isRolling, showDice, handleRoll]);

  return (
    <>
      {showDice && (
        <DiceMesh
          key={`die-${diceKey}`}
          position={[BOARD_CENTER[0], 1.4, BOARD_CENTER[2]]}
          impulse={impulse}
          torque={torque}
          onSettle={handleSettle}
          color="#fffef9"
        />
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
    (value: number) => {
      setParticles(true);
      completeRoll(value);
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
