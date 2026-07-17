import { useAccount } from 'wagmi';

/**
 * Small connected-address pill shown when the hub wallet bridge is active.
 * Renders nothing standalone (no wallet available outside the hub) or before
 * the bridge handshake resolves — it never competes with hub UI for space.
 */
export function WalletBadge() {
  const { address, isConnected } = useAccount();
  if (!isConnected || !address) return null;

  const short = `${address.slice(0, 6)}…${address.slice(-4)}`;

  return (
    <div
      title="Connected via ChipsOnChips"
      className="fixed right-4 top-4 z-50 flex items-center gap-1.5 rounded-full border border-white/10 bg-black/40 px-3 py-1.5 backdrop-blur-md"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
      <span className="font-mono text-[10px] font-bold tracking-wide text-game-gold">{short}</span>
    </div>
  );
}
