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
      className="glass-panel flex max-h-[140px] w-full max-w-[280px] flex-col overflow-hidden md:max-h-[200px]"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
    >
      <div
        className="flex flex-1 flex-col gap-1 overflow-y-auto p-2 px-3 [scrollbar-color:var(--color-game-muted)_transparent] [scrollbar-width:thin]"
        ref={listRef}
      >
        <AnimatePresence>
          {match.chat.map((msg) => (
            <motion.div
              key={msg.id}
              className={`text-xs leading-snug ${msg.type === 'system' ? 'text-center' : ''}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
            >
              {msg.type === 'system' ? (
                <span className="text-[10px] italic text-game-muted">{msg.message}</span>
              ) : msg.type === 'emote' ? (
                <span className="text-base">
                  <strong>{msg.username}</strong> {msg.message}
                </span>
              ) : (
                <>
                  <strong className="mr-1.5 text-game-blue">{msg.username}</strong>
                  <span className="text-game-secondary">{msg.message}</span>
                </>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <form className="flex gap-1.5 border-t border-white/10 p-1.5 px-2" onSubmit={handleSubmit}>
        <input
          type="text"
          className="flex-1 rounded-lg bg-white/5 px-2 py-1 text-xs text-game-primary placeholder:text-game-muted"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={200}
        />
        <button
          type="submit"
          className="flex h-7 w-7 items-center justify-center rounded-full bg-game-blue text-xs text-white transition-opacity disabled:opacity-30"
          disabled={!input.trim()}
          aria-label="Send message"
        >
          ➤
        </button>
      </form>
    </motion.div>
  );
}
