import { motion } from 'framer-motion';
import { RULE_DEFS } from '@shared/ludo/rules';
import { useGameStore } from '@/stores/gameStore';
import { IconCheck, IconX } from '../icons';

const CORE_RULES = [
  'Roll 6 to exit base',
  'Double six = bonus roll',
  'Land on a foe to capture',
  'Exact roll to finish',
];

export function RoundInfo() {
  const ludo = useGameStore((s) => s.ludo);

  return (
    <motion.div
      className="glass-panel pointer-events-auto absolute right-2 top-1/2 z-[5] min-w-[120px] -translate-y-1/2 p-2.5 md:right-4 md:min-w-[150px] md:p-3 max-md:bottom-[180px] max-md:top-auto max-md:translate-y-0"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3 }}
    >
      <div className="mb-2 text-center font-display text-[10px] font-bold uppercase tracking-wider text-game-gold">
        Table Rules
      </div>
      <ul className="flex flex-col gap-1">
        {CORE_RULES.map((rule) => (
          <li key={rule} className="text-[10px] leading-snug text-game-secondary">
            {rule}
          </li>
        ))}
      </ul>
      <div className="my-2 h-px bg-white/10" />
      <ul className="flex flex-col gap-1">
        {RULE_DEFS.map((def) => (
          <li key={def.id} className="flex items-center gap-1.5 text-[10px]" title={def.description}>
            {ludo.rules[def.id] ? (
              <span className="text-game-green">
                <IconCheck size={10} />
              </span>
            ) : (
              <span className="text-white/25">
                <IconX size={10} />
              </span>
            )}
            <span className={ludo.rules[def.id] ? 'text-white/85' : 'text-white/35'}>{def.label}</span>
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
