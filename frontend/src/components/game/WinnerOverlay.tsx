import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '@/stores/gameStore';
import { getColorHex } from '@/ludo/boardLayout';

export function WinnerOverlay() {
  const ludo = useGameStore((s) => s.ludo);
  const resetGame = useGameStore((s) => s.resetGame);

  const winner = ludo.winnerId ? ludo.players.find((p) => p.id === ludo.winnerId) : null;

  return (
    <AnimatePresence>
      {winner && (
        <motion.div
          className="pointer-events-auto absolute inset-0 z-[20] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="glass-panel flex flex-col items-center gap-4 rounded-3xl px-10 py-8 text-center shadow-[0_0_60px_rgba(246,183,60,0.25)]"
            style={{ borderColor: getColorHex(winner.color) }}
            initial={{ scale: 0.7, y: 40, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          >
            <motion.span
              className="text-6xl drop-shadow-lg"
              animate={{ rotate: [0, -8, 8, 0], scale: [1, 1.15, 1] }}
              transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 0.6 }}
            >
              🏆
            </motion.span>
            <div className="font-display text-xs font-bold uppercase tracking-[0.3em] text-game-gold">
              Winner
            </div>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{winner.avatar}</span>
              <span
                className="font-display text-3xl font-black drop-shadow-md"
                style={{ color: getColorHex(winner.color) }}
              >
                {winner.username}
              </span>
            </div>
            <div className="text-sm text-game-secondary">
              {winner.isLocalPlayer ? 'You brought all four tokens home!' : 'All four tokens made it home.'}
            </div>
            <button
              className="mt-2 rounded-full border border-game-gold/50 bg-gradient-to-b from-game-gold/20 to-transparent px-8 py-3 font-display text-sm font-bold uppercase tracking-widest text-white shadow-[0_0_30px_rgba(246,183,60,0.2)] transition-all hover:border-game-gold hover:shadow-[0_0_40px_rgba(246,183,60,0.4)]"
              onClick={resetGame}
            >
              Play Again
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
