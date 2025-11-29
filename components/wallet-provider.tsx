import { farcasterMiniApp as miniAppConnector } from '@farcaster/miniapp-wagmi-connector'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, WagmiProvider, createConfig } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { sdk } from '@farcaster/miniapp-sdk'
import { defineChain } from 'viem'

// Define Monad Mainnet as a custom chain
export const mainnet = defineChain({
  id: 143,
  name: 'Monad Mainnet',
  nativeCurrency: {
    name: 'Monad',
    symbol: 'MON',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.monad.xyz'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Monad Explorer',
      url: 'https://monadvision.com/',
    },
  },
  contracts: {
    multicall3: {
      address: '0xcA11bde05977b3631167028862bE2a173976CA11',
    },
  },
}) 

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
  chains: [mainnet],
  transports: {
    [mainnet.id]: http('https://rpc.monad.xyz'),
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
