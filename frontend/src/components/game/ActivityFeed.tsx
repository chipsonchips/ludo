import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/stores/gameStore';
import { getColorHex } from '@/ludo/boardLayout';

const ACTIVITY_ICONS: Record<string, string> = {
  rolled: '🎲',
  captured: '💥',
  entered: '🏠',
  passed: '⏭️',
  won: '🏆',
};

function getActivityIcon(message: string): string {
  const lower = message.toLowerCase();
  for (const [key, icon] of Object.entries(ACTIVITY_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return '▸';
}

export function ActivityFeed() {
  const activities = useGameStore((s) => s.activities);
  const players = useGameStore((s) => s.ludo.players);

  function renderMessage(message: string) {
    for (const player of players) {
      const name = player.isLocalPlayer ? 'You' : player.username;
      if (message.startsWith(name) || message.startsWith(player.username)) {
        const matchName = message.startsWith(name) ? name : player.username;
        const rest = message.slice(matchName.length);
        return (
          <>
            <span
              className="font-bold"
              style={{ color: getColorHex(player.color) }}
            >
              {matchName}
            </span>
            <span className="text-white/80">{rest}</span>
          </>
        );
      }
    }
    return <span className="text-game-gold/90">{message}</span>;
  }

  return (
    <div className="flex flex-col gap-1">
      {/* Header */}
      <div className="mb-1 flex items-center gap-2">
        <span className="font-display text-[9px] font-bold uppercase tracking-[0.2em] text-white/40">
          Game Feed
        </span>
        <div className="flex-1 h-px bg-white/10" />
      </div>

      <AnimatePresence initial={false}>
        {activities.map((act) => (
          <motion.div
            key={act.id}
            initial={{ opacity: 0, x: -16, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.25, type: 'spring', stiffness: 300 }}
            className="flex items-center gap-2 rounded-lg px-2.5 py-1.5"
            style={{
              background: 'rgba(8, 6, 16, 0.78)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <span className="text-[12px] leading-none">{getActivityIcon(act.message)}</span>
            <span className="text-[11px] font-medium leading-snug">
              {renderMessage(act.message)}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
