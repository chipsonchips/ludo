import { motion } from 'framer-motion';
import { getColorHex } from '@/ludo/boardLayout';
import type { LudoPlayer } from '@/ludo/types';

const MOCK_LEVELS: Record<string, number> = {
  'player-local': 21,
  'player-2': 23,
  'player-3': 18,
  'player-4': 19,
};

const MOCK_COINS: Record<string, string> = {
  'player-local': '1,150',
  'player-2': '1,230',
  'player-3': '980',
  'player-4': '1,000',
};

interface PlayerCardProps {
  player: LudoPlayer;
  index?: number;
}

export function PlayerCard({ player, index = 0 }: PlayerCardProps) {
  const colorHex = getColorHex(player.color);
  const level = MOCK_LEVELS[player.id] ?? 20;
  const coins = MOCK_COINS[player.id] ?? '1,000';
  const isSpeaking = player.id === 'player-2';

  return (
    <motion.div
      className="flex flex-col items-center"
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.08, duration: 0.4, type: 'spring', stiffness: 200 }}
    >
      <div
        className="relative flex items-center gap-2.5 rounded-xl px-3 py-2.5"
        style={{
          minWidth: 190,
          background: 'rgba(8, 6, 16, 0.90)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: `1.5px solid ${player.isCurrentTurn ? colorHex : colorHex + '55'}`,
          boxShadow: player.isCurrentTurn
            ? `0 0 22px ${colorHex}55, 0 0 50px ${colorHex}22, inset 0 1px 0 rgba(255,255,255,0.12)`
            : `0 0 10px ${colorHex}25, inset 0 1px 0 rgba(255,255,255,0.07)`,
        }}
      >
        {/* Color tint sweep */}
        {player.isCurrentTurn && (
          <div
            className="absolute inset-0 rounded-xl opacity-[0.12]"
            style={{ background: `radial-gradient(ellipse at 0% 50%, ${colorHex}, transparent 70%)` }}
          />
        )}

        {/* Avatar */}
        <div className="relative z-10 shrink-0">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-lg text-2xl"
            style={{
              background: `linear-gradient(145deg, ${colorHex}30, ${colorHex}0a)`,
              border: `1.5px solid ${colorHex}55`,
            }}
          >
            {player.avatar}
          </div>
          <div
            className="absolute -bottom-1.5 -left-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-full text-[9px] font-black leading-none"
            style={{
              background: 'linear-gradient(135deg, #F6B73C, #d97706)',
              color: '#0A0812',
              boxShadow: '0 1px 5px rgba(0,0,0,0.5)',
            }}
          >
            {level}
          </div>
        </div>

        {/* Info */}
        <div className="relative z-10 flex flex-1 flex-col gap-1.5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-bold leading-none text-white">
              {player.isLocalPlayer ? 'You' : player.username}
            </span>
            <div
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] transition-all ${
                isSpeaking
                  ? 'bg-game-green/20 text-game-green shadow-[0_0_8px_rgba(34,197,94,0.5)]'
                  : 'bg-white/5 text-white/25'
              }`}
            >
              🎤
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="rounded px-1.5 py-0.5 font-display text-[10px] font-bold leading-none"
              style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.75)' }}
            >
              {level}
            </span>
            <span className="flex items-center gap-0.5 text-[11px] font-semibold leading-none text-game-gold">
              🪙 {coins}
            </span>
          </div>
        </div>
      </div>

      {/* YOUR TURN badge */}
      {player.isCurrentTurn && (
        <motion.div
          className="mt-1.5 rounded-full px-3 py-0.5 text-[10px] font-black uppercase tracking-widest"
          style={{
            background: 'linear-gradient(90deg, #F6B73C, #FF9D00)',
            color: '#0A0812',
            boxShadow: '0 0 14px rgba(246,183,60,0.55)',
          }}
          initial={{ scaleX: 0.5, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          Your Turn
        </motion.div>
      )}
    </motion.div>
  );
}
