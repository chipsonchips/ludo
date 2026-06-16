import { motion } from 'framer-motion';
import { useGameStore } from '@/stores/gameStore';

export function PrizePool() {
  const match = useGameStore((s) => s.match);

  return (
    <motion.div
      className="flex flex-col gap-2 rounded-xl p-3.5"
      style={{
        minWidth: 152,
        background: 'rgba(8, 6, 16, 0.90)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1.5px solid rgba(255,255,255,0.1)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
      }}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Room ID */}
      <div className="flex items-center gap-1.5">
        <span className="font-display text-[11px] font-bold uppercase tracking-widest text-game-gold">
          Room: {match.room.id}
        </span>
        <span className="text-[11px] text-white/35">🔒</span>
      </div>
      <div className="text-[10px] text-white/45 -mt-1">4 Players | Classic</div>

      {/* Prize pool */}
      <div className="border-t border-white/10 pt-2">
        <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-game-gold/60">
          Prize Pool
        </div>
        <div className="mt-0.5 flex items-center gap-1.5">
          <span className="text-base leading-none">🪙</span>
          <span
            className="font-display text-lg font-black leading-none text-game-gold"
            style={{ textShadow: '0 0 14px rgba(246,183,60,0.5)' }}
          >
            100 USDC
          </span>
        </div>
      </div>

      {/* Winner takes */}
      <div className="border-t border-white/10 pt-2">
        <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-white/40">
          Winner Takes
        </div>
        <div className="mt-0.5 flex items-center gap-1.5">
          <span className="text-sm leading-none">🏆</span>
          <span className="font-display text-base font-bold leading-none text-white">
            80 USDC
          </span>
        </div>
      </div>
    </motion.div>
  );
}
