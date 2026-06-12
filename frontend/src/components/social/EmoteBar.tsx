import { motion } from 'framer-motion';
import { emotes } from '@dummy/emotes';
import { useGameStore } from '@/stores/gameStore';
import { useSound } from '@/hooks/useSound';

export function EmoteBar() {
  const sendEmote = useGameStore((s) => s.sendEmote);
  const { play } = useSound();

  return (
    <div className="flex gap-1 rounded-2xl border border-white/10 bg-white/5 p-1">
      {emotes.map((emote, i) => (
        <motion.button
          key={emote.id}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-lg transition-colors hover:bg-white/10 md:h-9 md:w-9 md:text-xl"
          onClick={() => {
            sendEmote(emote.emoji);
            play('emote');
          }}
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.9 }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.03 }}
          title={emote.label}
          aria-label={emote.label}
        >
          {emote.emoji}
        </motion.button>
      ))}
    </div>
  );
}
