import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '@/stores/gameStore';
import { RollButton } from './RollButton';
import { ChatPanel } from '../social/ChatPanel';
import { EmoteBar } from '../social/EmoteBar';
import { VoiceControls } from '../social/VoiceControls';
import { IconChat, IconLaugh } from '../icons';

export function BottomBar() {
  const toggleChat = useGameStore((s) => s.toggleChat);
  const showChat = useGameStore((s) => s.showChat);
  const [emotesOpen, setEmotesOpen] = useState(false);

  return (
    <motion.footer
      className="pointer-events-none z-10 flex w-full items-end justify-between gap-2 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] md:gap-4 md:px-6 md:pb-6"
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut', delay: 0.2 }}
    >
      {/* Left: chat + voice — reachable on every screen size */}
      <div className="pointer-events-auto relative flex flex-1 items-end gap-1.5 md:gap-2">
        {/* On mobile the chat floats above the controls so it never squeezes the
            roll button; z-30 keeps it above the roll status text and rules pill */}
        <div className="absolute bottom-12 left-0 z-30 w-[min(280px,calc(100vw-6rem))] md:static md:z-auto md:w-auto">
          {/* Opaque on mobile — it floats over the roll status text, and HUD
              text bleeding through the glass blur reads as a glitch */}
          <ChatPanel className="max-md:bg-[#14141f]/95" />
        </div>
        <button
          className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border shadow-lg backdrop-blur-xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-game-gold/70 ${
            showChat
              ? 'border-game-gold/40 bg-game-gold/15 text-game-gold'
              : 'border-white/10 bg-game-glass text-white/80 hover:bg-white/10 hover:text-white'
          }`}
          onClick={toggleChat}
          aria-label="Toggle chat"
          aria-pressed={showChat}
        >
          <IconChat size={18} />
        </button>
        <VoiceControls />
      </div>

      {/* Center: the one control that matters — always unobstructed */}
      <div className="pointer-events-auto flex flex-shrink-0 flex-col items-center">
        <RollButton />
      </div>

      {/* Right: emotes — inline on desktop, popover on mobile */}
      <div className="pointer-events-auto flex flex-1 items-end justify-end">
        <div className="hidden md:block">
          <div className="glass-panel p-1.5 shadow-lg">
            <EmoteBar />
          </div>
        </div>
        <div className="relative md:hidden">
          <AnimatePresence>
            {emotesOpen && (
              <motion.div
                className="glass-panel absolute bottom-12 right-0 z-30 p-1.5 shadow-lg"
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
              >
                <EmoteBar />
              </motion.div>
            )}
          </AnimatePresence>
          <button
            className={`flex h-10 w-10 items-center justify-center rounded-full border shadow-lg backdrop-blur-xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-game-gold/70 ${
              emotesOpen
                ? 'border-game-gold/40 bg-game-gold/15 text-game-gold'
                : 'border-white/10 bg-game-glass text-white/80 hover:bg-white/10 hover:text-white'
            }`}
            onClick={() => setEmotesOpen((v) => !v)}
            aria-label="Toggle reactions"
            aria-pressed={emotesOpen}
          >
            <IconLaugh size={18} />
          </button>
        </div>
      </div>
    </motion.footer>
  );
}
