import { useEffect, useRef } from 'react';
import { useAccount, useConnect } from 'wagmi';
import { CHIPS_HUB_CONNECTOR_ID, getHubBridgeProvider } from '@/lib/chipsHubConnector';

/**
 * Silently connects to the hub wallet when this app runs inside the
 * ChipsOnChips game iframe. Does nothing when opened directly — there's no
 * other connector configured, so wagmi just stays disconnected and nothing
 * in the existing game changes.
 */
export function HubAutoConnect() {
  const { isConnected } = useAccount();
  const { connectAsync, connectors } = useConnect();
  const connecting = useRef(false);
  const stateRef = useRef({ isConnected, connectAsync, connectors });
  stateRef.current = { isConnected, connectAsync, connectors };

  useEffect(() => {
    if (typeof window === 'undefined' || window.parent === window) return;

    const tryConnect = async () => {
      const { isConnected, connectAsync, connectors } = stateRef.current;
      if (connecting.current || isConnected) return;
      const connector = connectors.find((c) => c.id === CHIPS_HUB_CONNECTOR_ID);
      if (!connector) return;
      connecting.current = true;
      try {
        await connectAsync({ connector });
      } catch {
        // hub absent or user dismissed the hub login — no other flow to fall back to yet
      } finally {
        connecting.current = false;
      }
    };

    const provider = getHubBridgeProvider();
    provider.detect().then((ready) => {
      if (ready && ready.accounts.length > 0) void tryConnect();
    });

    const onAccounts = (data: unknown) => {
      const accounts = data as string[];
      if (accounts?.length > 0) void tryConnect();
    };
    provider.on('accountsChanged', onAccounts);
    return () => provider.removeListener('accountsChanged', onAccounts);
  }, []);

  return null;
}
