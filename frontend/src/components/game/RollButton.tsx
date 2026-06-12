import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/stores/gameStore';
import { useSound } from '@/hooks/useSound';

const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

export function RollButton() {
  const { isRolling, rollDice, ludo, lastDiceValue } = useGameStore();
  const { play } = useSound();
  const current = ludo.players[ludo.currentPlayerIndex];
  const isMyTurn = current.isLocalPlayer;
  const disabled = isRolling || !isMyTurn || ludo.phase !== 'roll' || !!ludo.winnerId;
  const showResult = lastDiceValue !== null && !isRolling;

  const handleRoll = () => {
    if (disabled) return;
    play('click');
    rollDice();
  };

  const diceIcon = showResult && lastDiceValue ? DICE_FACES[lastDiceValue - 1] : '🎲';

  return (
    <div className="relative flex flex-col items-center gap-2">
      <motion.button
        className={`relative flex h-[90px] w-[90px] flex-col items-center justify-center overflow-hidden rounded-full border-[3px] border-white/20 bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 shadow-[0_0_20px_rgba(245,158,11,0.4),0_8px_32px_rgba(0,0,0,0.4)] transition-all md:h-[120px] md:w-[120px] ${
          disabled ? 'cursor-not-allowed opacity-50 grayscale' : 'hover:shadow-[0_0_40px_rgba(245,158,11,0.6),0_8px_32px_rgba(0,0,0,0.4)]'
        } ${isRolling ? 'animate-pulse-glow' : ''}`}
        onClick={handleRoll}
        disabled={disabled}
        whileHover={disabled ? {} : { scale: 1.05 }}
        whileTap={disabled ? {} : { scale: 0.95 }}
      >
        <span className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent bg-[length:200%_100%]" />
        <AnimatePresence mode="wait">
          <motion.span
            key={isRolling ? 'rolling' : showResult ? `result-${lastDiceValue}` : 'ready'}
            initial={{ scale: 0.5, opacity: 0, rotate: -90 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.3, opacity: 0, rotate: 90 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className={`z-[1] drop-shadow-lg ${
              showResult && !isRolling
                ? 'text-4xl md:text-5xl'
                : 'text-[28px] md:text-4xl'
            }`}
          >
            {isRolling ? '🎲' : diceIcon}
          </motion.span>
        </AnimatePresence>
        {showResult && lastDiceValue && (
          <motion.span
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="z-[1] font-display text-lg font-black text-white drop-shadow-md md:text-xl"
          >
            {lastDiceValue}
          </motion.span>
        )}
        {!showResult && (
          <span className="z-[1] mt-1 font-display text-[9px] font-bold uppercase tracking-widest md:text-[11px]">
            {isRolling ? 'Rolling...' : ludo.phase === 'select_token' ? 'Pick Token' : isMyTurn ? 'Roll Die' : 'Wait...'}
          </span>
        )}
      </motion.button>
    </div>
  );
}
