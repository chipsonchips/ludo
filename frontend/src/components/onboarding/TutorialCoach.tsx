/**
 * First-match coach marks: a single hint bubble above the bottom bar that
 * follows the player's first turns (roll → pick a token → wrap-up), then
 * retires for good. Works in every mode — hints only surface on human turns.
 */
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '@/stores/gameStore';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { IconSparkle, IconX } from '../icons';

type Step = 'roll' | 'move' | 'wrap';

const WRAP_HINT_MS = 8000;

export function TutorialCoach() {
  const tutorialDone = useOnboardingStore((s) => s.tutorialDone);
  const completeTutorial = useOnboardingStore((s) => s.completeTutorial);
  const ludo = useGameStore((s) => s.ludo);
  const isRolling = useGameStore((s) => s.isRolling);
  const selectedTokenId = useGameStore((s) => s.selectedTokenId);
  const session = useGameStore((s) => s.session);
  const gameOver = useGameStore((s) => s.gameOver);

  const [moveHintSeen, setMoveHintSeen] = useState(false);
  const [moved, setMoved] = useState(false);

  const current = ludo.players[ludo.currentPlayerIndex];
  const myTurn = current?.kind === 'human';

  const step: Step | null =
    tutorialDone || !session || gameOver
      ? null
      : moved
        ? 'wrap'
        : myTurn && ludo.phase === 'select_token' && ludo.selectableTokenIds.length > 0
          ? 'move'
          : myTurn && ludo.phase === 'roll' && !isRolling
            ? 'roll'
            : null;

  useEffect(() => {
    if (step === 'move') setMoveHintSeen(true);
  }, [step]);

  // The player picked a token while the move hint was up — last lesson next
  useEffect(() => {
    if (!tutorialDone && moveHintSeen && selectedTokenId && myTurn) setMoved(true);
  }, [tutorialDone, moveHintSeen, selectedTokenId, myTurn]);

  // The wrap-up lingers briefly, then the coach never comes back
  useEffect(() => {
    if (step !== 'wrap') return;
    const timer = setTimeout(completeTutorial, WRAP_HINT_MS);
    return () => clearTimeout(timer);
  }, [step, completeTutorial]);

  const text =
    step === 'roll'
      ? 'Your turn — tap Roll Dice below to throw.'
      : step === 'move'
        ? ludo.diceValues.includes(6)
          ? 'You rolled a 6! Tap a glowing token to bring it out of base.'
          : 'Tap one of your glowing tokens on the board to move it.'
        : 'That’s the rhythm — roll, move, repeat. Get all four tokens home first, and land on rivals to send them back.';

  return (
    <AnimatePresence>
      {step && (
        <motion.div
          className="pointer-events-auto absolute bottom-44 left-1/2 z-[8] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 md:bottom-48"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ type: 'spring', stiffness: 280, damping: 24 }}
        >
          <div className="glass-panel flex items-start gap-3 border-game-gold/40 px-4 py-3 shadow-[0_0_28px_rgba(246,183,60,0.18)]">
            <motion.span
              className="mt-0.5 shrink-0 text-game-gold"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.6, repeat: Infinity }}
            >
              <IconSparkle size={16} />
            </motion.span>
            <p className="flex-1 text-[12.5px] leading-snug text-white/90">{text}</p>
            <button
              className="shrink-0 rounded-full p-1 text-white/40 transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-game-gold/70"
              aria-label="Dismiss tutorial hints"
              onClick={completeTutorial}
            >
              <IconX size={13} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
