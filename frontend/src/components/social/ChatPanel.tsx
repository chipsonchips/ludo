import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/stores/gameStore';

export function ChatPanel() {
  const { match, showChat, sendChat } = useGameStore();
  const [input, setInput] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [match.chat.length]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendChat(input.trim());
    setInput('');
  };

  if (!showChat) return null;

  return (
    <motion.div
      className="glass-panel flex max-h-[140px] w-full max-w-[280px] flex-col overflow-hidden shadow-xl md:max-h-[220px]"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
    >
      <div
        className="flex flex-1 flex-col gap-1.5 overflow-y-auto p-2.5 px-3.5 [scrollbar-color:var(--color-game-gold)_transparent] [scrollbar-width:thin]"
        ref={listRef}
      >
        <AnimatePresence>
          {match.chat.map((msg) => (
            <motion.div
              key={msg.id}
              className={`text-xs leading-relaxed ${msg.type === 'system' ? 'text-center' : ''}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
            >
              {msg.type === 'system' ? (
                <span className="text-[10px] italic text-game-gold drop-shadow-sm">{msg.message}</span>
              ) : msg.type === 'emote' ? (
                <span className="text-base drop-shadow-md">
                  <strong className="text-white/90">{msg.username}</strong> {msg.message}
                </span>
              ) : (
                <>
                  <strong className="mr-1.5 text-game-blue drop-shadow-sm">{msg.username}</strong>
                  <span className="text-white/80">{msg.message}</span>
                </>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <form className="flex gap-2 border-t border-white/10 bg-black/20 p-2" onSubmit={handleSubmit}>
        <input
          type="text"
          className="flex-1 rounded-full border border-white/5 bg-white/5 px-3 py-1.5 text-xs text-game-primary placeholder:text-white/30 transition-colors focus:border-game-gold/50 focus:bg-white/10"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={200}
        />
        <button
          type="submit"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-game-gold text-xs text-black transition-all disabled:opacity-30 disabled:grayscale hover:bg-game-orange hover:shadow-[0_0_10px_rgba(246,183,60,0.5)]"
          disabled={!input.trim()}
          aria-label="Send message"
        >
          ➤
        </button>
      </form>
    </motion.div>
  );
}
