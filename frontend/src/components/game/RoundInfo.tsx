import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { RULE_DEFS } from '@shared/ludo/rules';
import { useGameStore } from '@/stores/gameStore';
import { IconCheck, IconChevronDown, IconX } from '../icons';

const CORE_RULES = [
  'Roll 6 to exit base',
  'Double six = bonus roll',
  'Land on a foe to capture',
  'Exact roll to finish',
];

/**
 * Table-rules card, docked to the right edge. Collapsible so it never sits
 * on top of the board — phones start collapsed, desktops start open.
 */
export function RoundInfo() {
  const ludo = useGameStore((s) => s.ludo);
  const [open, setOpen] = useState(
    () => typeof window === 'undefined' || window.matchMedia('(min-width: 768px)').matches
  );

  return (
    <motion.div
      className="glass-panel pointer-events-auto absolute right-2 top-1/2 z-[5] -translate-y-1/2 overflow-hidden md:right-4 max-md:bottom-[calc(6.5rem+env(safe-area-inset-bottom))] max-md:top-auto max-md:translate-y-0"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3 }}
    >
      <button
        className="flex w-full items-center justify-between gap-2 px-2.5 py-2 text-left font-display text-[10px] font-bold uppercase tracking-wider text-game-gold transition-colors hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-game-gold/60 md:px-3"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="table-rules-body"
      >
        Table Rules
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-game-gold/70"
        >
          <IconChevronDown size={12} />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id="table-rules-body"
            className="min-w-[120px] md:min-w-[150px]"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <div className="px-2.5 pb-2.5 md:px-3 md:pb-3">
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
