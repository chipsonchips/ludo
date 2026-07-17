import { useCallback } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { useRoomStore } from '@/stores/roomStore';

function buildLoginMessage(address: string, timestamp: number): string {
  return `LuduChips — sign in\n\nWallet: ${address}\nTimestamp: ${timestamp}`;
}

/**
 * Verifies the connected hub wallet with the room server so it can be used
 * for a staked online match. No HTTP session to manage — the WS connection
 * itself is the session; the server just remembers the wallet against the
 * seat once `authenticate` succeeds (see roomStore's 'authenticated' case).
 */
export function useHubStakeAuth() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const sendAuthenticate = useRoomStore((s) => s.sendAuthenticate);

  const authenticate = useCallback(async () => {
    if (!isConnected || !address) return;
    const message = buildLoginMessage(address, Date.now());
    const signature = await signMessageAsync({ account: address, message });
    sendAuthenticate(address, message, signature);
  }, [address, isConnected, signMessageAsync, sendAuthenticate]);

  return { authenticate, walletConnected: isConnected && !!address, address };
}
