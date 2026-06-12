import { motion } from 'framer-motion';
import { useGameStore } from '@/stores/gameStore';

const RULES = [
  'Roll 6 to exit base',
  '6 = bonus turn',
  '★ = safe square',
  'Land on foe = capture',
  'Exact roll to enter HOME',
];

export function RoundInfo() {
  const ludo = useGameStore((s) => s.ludo);

  return (
    <motion.div
      className="glass-panel pointer-events-auto absolute right-2 top-1/2 z-[5] min-w-[110px] -translate-y-1/2 p-2.5 md:right-4 md:min-w-[130px] md:p-3 max-md:bottom-[180px] max-md:top-auto max-md:translate-y-0"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3 }}
    >
      <div className="mb-2 text-center font-display text-[10px] font-bold uppercase tracking-wider text-game-gold">
        Ludo Rules
      </div>
      <ul className="flex flex-col gap-1.5">
        {RULES.map((rule) => (
          <li key={rule} className="text-[10px] leading-snug text-game-secondary">
            {rule}
          </li>
        ))}
      </ul>
      {ludo.message && (
        <div className="mt-2 border-t border-white/10 pt-2 text-center text-[10px] font-medium text-game-gold">
          {ludo.message}
        </div>
      )}
    </motion.div>
  );
}
