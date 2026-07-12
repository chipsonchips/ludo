/**
 * Flat-table dice: a pair of ivory dice tossed onto the center medallion.
 * Purely visual — values come from the same flow the 3D arena uses:
 * offline they're generated here at settle time, online the tumble is forced
 * to land on the server's values. Either way `completeRoll` gets the result.
 */
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '@/stores/gameStore';
import { useSound } from '@/hooks/useSound';
import { diceCount } from '@shared/ludo/rules';

const TUMBLE_MS = 950;
const LINGER_MS = 1600;
const FACE_FLIP_MS = 90;

const PIPS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[30, 70], [70, 30]],
  3: [[27, 73], [50, 50], [73, 27]],
  4: [[30, 30], [70, 30], [30, 70], [70, 70]],
  5: [[30, 30], [70, 30], [50, 50], [30, 70], [70, 70]],
  6: [[30, 26], [70, 26], [30, 50], [70, 50], [30, 74], [70, 74]],
};

function DieFace({ value, size = 52 }: { value: number; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-label={`Die showing ${value}`}>
      <rect x={3} y={3} width={94} height={94} rx={22} fill="#FFFAF0" stroke="#D9C9A8" strokeWidth={2} />
      <rect x={10} y={8} width={80} height={30} rx={15} fill="rgba(255,255,255,0.65)" />
      {(PIPS[value] ?? PIPS[1]).map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={8.5} fill="#C9A84C" />
      ))}
    </svg>
  );
}

const rand6 = () => 1 + Math.floor(Math.random() * 6);

export function Dice2D() {
  const isRolling = useGameStore((s) => s.isRolling);
  const forcedValues = useGameStore((s) => s.forcedDiceValues);
  const rules = useGameStore((s) => s.ludo.rules);
  const completeRoll = useGameStore((s) => s.completeRoll);
  const { play } = useSound();

  const count = diceCount(rules);
  const [phase, setPhase] = useState<'idle' | 'tumbling' | 'settled'>('idle');
  const [faces, setFaces] = useState<number[]>([1, 1]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const forcedRef = useRef(forcedValues);
  forcedRef.current = forcedValues;

  useEffect(() => {
    // A new roll can arrive while the previous result still lingers on the
    // felt (extra-turn double six) — restart the tumble rather than hang.
    if (!isRolling || phase === 'tumbling') return;

    timers.current.forEach(clearTimeout);
    timers.current = [];
    setPhase('tumbling');
    play('roll');
    const flip = setInterval(() => setFaces(Array.from({ length: count }, rand6)), FACE_FLIP_MS);

    timers.current.push(
      setTimeout(() => {
        clearInterval(flip);
        const values = Array.from({ length: count }, (_, i) => forcedRef.current?.[i] ?? rand6());
        setFaces(values);
        setPhase('settled');
        play('land');
        completeRoll(values);
        timers.current.push(setTimeout(() => setPhase('idle'), LINGER_MS));
      }, TUMBLE_MS)
    );

    return () => clearInterval(flip);
  }, [isRolling, phase, count, completeRoll, play]);

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
    },
    []
  );

  return (
    <div className="pointer-events-none absolute inset-0 z-[4] flex items-center justify-center">
      <AnimatePresence>
        {phase !== 'idle' && (
          <motion.div
            className="flex gap-3"
            initial={{ opacity: 0, scale: 0.3, y: -60 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.6, transition: { duration: 0.25 } }}
            transition={{ type: 'spring', stiffness: 300, damping: 16 }}
          >
            {faces.slice(0, count).map((value, i) => (
              <motion.div
                key={i}
                className="drop-shadow-[0_10px_14px_rgba(0,0,0,0.6)]"
                animate={
                  phase === 'tumbling'
                    ? { rotate: [0, i === 0 ? 380 : -340, i === 0 ? 710 : -700], y: [0, -14, 0] }
                    : { rotate: 0, y: 0, scale: [1.18, 1] }
                }
                transition={
                  phase === 'tumbling'
                    ? { duration: TUMBLE_MS / 1000, ease: 'easeOut' }
                    : { type: 'spring', stiffness: 400, damping: 15 }
                }
              >
                <DieFace value={value} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
