import { motion, AnimatePresence } from 'framer-motion';
import { getLegalMoves } from '@shared/ludo/gameLogic';
import { useGameStore } from '@/stores/gameStore';
import { useSound } from '@/hooks/useSound';
import { IconDieFace } from '../icons';

/**
 * With two dice still live, a die must be armed before any token is
 * tappable — this is where you pick which one. Mutually exclusive with
 * Boost (merging both dice into one move); sits opposite the boost button.
 */
export function DiePicker() {
  const ludo = useGameStore((s) => s.ludo);
  const session = useGameStore((s) => s.session);
  const boostMode = useGameStore((s) => s.boostMode);
  const armedDie = useGameStore((s) => s.armedDie);
  const armDie = useGameStore((s) => s.armDie);
  const { play } = useSound();

  const current = ludo.players[ludo.currentPlayerIndex];

  const available =
    session !== null &&
    current?.kind === 'human' &&
    ludo.phase === 'select_token' &&
    ludo.diceValues.length >= 2 &&
    !boostMode &&
    !ludo.winnerId;

  const legalByDie = available
    ? new Set(getLegalMoves(ludo).map((m) => m.dieValueUsed))
    : new Set<number>();

  return (
    <AnimatePresence>
      {available && (
        <motion.div
          className="absolute right-full top-1/2 mr-2 flex -translate-y-1/2 gap-1.5 md:mr-3"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          transition={{ type: 'spring', stiffness: 300, damping: 18 }}
        >
          {ludo.diceValues.map((value, i) => {
            const legal = legalByDie.has(value);
            const armed = armedDie === value;
            return (
              <button
                key={`${value}-${i}`}
                className={`flex h-11 w-11 items-center justify-center rounded-full border shadow-lg backdrop-blur-xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-game-gold/70 disabled:cursor-not-allowed disabled:opacity-30 md:h-12 md:w-12 ${
                  armed
                    ? 'border-game-gold bg-game-gold/25 text-game-gold shadow-[0_0_24px_rgba(246,183,60,0.45)]'
                    : 'border-game-gold/40 bg-game-glass text-game-gold/80 hover:border-game-gold hover:text-game-gold hover:shadow-[0_0_18px_rgba(246,183,60,0.3)]'
                }`}
                disabled={!legal}
                onClick={() => {
                  if (!legal) return;
                  play('click');
                  armDie(value);
                }}
                aria-label={`Use the ${value}`}
                aria-pressed={armed}
                title={legal ? `Spend the ${value} — pick a token next` : `No legal move for the ${value}`}
              >
                <IconDieFace value={value} size={22} />
              </button>
            );
          })}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
