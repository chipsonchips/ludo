import { useState } from 'react';

/**
 * Chip-logo button that returns players to the ChipsOnChips hub.
 * Always confirms before leaving so nobody drops a room seat by accident.
 * target="_top" ensures navigation replaces the full window even when the
 * game runs inside the hub's /play/ludo frame.
 */

const HUB_URL = import.meta.env.VITE_HUB_URL || 'https://chipsonchips.netlify.app';

function ChipLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden>
      <defs>
        <linearGradient id="hub-gold" x1="14" y1="6" x2="52" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fde68a" />
          <stop offset="0.45" stopColor="#f59e0b" />
          <stop offset="1" stopColor="#b45309" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill="url(#hub-gold)" />
      <circle
        cx="32"
        cy="32"
        r="27"
        stroke="#14120c"
        strokeWidth="6"
        strokeDasharray="14.14 14.14"
        strokeDashoffset="7.07"
        fill="none"
      />
      <circle cx="32" cy="32" r="22" fill="#191512" />
      <circle cx="32" cy="32" r="22" stroke="#f59e0b" strokeWidth="1.6" fill="none" />
      <path d="M26.5 17.5l1.8-3 2 2.2 1.7-3.2 1.7 3.2 2-2.2 1.8 3z" fill="#f59e0b" />
      <path
        d="M41 25.5a11.5 11.5 0 1 0 0 13"
        stroke="#f59e0b"
        strokeWidth="4.6"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M38.2 28.6a6.2 6.2 0 1 0 0 6.8"
        stroke="#f59e0b"
        strokeWidth="3.4"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export function HubLink() {
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <button
        onClick={() => setConfirming(true)}
        title="Back to ChipsOnChips"
        aria-label="Back to ChipsOnChips"
        className="group fixed left-4 top-4 z-50 flex items-center gap-0 rounded-full border border-white/10 bg-black/40 p-1.5 backdrop-blur-md transition-all hover:border-game-gold/50 hover:bg-black/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-game-gold/70"
      >
        <ChipLogo size={28} />
        <span className="max-w-0 overflow-hidden whitespace-nowrap font-display text-[10px] font-bold uppercase tracking-widest text-game-gold transition-all duration-300 group-hover:ml-2 group-hover:max-w-[140px] group-hover:pr-2">
          ChipsOnChips
        </span>
      </button>

      {confirming && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="hub-leave-title"
        >
          <div className="glass-panel w-full max-w-sm p-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-game-gold/30 bg-game-gold/10 text-game-gold">
              <ChipLogo size={24} />
            </div>
            <h2 id="hub-leave-title" className="mb-2 font-display text-lg font-black text-white">
              Leave the lounge?
            </h2>
            <p className="mb-6 text-sm leading-relaxed text-game-secondary">
              If you&apos;re in a room, your seat is only held for a short grace period. Finish
              your match first, or come back quickly.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setConfirming(false)}
                className="w-full rounded-lg bg-game-gold px-4 py-2.5 font-display text-sm font-bold tracking-wider text-black transition-colors hover:bg-amber-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-game-gold/70"
              >
                Stay Here
              </button>
              <a
                href={HUB_URL}
                target="_top"
                className="w-full rounded-lg px-4 py-2.5 font-display text-sm font-bold tracking-wider text-game-secondary transition-colors hover:bg-white/5 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-game-gold/70"
              >
                Leave to ChipsOnChips
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
