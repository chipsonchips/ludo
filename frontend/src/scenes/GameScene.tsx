import { Suspense, useState, useCallback, useEffect, useRef } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier';
import { OrbitControls } from '@react-three/drei';
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

/**
 * Drives the "suggested" camera position/target when the player isn't dragging.
 * OrbitControls re-derives its spherical state from camera.position every frame,
 * so nudging camera.position/controls.target here (before OrbitControls updates)
 * is respected as the new baseline without fighting user input.
 */
function CinematicCamera({ controlsRef, interactingRef }: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  controlsRef: React.MutableRefObject<any>;
  interactingRef: React.MutableRefObject<boolean>;
}) {
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
      targetLook.current.copy(BOARD_TARGET);
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

  useFrame((_state, delta) => {
    // Let the player fully own the camera while they're dragging/zooming.
    if (interactingRef.current) return;

    camera.position.lerp(targetPos.current, delta * 2);
    controlsRef.current?.target.lerp(targetLook.current, delta * 2);
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
    
    // More dramatic throw
    setImpulse1([
      (Math.random() - 0.5) * 0.4,
      0.8 + Math.random() * 0.4,
      (Math.random() - 0.5) * 0.4,
    ]);
    setImpulse2([
      (Math.random() - 0.5) * 0.4,
      0.8 + Math.random() * 0.4,
      (Math.random() - 0.5) * 0.4,
    ]);
    setTorque1([
      (Math.random() - 0.5) * 4,
      (Math.random() - 0.5) * 4,
      (Math.random() - 0.5) * 4,
    ]);
    setTorque2([
      (Math.random() - 0.5) * 4,
      (Math.random() - 0.5) * 4,
      (Math.random() - 0.5) * 4,
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
            position={[BOARD_CENTER[0] - 0.2, 1.8, BOARD_CENTER[2]]}
            impulse={impulse1}
            torque={torque1}
            onSettle={(v) => handleSettle(v)}
            color="#FFFaf0" // ivory
            pipColor="#C9A84C" // gold pips
          />
          <DiceMesh
            key={`die2-${diceKey}`}
            position={[BOARD_CENTER[0] + 0.2, 1.8, BOARD_CENTER[2]]}
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
  const { play } = useSound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const controlsRef = useRef<any>(null);
  const interactingRef = useRef(false);
  const resumeTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (resumeTimeout.current) clearTimeout(resumeTimeout.current);
    };
  }, []);

  const handleControlsStart = useCallback(() => {
    interactingRef.current = true;
    if (resumeTimeout.current) clearTimeout(resumeTimeout.current);
    if (controlsRef.current) controlsRef.current.autoRotate = false;
  }, []);

  const handleControlsEnd = useCallback(() => {
    if (resumeTimeout.current) clearTimeout(resumeTimeout.current);
    resumeTimeout.current = setTimeout(() => {
      interactingRef.current = false;
      if (controlsRef.current) controlsRef.current.autoRotate = true;
    }, 2500);
  }, []);

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

        <CinematicCamera controlsRef={controlsRef} interactingRef={interactingRef} />

        <OrbitControls
          ref={controlsRef}
          makeDefault
          target={[0, 0, 0]}
          enableDamping
          dampingFactor={0.08}
          minDistance={5}
          maxDistance={20}
          minPolarAngle={0.15}
          maxPolarAngle={Math.PI / 2 - 0.02}
          autoRotate
          autoRotateSpeed={0.4}
          onStart={handleControlsStart}
          onEnd={handleControlsEnd}
        />

        {/* Own Suspense boundary: the HDRI background/reflection load must never block the board from rendering */}
        <Suspense fallback={null}>
          <LoungeEnvironment />
        </Suspense>

        <Suspense fallback={null}>
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
