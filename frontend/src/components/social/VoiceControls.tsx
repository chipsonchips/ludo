import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '@/stores/gameStore';
import { useVoiceStore } from '@/stores/voiceStore';
import { IconMic, IconMicOff, IconSpinner, IconX } from '../icons';

/**
 * Voice-chat cluster for online matches: join / mute / hang up, plus a
 * pulsing hint when the opponent is already in voice waiting for you.
 * Rendered inside the bottom bar on every screen size.
 */
export function VoiceControls() {
  const isOnline = useGameStore((s) => s.session?.mode === 'online');
  const status = useVoiceStore((s) => s.status);
  const muted = useVoiceStore((s) => s.muted);
  const peerActive = useVoiceStore((s) => s.peerActive);
  const peerMuted = useVoiceStore((s) => s.peerMuted);
  const error = useVoiceStore((s) => s.error);
  const joinVoice = useVoiceStore((s) => s.joinVoice);
  const leaveVoice = useVoiceStore((s) => s.leaveVoice);
  const toggleMute = useVoiceStore((s) => s.toggleMute);

  if (!isOnline) return null;

  const inVoice = status === 'waiting' || status === 'connecting' || status === 'connected';
  const busy = status === 'requesting-mic';
  const invited = !inVoice && peerActive;

  const label =
    status === 'error'
      ? error ?? 'Voice unavailable'
      : status === 'requesting-mic'
        ? 'Requesting microphone…'
        : status === 'waiting'
          ? 'In voice — waiting for your opponent'
          : status === 'connecting'
            ? 'Connecting voice…'
            : status === 'connected'
              ? muted
                ? 'Voice on — you are muted'
                : 'Voice on — tap to mute'
              : invited
                ? 'Your opponent is in voice — tap to join'
                : 'Start voice chat';

  return (
    <div className="flex items-center gap-1.5">
      <div className="relative">
        {/* Pulsing ring when the opponent is waiting for us */}
        <AnimatePresence>
          {invited && (
            <motion.span
              className="pointer-events-none absolute inset-0 rounded-full border-2 border-game-green"
              initial={{ opacity: 0.8, scale: 1 }}
              animate={{ opacity: 0, scale: 1.6 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
            />
          )}
        </AnimatePresence>
        <button
          className={`relative flex h-10 w-10 items-center justify-center rounded-full border shadow-lg backdrop-blur-xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-game-gold/70 ${
            status === 'connected'
              ? muted
                ? 'border-game-red/50 bg-game-red/20 text-game-red'
                : 'border-game-green/50 bg-game-green/20 text-game-green'
              : status === 'error'
                ? 'border-game-red/50 bg-game-glass text-game-red'
                : inVoice
                  ? 'border-game-gold/50 bg-game-gold/15 text-game-gold'
                  : 'border-white/10 bg-game-glass text-white/80 hover:bg-white/10 hover:text-white'
          }`}
          onClick={() => {
            if (busy) return;
            if (!inVoice) void joinVoice();
            else toggleMute();
          }}
          disabled={busy}
          title={label}
          aria-label={label}
        >
          {busy || status === 'connecting' ? (
            <IconSpinner size={17} className="animate-spin" />
          ) : inVoice && !muted ? (
            <IconMic size={17} />
          ) : (
            <IconMicOff size={17} />
          )}
          {/* Live dot when connected */}
          {status === 'connected' && (
            <span
              className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border border-black/50 ${
                muted ? 'bg-game-red' : 'bg-game-green'
              }`}
            />
          )}
        </button>
      </div>

      {/* Hang up — only shown while in voice */}
      <AnimatePresence>
        {inVoice && (
          <motion.button
            className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-game-glass text-white/50 shadow backdrop-blur-xl transition-colors hover:border-game-red/40 hover:text-game-red focus:outline-none focus-visible:ring-2 focus-visible:ring-game-red/60"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            onClick={leaveVoice}
            title="Leave voice chat"
            aria-label="Leave voice chat"
          >
            <IconX size={13} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Opponent muted hint */}
      {status === 'connected' && peerMuted && (
        <span className="hidden text-[10px] font-medium text-white/40 sm:inline">Opponent muted</span>
      )}
    </div>
  );
}
