/**
 * Bankroll readout: practice-chip balance with a win/loss flourish whenever
 * chips move, plus the on-chain banked balance when the hub wallet is live.
 */
import { AnimatePresence, motion } from 'framer-motion';
import { formatChips, useChipsStore } from '@/stores/chipsStore';
import { IconChip } from '../icons';
import { useBankedChips } from './useBankedChips';

export function ChipBalanceBadge({ compact = false }: { compact?: boolean }) {
  const balance = useChipsStore((s) => s.balance);
  const lastDelta = useChipsStore((s) => s.lastDelta);
  const banked = useBankedChips();

  return (
    <div className={`relative flex items-center gap-1.5 ${compact ? '' : 'rounded-full border border-game-gold/25 bg-game-gold/10 px-3 py-1.5'}`}>
      <span className="text-game-gold">
        <IconChip size={compact ? 14 : 16} />
      </span>
      <motion.span
        key={balance}
        initial={{ scale: 1.25 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 18 }}
        className={`font-display font-black tracking-wide text-game-gold ${compact ? 'text-[11px]' : 'text-[13px]'}`}
      >
        {formatChips(balance)}
      </motion.span>
      {!compact && <span className="text-[9px] uppercase tracking-widest text-game-secondary">chips</span>}
      {banked !== null && !compact && (
        <span className="ml-1 border-l border-white/10 pl-2 text-[9px] text-game-secondary" title="USDC banked in ChipsBank via the hub">
          {banked.toFixed(2)} banked
        </span>
      )}

      {/* Floating +N / −N flourish */}
      <AnimatePresence>
        {lastDelta && (
          <motion.span
            key={lastDelta.id}
            className={`pointer-events-none absolute -top-1 right-0 font-display text-[11px] font-black ${
              lastDelta.amount > 0 ? 'text-game-green' : 'text-game-red'
            }`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: [0, 1, 1, 0], y: -18 }}
            transition={{ duration: 1.6, times: [0, 0.15, 0.7, 1] }}
          >
            {lastDelta.amount > 0 ? `+${formatChips(lastDelta.amount)}` : formatChips(lastDelta.amount)}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
