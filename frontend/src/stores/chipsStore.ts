/**
 * The table bankroll — practice chips, all client-side.
 *
 * These are the free casino chips every visitor plays with today: buy-ins,
 * pots, and capture bounties all move through this store so the game FEELS
 * like a chips game end to end. When real CHIP settlement lands (see
 * docs/CHIPS.md — ChipsBank escrow via the backend operator, same pattern as
 * spaceship), staked online tables swap this store for on-chain balances;
 * offline and friendly games keep practice chips forever.
 */
import { create } from 'zustand';

const STORAGE_KEY = 'luduchips.chips.v1';
export const STARTING_CHIPS = 500;
export const TOPUP_AMOUNT = 250;
/** Top-up unlocks only when the bankroll can no longer cover the smallest buy-in. */
export const TOPUP_THRESHOLD = 25;

function load(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw !== null) {
      const n = Number(raw);
      if (Number.isFinite(n) && n >= 0) return Math.floor(n);
    }
  } catch {
    // private mode etc. — bankroll just won't persist
  }
  return STARTING_CHIPS;
}

function save(balance: number) {
  try {
    localStorage.setItem(STORAGE_KEY, String(balance));
  } catch {
    // ignore
  }
}

export interface ChipDelta {
  id: number;
  amount: number; // positive = won, negative = spent
}

interface ChipsStore {
  balance: number;
  /** Last balance change, for HUD pulse/fly animations. */
  lastDelta: ChipDelta | null;

  /** Take chips off the bankroll; refuses (returns false) if it can't cover. */
  debit: (amount: number) => boolean;
  credit: (amount: number) => void;
  /** Broke? The house fronts a stack of practice chips. */
  claimTopUp: () => void;
}

let deltaId = 0;

export const useChipsStore = create<ChipsStore>((set, get) => ({
  balance: load(),
  lastDelta: null,

  debit: (amount) => {
    if (amount <= 0) return true;
    const { balance } = get();
    if (balance < amount) return false;
    const next = balance - amount;
    save(next);
    set({ balance: next, lastDelta: { id: deltaId++, amount: -amount } });
    return true;
  },

  credit: (amount) => {
    if (amount <= 0) return;
    const next = get().balance + Math.floor(amount);
    save(next);
    set({ balance: next, lastDelta: { id: deltaId++, amount: Math.floor(amount) } });
  },

  claimTopUp: () => {
    if (get().balance > TOPUP_THRESHOLD) return;
    const next = get().balance + TOPUP_AMOUNT;
    save(next);
    set({ balance: next, lastDelta: { id: deltaId++, amount: TOPUP_AMOUNT } });
  },
}));

export function formatChips(n: number): string {
  return n.toLocaleString('en-US');
}
