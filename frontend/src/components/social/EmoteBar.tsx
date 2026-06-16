import { motion } from 'framer-motion';
import { emotes } from '@dummy/emotes';
import { useGameStore } from '@/stores/gameStore';
import { useSound } from '@/hooks/useSound';

const GRID_EMOTES = emotes.slice(0, 9);

export function EmoteBar() {
  const sendEmote = useGameStore((s) => s.sendEmote);
  const { play } = useSound();

  return (
    <div
      className="grid grid-cols-3 gap-1 rounded-xl p-2"
      style={{
        background: 'rgba(8, 6, 16, 0.90)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1.5px solid rgba(255,255,255,0.1)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
      }}
    >
      {GRID_EMOTES.map((emote, i) => (
        <motion.button
          key={emote.id}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-lg transition-colors hover:bg-white/10"
          onClick={() => {
            sendEmote(emote.emoji);
            play('emote');
          }}
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.85 }}
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.03, type: 'spring', stiffness: 300 }}
          title={emote.label}
          aria-label={emote.label}
        >
          {emote.emoji}
        </motion.button>
      ))}
    </div>
  );
}
