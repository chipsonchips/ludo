import { useGameStore } from '@/stores/gameStore';

export function VoiceControls() {
  const { voiceMuted, pushToTalk, toggleVoiceMute, togglePushToTalk } = useGameStore();

  return (
    <div className="flex items-center gap-1.5">
      <button
        className={`flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm transition-all hover:scale-105 hover:bg-white/10 ${
          voiceMuted ? 'border-game-red opacity-70' : 'border-game-green shadow-[0_0_8px_rgba(34,197,94,0.3)]'
        }`}
        onClick={toggleVoiceMute}
        title={voiceMuted ? 'Unmute' : 'Mute'}
        aria-label={voiceMuted ? 'Unmute microphone' : 'Mute microphone'}
      >
        {voiceMuted ? '🔇' : '🎤'}
      </button>
      <button
        className={`flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 font-display text-[9px] font-bold transition-all hover:scale-105 hover:bg-white/10 ${
          pushToTalk ? 'border-game-blue text-game-blue' : ''
        }`}
        onClick={togglePushToTalk}
        title="Push to talk"
        aria-label="Toggle push to talk"
      >
        PTT
      </button>
      <div className="flex gap-1">
        <span
          className="h-2 w-2 animate-pulse-glow rounded-full bg-game-green shadow-[0_0_6px_rgba(34,197,94,0.6)]"
          title="NovaBlaze speaking"
        />
      </div>
    </div>
  );
}
