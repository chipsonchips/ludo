import { motion } from 'framer-motion';
import { EMOTES } from '../icons';
import { useGameStore } from '@/stores/gameStore';
import { useSound } from '@/hooks/useSound';

export function EmoteBar() {
  const sendReactionIcon = useGameStore((s) => s.sendReactionIcon);
  const { play } = useSound();

  return (
    <div className="flex gap-1 rounded-2xl border border-white/10 bg-white/5 p-1">
      {EMOTES.map((emote, i) => (
        <motion.button
          key={emote.id}
          className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-game-gold/70 md:h-9 md:w-9"
          style={{ color: emote.color }}
          onClick={() => {
            sendReactionIcon(emote.id);
            play('emote');
          }}
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.9 }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.03 }}
          title={emote.label}
          aria-label={`React: ${emote.label}`}
        >
          <emote.Icon size={19} />
        </motion.button>
      ))}
    </div>
  );
}
