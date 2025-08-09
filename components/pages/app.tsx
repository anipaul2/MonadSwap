'use client'

import { useEffect, useState } from 'react'
import { SwapInterface } from '@/components/SwapInterface'
import { useFrame } from '@/components/farcaster-provider'
import { SafeAreaContainer } from '@/components/safe-area-container'
import { sdk } from '@farcaster/miniapp-sdk'

export default function Home() {
  const { context, isLoading, isSDKLoaded } = useFrame()
  const [readyCalled, setReadyCalled] = useState(false)

  // Call ready when SDK is loaded
  useEffect(() => {
    if (!isSDKLoaded) return;
    
    const callReady = async () => {
      try {
        console.log('🚀 App: Calling sdk.actions.ready()...');
        await sdk.actions.ready();
        console.log('✅ App: sdk.actions.ready() called successfully');
        setReadyCalled(true);
      } catch (error) {
        console.error('❌ App: Error calling sdk.actions.ready():', error);
        // Try again after a delay
        setTimeout(callReady, 1000);
      }
    };

    callReady();
  }, [isSDKLoaded])

  if (isLoading || !readyCalled) {
    return (
      <SafeAreaContainer insets={context?.client.safeAreaInsets}>
        <div className="flex min-h-screen flex-col items-center justify-center p-4 space-y-8 bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <h1 className="text-2xl font-bold text-white">Loading MonadSwap...</h1>
            <p className="text-purple-200 mt-2">
              {!readyCalled ? 'Initializing Farcaster SDK...' : 'Connecting to Monad Testnet'}
            </p>
          </div>
        </div>
      </SafeAreaContainer>
    )
  }

  if (!isSDKLoaded) {
    return (
      <SafeAreaContainer insets={context?.client.safeAreaInsets}>
        <div className="flex min-h-screen flex-col items-center justify-center p-4 space-y-8 bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4">
              MonadSwap
            </h1>
            <p className="text-purple-200 text-center max-w-sm">
              This app needs to be opened in a Farcaster client to access wallet and social features.
            </p>
          </div>
        </div>
      </SafeAreaContainer>
    )
  }

  return (
    <SafeAreaContainer insets={context?.client.safeAreaInsets}>
      <SwapInterface />
    </SafeAreaContainer>
  )
}
