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
      className="pointer-events-auto z-10 flex items-center justify-between gap-2 px-4 py-3 md:gap-4 md:px-6 md:py-4"
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      {/* Left side: Room info */}
      <div className="glass-panel flex items-center gap-3 px-4 py-1.5 shadow-lg">
        <div className="flex flex-col">
          <span className="text-[9px] font-bold uppercase tracking-widest text-game-gold drop-shadow-sm">Room {match.room.id}</span>
          <span className="font-display text-xs font-semibold tracking-wide text-white/90">High Stakes</span>
        </div>
        <div className="hidden h-8 w-px bg-white/10 md:block" />
        <div className="hidden items-center gap-1.5 md:flex">
          <span className="h-2 w-2 rounded-full bg-game-green shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
          <span className="text-[10px] font-medium text-white/80">4/4 Players</span>
        </div>
      </div>

      {/* Center: Status */}
      <div className="glass-panel hidden flex-col items-center justify-center px-6 py-1.5 shadow-lg md:flex min-w-[200px]">
        <div className="font-display text-[13px] font-bold tracking-wider text-game-gold drop-shadow-md">
          {statusText}
        </div>
        {ludo.diceValues && ludo.diceValues.length > 0 && (
          <div className="text-[10px] text-game-secondary mt-0.5">
            Moves left: <strong className="text-white drop-shadow-sm">{ludo.diceValues.join(', ')}</strong>
          </div>
        )}
      </div>

      {/* Right side: Controls & Time */}
      <div className="glass-panel flex items-center gap-3 px-3 py-1.5 shadow-lg">
        <div className="flex items-center gap-2 font-display text-sm font-bold md:text-base text-white/90">
          <span className="text-game-gold drop-shadow-sm">⏱</span>
          <span className="tracking-wider">{formatTime(match.matchTimer)}</span>
        </div>
        <div className="h-6 w-px bg-white/10" />
        <VoiceControls />
        <div className="h-6 w-px bg-white/10" />
        <button className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/10 transition-colors text-white/70 hover:text-white">
          ⚙️
        </button>
      </div>
    </motion.header>
  );
}
