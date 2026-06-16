import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/stores/gameStore';
import { RollButton } from './RollButton';
import { ChatPanel } from '../social/ChatPanel';

interface ActionButtonProps {
  icon: string;
  label: string;
  onClick?: () => void;
  active?: boolean;
  glow?: string;
}

function ActionButton({ icon, label, onClick, active, glow }: ActionButtonProps) {
  return (
    <button
      className="flex flex-col items-center gap-1.5 transition-opacity hover:opacity-90"
      onClick={onClick}
    >
      <div
        className="flex h-12 w-12 items-center justify-center rounded-full text-xl transition-all"
        style={{
          background: 'rgba(8, 6, 16, 0.88)',
          border: `1.5px solid ${active && glow ? glow + '80' : 'rgba(255,255,255,0.12)'}`,
          boxShadow: active && glow ? `0 0 14px ${glow}44` : '0 2px 10px rgba(0,0,0,0.4)',
          backdropFilter: 'blur(16px)',
        }}
      >
        {icon}
      </div>
      <span className="text-[9px] font-bold uppercase tracking-wider text-white/45">{label}</span>
    </button>
  );
}

export function BottomBar() {
  const { toggleChat, showChat, voiceMuted, toggleVoiceMute } = useGameStore();

  return (
    <motion.footer
      className="relative z-10 flex w-full items-end justify-between gap-4 px-6 pb-5 pt-3"
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut', delay: 0.2 }}
    >
      {/* Chat panel floats above the left buttons */}
      <AnimatePresence>
        {showChat && (
          <motion.div
            className="absolute bottom-[88px] left-6"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.2 }}
          >
            <ChatPanel />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Left: action buttons */}
      <div className="flex items-end gap-3">
        <ActionButton icon="💬" label="Chat" onClick={toggleChat} active={showChat} glow="#3B82F6" />
        <ActionButton icon="😊" label="Emotes" />
        <ActionButton
          icon={voiceMuted ? '🔇' : '🎤'}
          label="Voice Chat"
          onClick={toggleVoiceMute}
          active={!voiceMuted}
          glow="#22C55E"
        />
      </div>

      {/* Center: Roll button */}
      <div className="flex flex-col items-center">
        <RollButton />
      </div>

      {/* Right: utility buttons */}
      <div className="flex items-end gap-3">
        <ActionButton icon="↩️" label="Undo" />
        <ActionButton icon="📖" label="Rules" />
      </div>
    </motion.footer>
  );
}
