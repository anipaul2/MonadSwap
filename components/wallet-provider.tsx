import { farcasterMiniApp as miniAppConnector } from '@farcaster/miniapp-wagmi-connector'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, WagmiProvider, createConfig } from 'wagmi'
import { monadTestnet } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'
import { sdk } from '@farcaster/miniapp-sdk'

// Create connectors based on environment
const createConnectors = () => {
  const connectors = [miniAppConnector()];
  
  // FALLBACK: Add injected connector for desktop testing (when not in Farcaster app)
  // This allows testing in desktop browsers with browser extensions
  if (typeof window !== 'undefined') {
    // Check if we're likely in a Farcaster environment
    const isFarcasterEnvironment = !!(sdk.wallet?.ethProvider || window.location.hostname.includes('warpcast'));
    
    if (!isFarcasterEnvironment) {
      console.log('⚠️ Not in Farcaster environment, adding injected connector as fallback');
      connectors.push(injected() as any); // Type assertion to handle wagmi version differences
    }
  }
  
  return connectors;
};

export const config = createConfig({
  chains: [monadMainnet],
  transports: {
    [monadMainnet.id]: http('https://rpc-mainnet.monadinfra.com'),
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
