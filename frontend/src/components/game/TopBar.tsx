import { motion } from 'framer-motion';
import { useGameStore } from '@/stores/gameStore';
import { useRoomStore } from '@/stores/roomStore';
import { IconBot, IconLeave, IconTimer, IconUsers, IconWifi } from '../icons';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function TopBar() {
  const ludo = useGameStore((s) => s.ludo);
  const session = useGameStore((s) => s.session);
  const isRolling = useGameStore((s) => s.isRolling);
  const elapsedSeconds = useGameStore((s) => s.elapsedSeconds);
  const leaveMatch = useGameStore((s) => s.leaveMatch);
  const roomCode = useRoomStore((s) => s.room?.code);

  const current = ludo.players[ludo.currentPlayerIndex];
  const myTurn = current?.kind === 'human';

  const statusText = ludo.winnerId
    ? ludo.message
    : isRolling
      ? 'Rolling…'
      : ludo.phase === 'select_token'
        ? ludo.message || 'Pick a token'
        : myTurn
          ? session?.mode === 'local'
            ? `${current.username} — roll!`
            : 'Your turn — roll the dice!'
          : `${current?.username ?? '…'}'s turn`;

  const modeBadge =
    session?.mode === 'online' ? (
      <>
        <IconWifi size={13} />
        <span>Room {roomCode ?? '—'}</span>
      </>
    ) : session?.mode === 'single' ? (
      <>
        <IconBot size={13} />
        <span className="capitalize">{session.difficulty} bots</span>
      </>
    ) : (
      <>
        <IconUsers size={13} />
        <span>Local match</span>
      </>
    );

  return (
    <motion.header
      className="pointer-events-auto z-10 flex items-center justify-between gap-2 px-4 py-3 md:gap-4 md:px-6 md:py-4"
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      {/* Left: match context */}
      <div className="glass-panel flex items-center gap-3 px-4 py-2 shadow-lg">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-game-gold">{modeBadge}</div>
        <div className="hidden h-6 w-px bg-white/10 md:block" />
        <div className="hidden items-center gap-2 font-display text-xs font-bold tracking-wider text-white/85 md:flex">
          <span className="text-game-gold">
            <IconTimer size={14} />
          </span>
          {formatTime(elapsedSeconds)}
        </div>
      </div>

      {/* Center: status */}
      <div className="glass-panel hidden min-w-[220px] items-center justify-center px-6 py-2 shadow-lg md:flex">
        <div className="flex flex-col items-center">
          <div className="font-display text-[13px] font-bold tracking-wider text-game-gold drop-shadow-md">
            {statusText}
          </div>
          {ludo.diceValues.length > 0 && !isRolling && (
            <div className="mt-0.5 text-[10px] text-game-secondary">
              Moves left: <strong className="text-white">{ludo.diceValues.join(', ')}</strong>
            </div>
          )}
        </div>
      </div>

      {/* Right: leave */}
      <div className="glass-panel flex items-center gap-2 px-3 py-1.5 shadow-lg">
        <button
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold text-white/70 transition-colors hover:bg-game-red/15 hover:text-game-red focus:outline-none focus-visible:ring-2 focus-visible:ring-game-red/60"
          onClick={leaveMatch}
          aria-label="Leave match"
        >
          <IconLeave size={15} />
          <span className="hidden md:inline">Leave</span>
        </button>
      </div>
    </motion.header>
  );
}
