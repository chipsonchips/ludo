import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/stores/gameStore';
import { useSound } from '@/hooks/useSound';

const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

export function RollButton() {
  const { isRolling, rollDice, ludo, lastDiceValues } = useGameStore();
  const { play } = useSound();
  const current = ludo.players[ludo.currentPlayerIndex];
  const isMyTurn = current.isLocalPlayer;
  const disabled = isRolling || !isMyTurn || ludo.phase !== 'roll' || !!ludo.winnerId;
  const showResult = lastDiceValues.length > 0 && !isRolling;

  const handleRoll = () => {
    if (disabled) return;
    play('click');
    rollDice();
  };

  const statusLabel = isRolling
    ? 'Rolling...'
    : ludo.phase === 'select_token'
      ? 'Pick a Token'
      : isMyTurn
        ? 'Your turn'
        : `${current.username}'s turn`;

  const buttonLabel = isRolling
    ? 'Rolling...'
    : showResult
      ? lastDiceValues.map((v) => DICE_FACES[v - 1]).join(' ')
      : 'Roll Dice';

  return (
    <div className="flex flex-col items-center gap-1.5">
      <motion.button
        className="relative flex items-center justify-center gap-3 overflow-hidden rounded-full"
        style={{
          width: 220,
          height: 56,
          background: disabled
            ? 'rgba(18, 18, 31, 0.8)'
            : 'linear-gradient(180deg, rgba(246,183,60,0.18) 0%, rgba(12,10,24,0.92) 100%)',
          border: `2px solid ${disabled ? 'rgba(255,255,255,0.08)' : '#F6B73C88'}`,
          boxShadow: disabled
            ? 'none'
            : '0 0 28px rgba(246,183,60,0.25), 0 8px 32px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(16px)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.55 : 1,
        }}
        onClick={handleRoll}
        disabled={disabled}
        whileHover={disabled ? {} : { scale: 1.03, boxShadow: '0 0 40px rgba(246,183,60,0.4), 0 8px 32px rgba(0,0,0,0.5)' }}
        whileTap={disabled ? {} : { scale: 0.97 }}
      >
        {/* Shimmer sweep */}
        {!disabled && (
          <span className="absolute inset-0 animate-shimmer rounded-full bg-gradient-to-r from-transparent via-white/10 to-transparent bg-[length:200%_100%]" />
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={isRolling ? 'rolling' : showResult ? `r-${lastDiceValues.join('-')}` : 'idle'}
            className="relative z-10 flex items-center gap-2.5"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            <span className="text-xl leading-none">{isRolling ? '🎲' : showResult ? DICE_FACES[lastDiceValues[0] - 1] : '🎲'}</span>
            <span
              className="font-display text-sm font-black uppercase tracking-widest text-white"
              style={{ textShadow: disabled ? 'none' : '0 0 12px rgba(246,183,60,0.4)' }}
            >
              {buttonLabel}
            </span>
          </motion.div>
        </AnimatePresence>
      </motion.button>

      <span className="font-display text-[10px] font-bold uppercase tracking-[0.18em] text-white/50">
        {statusLabel}
      </span>
    </div>
  );
}
