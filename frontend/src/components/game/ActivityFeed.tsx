import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/stores/gameStore';

export function ActivityFeed() {
  const activities = useGameStore((s) => s.activities);

  return (
    <div className="pointer-events-none absolute bottom-0 left-2 z-[5] flex w-48 flex-col justify-end gap-1.5 md:left-6 md:w-64">
      <AnimatePresence>
        {activities.map((act) => (
          <motion.div
            key={act.id}
            initial={{ opacity: 0, x: -20, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3, type: 'spring' }}
            className="flex items-center gap-2 rounded-md bg-black/40 px-3 py-1.5 backdrop-blur-md border border-white/5 shadow-md"
          >
            <div className="h-1.5 w-1.5 rounded-full bg-game-gold shadow-[0_0_5px_rgba(245,158,11,0.8)]" />
            <span className="text-xs font-medium text-white/90 drop-shadow-sm">{act.message}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
