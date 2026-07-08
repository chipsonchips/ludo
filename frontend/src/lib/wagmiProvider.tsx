import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { base, celo } from 'wagmi/chains';
import { chipsHubConnector } from './chipsHubConnector';

const queryClient = new QueryClient();

/**
 * chipsHubConnector is the only connector: ludo has no standalone wallet UI
 * of its own yet, so the wallet is only ever available when embedded in the
 * ChipsOnChips hub. Opened directly, wagmi simply reports "disconnected" —
 * nothing in the existing game breaks.
 */
export const wagmiConfig = createConfig({
  chains: [base, celo],
  connectors: [chipsHubConnector()],
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
