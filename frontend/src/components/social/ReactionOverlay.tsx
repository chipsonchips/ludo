import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '@/stores/gameStore';

interface FloatingReaction {
  id: string;
  emoji: string;
  x: number;
  y: number;
}

export function ReactionOverlay() {
  const reactions = useGameStore((s) => s.match.reactions);
  const [floating, setFloating] = useState<FloatingReaction[]>([]);

  const seenRef = useRef(new Set<string>());

  useEffect(() => {
    const latest = reactions[reactions.length - 1];
    if (!latest || seenRef.current.has(latest.id)) return;
    seenRef.current.add(latest.id);

    const id = latest.id;
    const x = 20 + Math.random() * 60;
    const y = 30 + Math.random() * 40;

    setFloating((prev) => [...prev, { id, emoji: latest.emoji, x, y }]);

    const timer = setTimeout(() => {
      setFloating((prev) => prev.filter((r) => r.id !== id));
    }, 2500);

    return () => clearTimeout(timer);
  }, [reactions]);

  return (
    <div className="pointer-events-none absolute inset-0 z-[8] overflow-hidden">
      <AnimatePresence>
        {floating.map((r) => (
          <motion.div
            key={r.id}
            className="absolute text-[28px] drop-shadow-lg md:text-4xl"
            style={{ left: `${r.x}%`, top: `${r.y}%` }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1.5, opacity: 1, y: -60 }}
            exit={{ scale: 2, opacity: 0, y: -120 }}
            transition={{ duration: 2, ease: 'easeOut' }}
          >
            {r.emoji}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
