import { motion } from 'framer-motion';
import { useGameStore } from '@/stores/gameStore';
import { getColorHex } from '@/ludo/boardLayout';
import type { LudoColor } from '@/ludo/types';

const COLOR_LABELS: Record<LudoColor, string> = {
  yellow: 'Yellow',
  blue: 'Blue',
  green: 'Green',
  red: 'Red',
};

export function PlayerPanel() {
  const ludo = useGameStore((s) => s.ludo);

  return (
    <div className="pointer-events-none absolute left-3 right-3 top-[70px] z-[5] flex flex-wrap justify-between gap-1.5 md:top-20 md:flex-nowrap md:gap-3">
      {ludo.players.map((player, i) => (
        <motion.div
          key={player.id}
          className={`glass-panel pointer-events-auto relative flex min-w-[calc(50%-6px)] items-center gap-2 border-l-[3px] p-1.5 md:min-w-[140px] md:gap-2 md:p-2 md:px-3 ${
            player.isCurrentTurn ? 'shadow-[0_0_20px_rgba(245,158,11,0.4)]' : ''
          } ${player.isLocalPlayer ? 'border-l-4' : ''}`}
          style={{ borderLeftColor: player.isCurrentTurn ? '#f59e0b' : getColorHex(player.color) }}
          initial={{ opacity: 0, x: i < 2 ? -30 : 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1, duration: 0.4 }}
        >
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xl"
            style={{ backgroundColor: `${getColorHex(player.color)}33` }}
          >
            {player.avatar}
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <div className="flex items-center gap-1 truncate text-xs font-semibold">
              {player.username}
              {player.isLocalPlayer && (
                <span className="rounded bg-blue-500/20 px-1 py-px font-display text-[8px] text-game-blue">
                  YOU
                </span>
              )}
            </div>
            <span className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: getColorHex(player.color) }}>
              {COLOR_LABELS[player.color]}
            </span>
          </div>

          <div className="text-right">
            <span className="block font-display text-base font-bold leading-none text-game-gold md:text-xl">
              {player.tokensFinished}/4
            </span>
            <span className="text-[9px] uppercase text-game-muted">home</span>
          </div>

          {player.isCurrentTurn && (
            <div className="absolute -top-2 right-2 rounded bg-amber-500/20 px-1.5 py-0.5 font-display text-[8px] font-bold tracking-widest text-game-gold">
              TURN
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}
