import { motion } from 'framer-motion';
import { useGameStore } from '@/stores/gameStore';
import { RollButton } from './RollButton';
import { ChatPanel } from '../social/ChatPanel';
import { EmoteBar } from '../social/EmoteBar';

export function BottomBar() {
  const { toggleChat, ludo } = useGameStore();

  return (
    <motion.footer
      className="pointer-events-none z-10 flex items-end justify-between gap-2 px-3 pb-4 pt-3 md:gap-4 md:px-5 md:pb-5"
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut', delay: 0.2 }}
    >
      <div className="pointer-events-auto hidden flex-1 items-end gap-2 md:flex">
        <ChatPanel />
        <button
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-game-glass text-base backdrop-blur-xl"
          onClick={toggleChat}
          aria-label="Toggle chat"
        >
          💬
        </button>
      </div>

      <div className="pointer-events-auto flex flex-col items-center gap-2">
        <RollButton />
        {ludo.phase === 'select_token' && (
          <div className="text-center text-[10px] text-game-secondary">
            Tap a highlighted token on the board
          </div>
        )}
      </div>

      <div className="pointer-events-auto absolute bottom-[100px] right-3 flex flex-1 justify-end md:static md:bottom-auto md:right-auto">
        <EmoteBar />
      </div>
    </motion.footer>
  );
}
