import { motion } from 'framer-motion';
import { useGameStore } from '@/stores/gameStore';
import { RollButton } from './RollButton';
import { ChatPanel } from '../social/ChatPanel';
import { EmoteBar } from '../social/EmoteBar';

export function BottomBar() {
  const { toggleChat } = useGameStore();

  return (
    <motion.footer
      className="pointer-events-none z-10 flex w-full items-end justify-between gap-2 px-2 pb-2 md:gap-4 md:px-6 md:pb-6"
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut', delay: 0.2 }}
    >
      <div className="pointer-events-auto hidden flex-1 items-end gap-2 md:flex">
        <ChatPanel />
        <button
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-game-glass shadow-lg backdrop-blur-xl transition-all hover:bg-white/10 hover:shadow-white/5"
          onClick={toggleChat}
          aria-label="Toggle chat"
        >
          💬
        </button>
      </div>

      <div className="pointer-events-auto flex flex-col items-center">
        <RollButton />
      </div>

      <div className="pointer-events-auto flex flex-1 justify-end">
        <div className="glass-panel p-1.5 shadow-lg">
          <EmoteBar />
        </div>
      </div>
    </motion.footer>
  );
}
