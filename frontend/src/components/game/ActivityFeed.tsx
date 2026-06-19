import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/stores/gameStore';
import { getColorHex } from '@/ludo/boardLayout';

const ACTIVITY_ICONS: Record<string, string> = {
  rolled: '🎲',
  captured: '💥',
  entered: '🏠',
  moved: '🚶',
  passed: '⏭️',
  won: '🏆',
  'your turn': '⏰',
  'it\'s': '⏰',
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

  function colorPlayerNames(text: string): React.ReactNode[] {
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let key = 0;
    while (remaining.length > 0) {
      let earliestIdx = remaining.length;
      let matchedPlayer: typeof players[number] | null = null;
      let matchedName = '';
      for (const player of players) {
        const name = player.isLocalPlayer ? 'You' : player.username;
        const idx = remaining.indexOf(name);
        if (idx !== -1 && idx < earliestIdx) {
          earliestIdx = idx;
          matchedPlayer = player;
          matchedName = name;
        }
      }
      if (!matchedPlayer) {
        parts.push(<span key={key++} className="text-white/80">{remaining}</span>);
        break;
      }
      if (earliestIdx > 0) {
        parts.push(<span key={key++} className="text-white/80">{remaining.slice(0, earliestIdx)}</span>);
      }
      parts.push(
        <span key={key++} className="font-bold" style={{ color: getColorHex(matchedPlayer.color) }}>
          {matchedName}
        </span>
      );
      remaining = remaining.slice(earliestIdx + matchedName.length);
    }
    return parts;
  }

  function renderMessage(message: string) {
    const hasPlayerName = players.some((p) => {
      const name = p.isLocalPlayer ? 'You' : p.username;
      return message.includes(name);
    });
    if (hasPlayerName) return <>{colorPlayerNames(message)}</>;
    return <span className="text-game-gold/90">{message}</span>;
  }

  return (
    <div
      className="flex flex-col gap-1.5 rounded-xl p-3.5"
      style={{
        background: 'rgba(8, 6, 16, 0.90)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1.5px solid rgba(255,255,255,0.1)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
      }}
    >
      <span className="font-display text-[10px] font-bold uppercase tracking-[0.15em] text-game-gold">
        Game Feed
      </span>

      <AnimatePresence initial={false}>
        {activities.map((act) => (
          <motion.div
            key={act.id}
            initial={{ opacity: 0, x: -16, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.25, type: 'spring', stiffness: 300 }}
            className="flex items-center gap-2 py-0.5"
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
