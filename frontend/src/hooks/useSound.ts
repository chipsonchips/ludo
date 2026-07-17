/**
 * Synthesized game audio — no samples shipped, everything is generated in
 * the Web Audio API. The centerpiece is the dice roll: a burst of bandpass-
 * filtered noise "clicks" (dice tumbling against each other) over low
 * resonant "knocks" (dice hitting the table), decelerating as they settle,
 * exactly like a real pair of dice thrown on a board.
 */
import { useCallback } from 'react';

type SoundType = 'roll' | 'land' | 'win' | 'emote' | 'click' | 'capture' | 'home' | 'turn_start';

let sharedCtx: AudioContext | null = null;
let noiseBuffer: AudioBuffer | null = null;

function getContext(): AudioContext {
  if (!sharedCtx) sharedCtx = new AudioContext();
  if (sharedCtx.state === 'suspended') void sharedCtx.resume();
  return sharedCtx;
}

/** One second of cached white noise, the raw material for every percussive hit. */
function getNoise(ctx: AudioContext): AudioBuffer {
  if (!noiseBuffer) {
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  return noiseBuffer;
}

/** A short filtered-noise transient: the "click" of die on die / die on wood. */
function noiseHit(
  ctx: AudioContext,
  at: number,
  { freq, q = 8, gain, decay }: { freq: number; q?: number; gain: number; decay: number }
) {
  const src = ctx.createBufferSource();
  src.buffer = getNoise(ctx);
  src.playbackRate.value = 0.8 + Math.random() * 0.4;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  filter.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, at);
  g.gain.exponentialRampToValueAtTime(0.0001, at + decay);
  src.connect(filter).connect(g).connect(ctx.destination);
  src.start(at, Math.random(), decay + 0.05);
}

/** A low damped "thump": die weight landing on the table. */
function thump(ctx: AudioContext, at: number, freq: number, gain: number, decay = 0.12) {
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, at);
  osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 0.45), at + decay);
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, at);
  g.gain.exponentialRampToValueAtTime(0.0001, at + decay);
  osc.connect(g).connect(ctx.destination);
  osc.start(at);
  osc.stop(at + decay + 0.02);
}

/** A soft musical tone for chimes and fanfares. */
function tone(
  ctx: AudioContext,
  at: number,
  freq: number,
  { gain = 0.12, decay = 0.35, type = 'triangle' as OscillatorType } = {}
) {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(gain, at + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, at + decay);
  osc.connect(g).connect(ctx.destination);
  osc.start(at);
  osc.stop(at + decay + 0.02);
}

/**
 * Real dice physics in miniature: an initial hard throw, a flurry of fast
 * tumbles that slow down (spacing grows ~1.4x per bounce, energy fades),
 * and a final settling knock.
 */
function playDiceRoll(ctx: AudioContext) {
  const now = ctx.currentTime;
  // The throw: both dice hit the table hard
  thump(ctx, now, 190, 0.32, 0.1);
  noiseHit(ctx, now, { freq: 2600, gain: 0.32, decay: 0.05 });

  // Tumbling: clicks decelerate and lose energy as the dice shed momentum
  let t = now + 0.045;
  let spacing = 0.038;
  let energy = 1;
  while (t < now + 0.62) {
    // Each bounce: a bright click (die corner) and sometimes a body knock
    noiseHit(ctx, t, {
      freq: 1800 + Math.random() * 2400,
      gain: 0.22 * energy * (0.7 + Math.random() * 0.6),
      decay: 0.03 + Math.random() * 0.025,
    });
    if (Math.random() < 0.55) {
      thump(ctx, t + 0.004, 150 + Math.random() * 120, 0.16 * energy, 0.07);
    }
    spacing *= 1.32 + Math.random() * 0.18;
    energy *= 0.82;
    t += spacing;
  }

  // Settling: one last decisive knock as both dice come to rest
  thump(ctx, now + 0.66, 170, 0.2, 0.13);
  noiseHit(ctx, now + 0.66, { freq: 2100, gain: 0.14, decay: 0.06 });
}

export function useSound() {
  const play = useCallback((type: SoundType) => {
    try {
      const ctx = getContext();
      const now = ctx.currentTime;

      switch (type) {
        case 'roll':
          playDiceRoll(ctx);
          break;

        case 'land':
          // A token tapped onto a wooden board
          thump(ctx, now, 220, 0.24, 0.09);
          noiseHit(ctx, now, { freq: 1400, q: 5, gain: 0.16, decay: 0.05 });
          break;

        case 'capture':
          // Hard knock + the captured token skittering back to base
          thump(ctx, now, 130, 0.3, 0.14);
          noiseHit(ctx, now, { freq: 900, q: 4, gain: 0.2, decay: 0.08 });
          noiseHit(ctx, now + 0.1, { freq: 2400, gain: 0.1, decay: 0.05 });
          noiseHit(ctx, now + 0.18, { freq: 2800, gain: 0.07, decay: 0.04 });
          break;

        case 'home':
          thump(ctx, now, 260, 0.14, 0.08);
          tone(ctx, now + 0.02, 523.25, { gain: 0.1 });
          tone(ctx, now + 0.12, 783.99, { gain: 0.1, decay: 0.45 });
          break;

        case 'win':
          [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
            tone(ctx, now + i * 0.12, f, { gain: 0.12, decay: 0.5 });
            tone(ctx, now + i * 0.12, f * 2, { gain: 0.03, decay: 0.4, type: 'sine' });
          });
          break;

        case 'emote':
          // Bubbly pop
          tone(ctx, now, 520, { gain: 0.08, decay: 0.08, type: 'sine' });
          tone(ctx, now + 0.05, 740, { gain: 0.08, decay: 0.12, type: 'sine' });
          break;

        case 'click':
          // Soft felt-padded UI tick
          noiseHit(ctx, now, { freq: 3200, q: 10, gain: 0.1, decay: 0.025 });
          thump(ctx, now, 340, 0.06, 0.04);
          break;

        case 'turn_start':
          tone(ctx, now, 440, { gain: 0.07, decay: 0.15 });
          tone(ctx, now + 0.09, 659.25, { gain: 0.09, decay: 0.3 });
          break;
      }
    } catch {
      // Audio not available
    }
  }, []);

  return { play };
}
