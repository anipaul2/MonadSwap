import type { Context } from '@farcaster/miniapp-sdk'
import sdk from '@farcaster/miniapp-sdk'
import { useQuery } from '@tanstack/react-query'
import { type ReactNode, createContext, useContext } from 'react'

interface FrameContextValue {
  context: Context.MiniAppContext | undefined
  isLoading: boolean
  isSDKLoaded: boolean
  isEthProviderAvailable: boolean
  actions: typeof sdk.actions | undefined
  haptics: typeof sdk.haptics | undefined
}

const FrameProviderContext = createContext<FrameContextValue | undefined>(
  undefined,
)

export function useFrame() {
  const context = useContext(FrameProviderContext)
  if (context === undefined) {
    throw new Error('useFrame must be used within a FrameProvider')
  }
  return context
}

interface FrameProviderProps {
  children: ReactNode
}

export function FrameProvider({ children }: FrameProviderProps) {
  const farcasterContextQuery = useQuery({
    queryKey: ['farcaster-context'],
    queryFn: async () => {
      try {
        console.log('FrameProvider: Getting SDK context...');
        const context = await sdk.context;
        console.log('FrameProvider: Context loaded:', context ? 'success' : 'null');
        
        // Context loaded successfully - don't call ready() here
        // The app component will handle calling sdk.actions.ready()
        
        return { context, isReady: Boolean(context) };
      } catch (err) {
        console.error('FrameProvider: SDK context error:', err);
        return { context: null, isReady: false };
      }
    },
    staleTime: Infinity, // Don't refetch
    retry: 1
  })

  const isReady = farcasterContextQuery.data?.isReady ?? false

  return (
    <FrameProviderContext.Provider
      value={{
        context: farcasterContextQuery.data?.context || undefined,
        actions: sdk.actions,
        haptics: sdk.haptics,
        isLoading: farcasterContextQuery.isPending,
        isSDKLoaded: isReady && Boolean(farcasterContextQuery.data?.context),
        isEthProviderAvailable: Boolean(sdk.wallet.ethProvider),
      }}
    >
      {children}
    </FrameProviderContext.Provider>
  )
}
