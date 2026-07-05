import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '@/stores/gameStore';
import { EMOTE_MAP } from '../icons';

interface FloatingReaction {
  id: string;
  icon: string;
  x: number;
  y: number;
}

let floatId = 0;

export function ReactionOverlay() {
  const reactions = useGameStore((s) => s.reactions);
  const [floating, setFloating] = useState<FloatingReaction[]>([]);
  // Skip reactions that predate mount and StrictMode re-runs
  const lastSeenId = useRef<string | null>(reactions[reactions.length - 1]?.id ?? null);

  useEffect(() => {
    const latest = reactions[reactions.length - 1];
    if (!latest || latest.id === lastSeenId.current) return;
    lastSeenId.current = latest.id;

    const id = `float-${floatId++}`;
    const x = 20 + Math.random() * 60;
    const y = 30 + Math.random() * 40;

    setFloating((prev) => [...prev, { id, icon: latest.icon, x, y }]);

    const timer = setTimeout(() => {
      setFloating((prev) => prev.filter((r) => r.id !== id));
    }, 2500);

    return () => clearTimeout(timer);
  }, [reactions]);

  return (
    <div className="pointer-events-none absolute inset-0 z-[8] overflow-hidden">
      <AnimatePresence>
        {floating.map((r) => {
          const emote = EMOTE_MAP.get(r.icon);
          if (!emote) return null;
          return (
            <motion.div
              key={r.id}
              className="absolute drop-shadow-lg"
              style={{ left: `${r.x}%`, top: `${r.y}%`, color: emote.color }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1.4, opacity: 1, y: -60 }}
              exit={{ scale: 1.8, opacity: 0, y: -120 }}
              transition={{ duration: 2, ease: 'easeOut' }}
            >
              <emote.Icon size={34} />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
