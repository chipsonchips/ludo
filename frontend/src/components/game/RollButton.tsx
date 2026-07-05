import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/stores/gameStore';
import { useSound } from '@/hooks/useSound';
import { IconDice, IconDieFace } from '../icons';

export function RollButton() {
  const isRolling = useGameStore((s) => s.isRolling);
  const rollDice = useGameStore((s) => s.rollDice);
  const ludo = useGameStore((s) => s.ludo);
  const lastDiceValues = useGameStore((s) => s.lastDiceValues);
  const { play } = useSound();

  const current = ludo.players[ludo.currentPlayerIndex];
  const isMyTurn = current?.kind === 'human';
  const disabled = isRolling || !isMyTurn || ludo.phase !== 'roll' || !!ludo.winnerId;
  const showResult = lastDiceValues.length > 0 && !isRolling;

  const handleRoll = () => {
    if (disabled) return;
    play('click');
    rollDice();
  };

  return (
    <div className="relative flex flex-col items-center">
      <div className="absolute inset-0 -top-6 rounded-[2rem] bg-gradient-to-b from-black/80 to-transparent blur-xl" />

      {/* Status above button */}
      <div className="z-10 mb-2 h-6 text-center font-display text-[11px] font-bold uppercase tracking-[0.2em] text-game-gold drop-shadow-md">
        {isRolling
          ? 'Rolling…'
          : ludo.phase === 'select_token'
            ? 'Pick a token'
            : isMyTurn
              ? `${current.username === 'You' ? 'Your' : `${current.username}'s`} turn`
              : 'Waiting…'}
      </div>

      <motion.button
        className={`glass-panel relative flex h-14 w-48 items-center justify-center gap-3 overflow-hidden rounded-full border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-game-gold/70 md:h-16 md:w-56 ${
          disabled
            ? 'cursor-not-allowed opacity-50'
            : 'border-game-gold/50 shadow-[0_0_30px_rgba(245,158,11,0.2)] hover:border-game-gold hover:shadow-[0_0_40px_rgba(245,158,11,0.4)]'
        } ${isRolling ? 'animate-pulse-glow' : ''}`}
        onClick={handleRoll}
        disabled={disabled}
        aria-label="Roll the dice"
        whileHover={disabled ? {} : { scale: 1.02 }}
        whileTap={disabled ? {} : { scale: 0.98 }}
        style={{
          background: disabled
            ? 'rgba(18, 18, 31, 0.8)'
            : 'linear-gradient(180deg, rgba(246, 183, 60, 0.15) 0%, rgba(18, 18, 31, 0.9) 100%)',
        }}
      >
        <span className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent bg-[length:200%_100%]" />

        <AnimatePresence mode="wait">
          <motion.span
            key={isRolling ? 'rolling' : showResult ? `result-${lastDiceValues.join('-')}` : 'ready'}
            className="z-[1] flex items-center gap-1.5 text-game-gold drop-shadow-lg"
            initial={{ scale: 0.5, opacity: 0, rotate: -90 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.3, opacity: 0, rotate: 90 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            {isRolling ? (
              <IconDice size={26} />
            ) : showResult ? (
              lastDiceValues.map((v, i) => <IconDieFace key={i} value={v} size={26} />)
            ) : (
              <IconDice size={26} />
            )}
          </motion.span>
        </AnimatePresence>

        <span className="z-[1] font-display text-sm font-bold uppercase tracking-widest text-white drop-shadow-md md:text-base">
          {showResult ? lastDiceValues.join(' & ') : 'Roll Dice'}
        </span>
      </motion.button>
    </div>
  );
}
