import { motion } from 'framer-motion';
import { useGameStore } from '@/stores/gameStore';
import { VoiceControls } from '../social/VoiceControls';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function TopBar() {
  const { match, ludo } = useGameStore();
  const current = ludo.players[ludo.currentPlayerIndex];

  const statusText =
    ludo.winnerId
      ? ludo.message
      : ludo.phase === 'select_token'
        ? ludo.message
        : ludo.isRolling
          ? 'Rolling...'
          : current.isLocalPlayer
            ? 'Your turn — roll the die!'
            : `${current.username}'s turn`;

  return (
    <motion.header
      className="glass-panel pointer-events-auto z-10 flex items-center justify-between gap-2 px-3 py-2 md:gap-4 md:px-5 md:py-2.5"
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <div className="flex items-center gap-2 md:gap-3">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-widest text-game-muted">Ludo</span>
          <span className="font-display text-sm font-bold tracking-wide text-game-gold">{match.room.id}</span>
        </div>
        <div className="hidden rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-game-secondary md:block">
          4 Players
        </div>
      </div>

      <div className="flex flex-col items-center gap-0.5">
        <div className="font-display text-[11px] font-semibold tracking-wide text-game-gold md:text-[13px]">
          {statusText}
        </div>
        {ludo.diceValues && ludo.diceValues.length > 0 && (
          <div className="text-[10px] text-game-secondary">
            Moves left: <strong className="text-game-primary">{ludo.diceValues.join(', ')}</strong>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <div className="flex items-center gap-1.5 font-display text-sm font-bold md:text-base">
          <span className="text-sm">⏱</span>
          <span>{formatTime(match.matchTimer)}</span>
        </div>
        <VoiceControls />
      </div>
    </motion.header>
  );
}
