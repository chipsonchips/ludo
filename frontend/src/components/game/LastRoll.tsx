import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/stores/gameStore';

const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

export function LastRoll() {
  const lastDiceValues = useGameStore((s) => s.lastDiceValues);

  if (lastDiceValues.length === 0) return null;

  const lastValue = lastDiceValues[lastDiceValues.length - 1];

  return (
    <motion.div
      className="flex flex-col items-center gap-2 rounded-xl px-5 py-3"
      style={{
        background: 'rgba(8, 6, 16, 0.90)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1.5px solid rgba(255,255,255,0.1)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
      }}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-game-gold/70">
        Last Roll
      </span>
      <AnimatePresence mode="wait">
        <motion.div
          key={lastValue}
          className="flex items-center gap-2"
          initial={{ scale: 0.5, opacity: 0, y: 8 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 1.4, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 350, damping: 20 }}
        >
          <span className="text-2xl leading-none drop-shadow-md">{DICE_FACES[lastValue - 1]}</span>
          <span
            className="font-display text-3xl font-black leading-none text-white"
            style={{ textShadow: '0 0 12px rgba(255,255,255,0.25)' }}
          >
            {lastValue}
          </span>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
