import { Suspense, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { LudoBoard } from './LudoBoard';
import { DiceMesh } from './DiceMesh';
import { ParticleEffects } from './ParticleEffects';
import { useGameStore } from '@/stores/gameStore';
import { useSound } from '@/hooks/useSound';
import { BOARD_CENTER } from '@/ludo/constants';
import { diceCount } from '@shared/ludo/rules';
import { getLegalMoves } from '@shared/ludo/gameLogic';
import { LoungeEnvironment } from './LoungeEnvironment';

interface DiceLaunch {
  impulse: [number, number, number];
  torque: [number, number, number];
}

function makeLaunch(): DiceLaunch {
  return {
    impulse: [
      (Math.random() - 0.5) * 0.25,
      0.3 + Math.random() * 0.2,
      (Math.random() - 0.5) * 0.25,
    ],
    torque: [
      (Math.random() - 0.5) * 2.5,
      (Math.random() - 0.5) * 2.5,
      (Math.random() - 0.5) * 2.5,
    ],
  };
}

function CenterDiceArena({
  isRolling,
  count,
  forcedValues,
  onRollComplete,
}: {
  isRolling: boolean;
  count: number;
  /** Online games: the dice must land on these server-decided values. */
  forcedValues: number[] | null;
  onRollComplete: (values: number[]) => void;
}) {
  const [diceKey, setDiceKey] = useState(0);
  const [showDice, setShowDice] = useState(false);
  const [launches, setLaunches] = useState<DiceLaunch[] | null>(null);
  const settledValues = useRef<number[]>([]);
  const { play } = useSound();

  const handleRoll = useCallback(() => {
    if (!isRolling) return;
    settledValues.current = [];
    setShowDice(true);
    setDiceKey((k) => k + 1);
    setLaunches(Array.from({ length: count }, makeLaunch));
    play('roll');
    setTimeout(() => setLaunches(null), 100);
  }, [isRolling, count, play]);

  const handleSettle = useCallback(
    (value: number) => {
      if (settledValues.current.length >= count) return;
      settledValues.current.push(value);
      play('land');

      if (settledValues.current.length === count) {
        onRollComplete([...settledValues.current]);
        setTimeout(() => setShowDice(false), 2000); // linger so the result reads
      }
    },
    [count, onRollComplete, play]
  );

  useEffect(() => {
    if (isRolling && !showDice) handleRoll();
  }, [isRolling, showDice, handleRoll]);

  // Watchdog: if a die escapes the arena or wedges without settling, the roll
  // would hang the whole game (isRolling never clears). Salvage with the
  // forced/random values for whatever hasn't reported in.
  useEffect(() => {
    if (!isRolling) return;
    const timer = setTimeout(() => {
      if (settledValues.current.length >= count) return;
      while (settledValues.current.length < count) {
        const i = settledValues.current.length;
        settledValues.current.push(forcedValues?.[i] ?? 1 + Math.floor(Math.random() * 6));
      }
      onRollComplete([...settledValues.current]);
      setTimeout(() => setShowDice(false), 1500);
    }, 8000);
    return () => clearTimeout(timer);
  }, [isRolling, count, forcedValues, onRollComplete]);

  const spread = count > 1 ? 0.15 : 0;

  return (
    <>
      {showDice &&
        Array.from({ length: count }, (_, i) => (
          <DiceMesh
            key={`die${i}-${diceKey}`}
            position={[
              BOARD_CENTER[0] + (i === 0 ? -spread : spread),
              BOARD_CENTER[1] + 0.6,
              BOARD_CENTER[2],
            ]}
            impulse={launches?.[i]?.impulse}
            torque={launches?.[i]?.torque}
            forceValue={forcedValues?.[i]}
            onSettle={handleSettle}
            color="#FFFaf0"
            pipColor="#C9A84C"
          />
        ))}
      {/* Physics collider for center dice arena */}
      <RigidBody type="fixed" colliders={false} position={BOARD_CENTER}>
        {/* Floor — thick slab so fast-falling dice can't tunnel through */}
        <CuboidCollider args={[0.6, 0.25, 0.6]} position={[0, -0.25, 0]} />
        {/* Invisible walls around the center (tight 1.2x1.2 area, just tall enough for the gentler toss) */}
        <CuboidCollider args={[0.6, 1.2, 0.05]} position={[0, 1.2, -0.6]} />
        <CuboidCollider args={[0.6, 1.2, 0.05]} position={[0, 1.2, 0.6]} />
        <CuboidCollider args={[0.05, 1.2, 0.6]} position={[-0.6, 1.2, 0]} />
        <CuboidCollider args={[0.05, 1.2, 0.6]} position={[0.6, 1.2, 0]} />
      </RigidBody>
    </>
  );
}

export function GameScene() {
  const ludo = useGameStore((s) => s.ludo);
  const isRolling = useGameStore((s) => s.isRolling);
  const forcedDiceValues = useGameStore((s) => s.forcedDiceValues);
  const completeRoll = useGameStore((s) => s.completeRoll);
  const selectToken = useGameStore((s) => s.selectToken);
  const selectedTokenId = useGameStore((s) => s.selectedTokenId);
  const boostMode = useGameStore((s) => s.boostMode);
  const armedDie = useGameStore((s) => s.armedDie);
  const [particles, setParticles] = useState(false);
  const { play } = useSound();

  // With 2+ dice still live and not boosting, nothing is tappable until a
  // die is armed — then only tokens that die can legally move.
  const activeSelectableTokenIds = useMemo(() => {
    if (ludo.phase !== 'select_token' || boostMode || ludo.diceValues.length < 2) {
      return ludo.selectableTokenIds;
    }
    if (armedDie === null) return [];
    return Array.from(new Set(getLegalMoves(ludo).filter((m) => m.dieValueUsed === armedDie).map((m) => m.tokenId)));
  }, [ludo, boostMode, armedDie]);

  const handleRollComplete = useCallback(
    (values: number[]) => {
      if (values.includes(6)) {
        setParticles(true);
        play('win'); // mini celebration for a 6
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

        {/* The camera is entirely the player's: no auto-rotate, no cinematic
            drift — it stays exactly where they leave it. */}
        <OrbitControls
          makeDefault
          target={[0, 0, 0]}
          enableDamping
          dampingFactor={0.08}
          minDistance={5}
          maxDistance={14}
          minPolarAngle={0.15}
          maxPolarAngle={Math.PI / 2 - 0.02}
        />

        <LoungeEnvironment />

        <Suspense fallback={null}>
          <LudoBoard
            ludo={ludo}
            selectedTokenId={selectedTokenId}
            onSelectToken={selectToken}
            selectableTokenIds={activeSelectableTokenIds}
          />

          <Physics gravity={[0, -35, 0]}>
            <CenterDiceArena
              isRolling={isRolling}
              count={diceCount(ludo.rules)}
              forcedValues={forcedDiceValues}
              onRollComplete={handleRollComplete}
            />
          </Physics>

          <ParticleEffects active={particles} color="#F6B73C" />
        </Suspense>
      </Canvas>
    </div>
  );
}
