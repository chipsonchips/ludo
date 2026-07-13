/**
 * Real-money stake selector for online 1v1 tables — the ChipsBank-backed
 * counterpart to the practice-chip StakePicker. Host picks a tier; the
 * guest sees the same panel read-only. Either side may need to verify
 * their hub wallet before a nonzero tier actually unlocks the match.
 */
import { STAKE_TIERS_USDC } from '@shared/stakes';
import { useRoomStore } from '@/stores/roomStore';
import { useHubStakeAuth } from '@/wallet/useHubStakeAuth';
import { useBankedChips } from './useBankedChips';
import { Button, FieldLabel } from '../ui';
import { IconChip } from '../icons';

function formatUsdc(amount: number): string {
  return amount === 0 ? 'Friendly' : `$${amount.toFixed(2)}`;
}

interface OnlineStakePickerProps {
  value: number;
  /** Omit to render read-only (the guest's view of the host's stake). */
  onChange?: (stake: number) => void;
}

export function OnlineStakePicker({ value, onChange }: OnlineStakePickerProps) {
  const seat = useRoomStore((s) => s.seat);
  const room = useRoomStore((s) => s.room);
  const pending = useRoomStore((s) => s.pending);
  const banked = useBankedChips();
  const { authenticate, walletConnected } = useHubStakeAuth();

  const readOnly = !onChange;
  const myWallet = seat !== null ? (room?.players[seat]?.wallet ?? null) : null;
  const verified = myWallet !== null;
  const pot = value * 2;

  return (
    <div>
      <div className="flex items-center justify-between">
        <FieldLabel>
          Table stakes
          {readOnly && <span className="ml-2 normal-case tracking-normal text-white/30">set by the host</span>}
        </FieldLabel>
        {banked !== null && (
          <div className="mb-2 flex items-center gap-1 text-[10px] text-game-secondary">
            <span className="text-game-gold">
              <IconChip size={12} />
            </span>
            Banked: <strong className="text-game-gold">${banked.toFixed(2)}</strong>
          </div>
        )}
      </div>

      <div role="radiogroup" aria-label="Table stakes" className="flex rounded-full border border-white/10 bg-black/30 p-1">
        {STAKE_TIERS_USDC.map((tier) => {
          const active = value === tier;
          const needsWallet = tier > 0 && !verified;
          const disabled = readOnly || (needsWallet && !walletConnected) || (tier > 0 && banked !== null && tier > banked);
          return (
            <button
              key={tier}
              role="radio"
              aria-checked={active}
              disabled={disabled}
              title={
                readOnly
                  ? undefined
                  : needsWallet && !walletConnected
                    ? 'Connect your hub wallet to stake real chips'
                    : tier > 0 && banked !== null && tier > banked
                      ? 'Not enough banked balance'
                      : undefined
              }
              onClick={() => onChange?.(tier)}
              className={`flex-1 rounded-full px-3 py-1.5 font-display text-[11px] font-bold uppercase tracking-wider transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-game-gold/70 disabled:cursor-not-allowed disabled:opacity-30 ${
                active
                  ? 'bg-game-gold/20 text-game-gold shadow-[inset_0_0_0_1px_rgba(246,183,60,0.5)]'
                  : 'text-game-secondary hover:text-white'
              }`}
            >
              {formatUsdc(tier)}
            </button>
          );
        })}
      </div>

      <p className="mt-2 text-[11px] text-game-secondary">
        {value === 0 ? (
          'No real chips on the line — just bragging rights.'
        ) : (
          <>
            Each of you antes <strong className="text-game-gold">${value.toFixed(2)}</strong> —{' '}
            <strong className="text-game-gold">${pot.toFixed(2)}</strong> rides on the table. Winner takes the pot,
            minus a small house rake.
          </>
        )}
      </p>

      {value > 0 && !verified && (
        <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-game-gold/30 bg-game-gold/10 px-3 py-2">
          <span className="text-[11px] text-game-gold">
            {walletConnected ? 'Verify your hub wallet to play this stake.' : 'Connect your hub wallet to play this stake.'}
          </span>
          {walletConnected && (
            <Button variant="ghost" loading={pending === 'authenticate'} onClick={() => void authenticate()}>
              Verify wallet
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
