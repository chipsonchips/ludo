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
    <div className="pointer-events-none z-[5] flex flex-wrap justify-center gap-2 px-2 md:justify-between md:px-6 md:gap-4">
      {ludo.players.map((player, i) => (
        <motion.div
          key={player.id}
          className={`glass-panel pointer-events-auto relative flex min-w-[calc(50%-8px)] items-center gap-2.5 overflow-hidden p-2 md:min-w-[160px] md:gap-3 md:p-2.5 md:px-4 ${
            player.isCurrentTurn ? 'ring-1 ring-white/20' : ''
          }`}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1, duration: 0.4 }}
        >
          {/* Active Turn Glow Background */}
          {player.isCurrentTurn && (
            <div
              className="absolute inset-0 bg-gradient-to-r opacity-20"
              style={{ backgroundImage: `linear-gradient(to right, ${getColorHex(player.color)}, transparent)` }}
            />
          )}

          {/* Avatar Area */}
          <div className="relative flex shrink-0">
            <div
              className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-[1.5px] border-white/10 bg-black/50 text-xl shadow-inner md:h-12 md:w-12 md:text-2xl"
              style={{ borderColor: player.isCurrentTurn ? getColorHex(player.color) : 'rgba(255,255,255,0.1)' }}
            >
              {player.avatar}
            </div>
            {/* Voice indicator ring */}
            <div className={`absolute -inset-1 rounded-full border border-game-green/50 ${player.id === 'player-2' ? 'animate-ring-pulse opacity-100' : 'opacity-0'}`} />
          </div>

          <div className="relative z-10 flex min-w-0 flex-1 flex-col justify-center">
            <div className="flex items-center gap-1.5 truncate text-sm font-bold text-white drop-shadow-md">
              {player.username}
              {player.isLocalPlayer && (
                <span className="rounded border border-game-blue/30 bg-game-blue/10 px-1 py-0.5 font-display text-[8px] font-bold tracking-wider text-game-blue shadow-sm">
                  YOU
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2 mt-0.5">
               <div className="flex items-center gap-1">
                 <span className="text-xs">🏆</span>
                 <span className="font-display text-[10px] font-semibold text-game-secondary">1.2K</span>
               </div>
               <span
                 className="font-display text-[9px] font-bold uppercase tracking-widest drop-shadow-md"
                 style={{ color: getColorHex(player.color) }}
               >
                 {COLOR_LABELS[player.color]}
               </span>
            </div>
          </div>

          <div className="relative z-10 flex flex-col items-end justify-center border-l border-white/10 pl-2">
            <span className="block font-display text-lg font-black leading-none drop-shadow-md md:text-2xl" style={{ color: player.tokensFinished === 4 ? getColorHex(player.color) : 'white' }}>
              {player.tokensFinished}<span className="text-xs text-game-muted">/4</span>
            </span>
          </div>

          {/* Turn indicator bar at bottom */}
          {player.isCurrentTurn && (
            <motion.div
              layoutId="turn-indicator"
              className="absolute bottom-0 left-0 h-[3px] w-full"
              style={{ backgroundColor: getColorHex(player.color), boxShadow: `0 0 10px ${getColorHex(player.color)}` }}
            />
          )}
        </motion.div>
      ))}
    </div>
  );
}
