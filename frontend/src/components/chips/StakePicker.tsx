/**
 * Buy-in selector for staked tables. The house matches the buy-in for every
 * opponent seat, so the pot scales with the table size — winner takes all,
 * captures pay a bounty on top.
 */
import { formatChips, TOPUP_AMOUNT, TOPUP_THRESHOLD, useChipsStore } from '@/stores/chipsStore';
import { FieldLabel } from '../ui';
import { IconChip } from '../icons';

const STAKES = [0, 25, 100, 250] as const;

interface StakePickerProps {
  value: number;
  onChange: (stake: number) => void;
  /** Number of owners at the table (you + opponents) — sizes the projected pot. */
  seats: number;
}

export function StakePicker({ value, onChange, seats }: StakePickerProps) {
  const balance = useChipsStore((s) => s.balance);
  const claimTopUp = useChipsStore((s) => s.claimTopUp);
  const pot = value * seats;

  return (
    <div>
      <div className="flex items-center justify-between">
        <FieldLabel>Table stakes</FieldLabel>
        <div className="mb-2 flex items-center gap-1 text-[10px] text-game-secondary">
          <span className="text-game-gold">
            <IconChip size={12} />
          </span>
          Bankroll: <strong className="text-game-gold">{formatChips(balance)}</strong>
        </div>
      </div>

      <div role="radiogroup" aria-label="Table stakes" className="flex rounded-full border border-white/10 bg-black/30 p-1">
        {STAKES.map((stake) => {
          const disabled = stake > balance;
          const active = value === stake;
          return (
            <button
              key={stake}
              role="radio"
              aria-checked={active}
              disabled={disabled}
              title={disabled ? 'Not enough chips' : undefined}
              onClick={() => onChange(stake)}
              className={`flex-1 rounded-full px-3 py-1.5 font-display text-[11px] font-bold uppercase tracking-wider transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-game-gold/70 disabled:cursor-not-allowed disabled:opacity-30 ${
                active
                  ? 'bg-game-gold/20 text-game-gold shadow-[inset_0_0_0_1px_rgba(246,183,60,0.5)]'
                  : 'text-game-secondary hover:text-white'
              }`}
            >
              {stake === 0 ? 'Friendly' : formatChips(stake)}
            </button>
          );
        })}
      </div>

      <p className="mt-2 text-[11px] text-game-secondary">
        {value === 0 ? (
          'No chips on the line — just bragging rights.'
        ) : (
          <>
            You ante <strong className="text-game-gold">{formatChips(value)}</strong>, the house matches every seat —{' '}
            <strong className="text-game-gold">{formatChips(pot)} chips</strong> ride on the table. Winner takes the pot;
            every capture pays a bounty.
          </>
        )}
      </p>

      {balance <= TOPUP_THRESHOLD && (
        <button
          onClick={claimTopUp}
          className="mt-2 rounded-full border border-game-green/40 bg-game-green/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-game-green transition-colors hover:bg-game-green/20"
        >
          Broke? Claim {TOPUP_AMOUNT} free chips
        </button>
      )}
    </div>
  );
}
