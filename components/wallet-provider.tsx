import { farcasterMiniApp as miniAppConnector } from '@farcaster/miniapp-wagmi-connector'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, WagmiProvider, createConfig } from 'wagmi'
import { monadTestnet } from 'wagmi/chains'
import { sdk } from '@farcaster/miniapp-sdk'

// Create connectors based on environment
const createConnectors = () => {
  // Only use the Farcaster Miniapp Connector
  // Remove the injected connector that's causing conflicts
  return [miniAppConnector()];
};

export const config = createConfig({
  chains: [monadTestnet],
  transports: {
    [monadTestnet.id]: http('https://testnet-rpc.monad.xyz'),
  },
  connectors: createConnectors(),
})

const queryClient = new QueryClient()

export function WalletProvider({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  )
}
