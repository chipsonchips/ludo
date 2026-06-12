import { useCallback, useRef } from 'react';

type SoundType = 'roll' | 'land' | 'win' | 'emote' | 'click';

const frequencies: Record<SoundType, number[]> = {
  roll: [200, 250, 300, 350],
  land: [150, 100],
  win: [523, 659, 784],
  emote: [440],
  click: [800],
};

export function useSound() {
  const ctxRef = useRef<AudioContext | null>(null);

  const getContext = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
    }
    return ctxRef.current;
  }, []);

  const play = useCallback(
    (type: SoundType) => {
      try {
        const ctx = getContext();
        const freqs = frequencies[type];

        freqs.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = freq;
          osc.type = type === 'roll' ? 'sawtooth' : 'sine';
          const start = ctx.currentTime + i * 0.08;
          gain.gain.setValueAtTime(0.15, start);
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.2);
          osc.start(start);
          osc.stop(start + 0.2);
        });
      } catch {
        // Audio not available
      }
    },
    [getContext]
  );

  return { play };
}
