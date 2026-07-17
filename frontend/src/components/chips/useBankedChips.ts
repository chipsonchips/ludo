/**
 * Real CHIP balance banked in ChipsBank (USDC, 6 decimals) — display-only for
 * now. Wired up only when a deployed bank address is configured AND the game
 * is running inside the hub with the bridge wallet connected; everywhere else
 * it resolves to null and the UI shows just the practice bankroll.
 */
import { useAccount, useReadContract } from 'wagmi';
import { CHIPS_BANK_ABI } from '@chipsonchips/shared';

const BANK_ADDRESS = import.meta.env.VITE_CHIPS_BANK_ADDRESS as `0x${string}` | undefined;

export function useBankedChips(): number | null {
  const { address, isConnected } = useAccount();

  const { data } = useReadContract({
    abi: CHIPS_BANK_ABI,
    address: BANK_ADDRESS,
    functionName: 'playerBalances',
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(BANK_ADDRESS && isConnected && address),
      refetchInterval: 30_000,
    },
  });

  if (!BANK_ADDRESS || !isConnected || data === undefined) return null;
  return Number(data) / 1e6;
}
