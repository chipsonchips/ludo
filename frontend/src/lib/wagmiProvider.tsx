import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { base, celo } from 'wagmi/chains';
import { chipsHubConnector } from '@chipsonchips/shared/wallet-bridge';

const queryClient = new QueryClient();

const hubOrigins = (import.meta.env.VITE_HUB_ORIGINS as string | undefined)
  ?.split(',')
  .map((s) => s.trim())
  .filter(Boolean);

/**
 * chipsHubConnector is the only connector: ludo has no standalone wallet UI
 * of its own yet, so the wallet is only ever available when embedded in the
 * ChipsOnChips hub. Opened directly, wagmi simply reports "disconnected" —
 * nothing in the existing game breaks.
 */
export const wagmiConfig = createConfig({
  chains: [base, celo],
  connectors: [chipsHubConnector({ allowedOrigins: hubOrigins })],
  transports: {
    [base.id]: http('https://mainnet.base.org'),
    [celo.id]: http('https://forno.celo.org'),
  },
});

export function WalletProvider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
