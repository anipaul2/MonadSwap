'use client'

import { useState, useEffect } from 'react';
import { useFrame } from '@/components/farcaster-provider';
import { SwapForm } from './SwapForm';
import { SwapHeader } from './SwapHeader';
import { PriceNotifications } from './PriceNotifications';
import { TrendingTokens } from './TrendingTokens';
import { sdk } from '@farcaster/miniapp-sdk';

export function SwapInterface() {
  const { context, isSDKLoaded } = useFrame();
  const [activeTab, setActiveTab] = useState<'swap' | 'notifications' | 'trending'>('swap');
  const [showAddFramePrompt, setShowAddFramePrompt] = useState(false);
  
  // Listen for successful frame addition (complementary to webhook)
  useEffect(() => {
    const handleFrameAdded = () => {
      if (context?.user?.fid) {
        console.log('🎉 Frame added successfully for user:', context.user.fid);
        localStorage.setItem(`frame_added_${context.user.fid}`, 'true');
        localStorage.setItem(`addframe_prompted_${context.user.fid}`, 'completed');
      }
    };

    // Listen for frame events if available
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('farcaster-frame-added', handleFrameAdded);
      return () => window.removeEventListener('farcaster-frame-added', handleFrameAdded);
    }
  }, [context?.user?.fid]);

  // Check if user has already been prompted about adding the frame
  useEffect(() => {
    if (context?.user?.fid && isSDKLoaded) {
      // Check if user has been prompted before (separate from actually adding frame)
      const hasBeenPrompted = localStorage.getItem(`addframe_prompted_${context.user.fid}`);
      const hasAddedFrame = localStorage.getItem(`frame_added_${context.user.fid}`);
      
      console.log('🔔 AddFrame check:', { 
        fid: context.user.fid, 
        hasBeenPrompted: !!hasBeenPrompted,
        hasAddedFrame: !!hasAddedFrame 
      });
      
      // Only show prompt if user hasn't been prompted AND hasn't added frame
      if (!hasBeenPrompted && !hasAddedFrame) {
        // Show prompt after a short delay for better UX
        setTimeout(() => {
          setShowAddFramePrompt(true);
        }, 2000);
      }
    }
  }, [context?.user?.fid, isSDKLoaded]);

  // Handle addFrame action - this triggers the native addFrame flow
  const handleAddFrame = async () => {
    try {
      console.log('🔔 Initiating addFrame flow for user:', context?.user?.fid);
      
      // The SDK addFrame() will trigger the native flow
      // When completed, our webhook will receive the frame_added event
      await sdk.actions.addFrame();
      
      // Mark as prompted (user took action)
      if (context?.user?.fid) {
        localStorage.setItem(`addframe_prompted_${context.user.fid}`, 'true');
        console.log('✅ AddFrame flow initiated, marked as prompted');
      }
      
      setShowAddFramePrompt(false);
      
    } catch (error) {
      console.error('❌ Error showing addFrame prompt:', error);
      // Still hide the prompt to avoid infinite loops
      if (context?.user?.fid) {
        localStorage.setItem(`addframe_prompted_${context.user.fid}`, 'true');
      }
      setShowAddFramePrompt(false);
    }
  };

  const dismissAddFramePrompt = () => {
    console.log('⏭️ User dismissed addFrame prompt');
    if (context?.user?.fid) {
      localStorage.setItem(`addframe_prompted_${context.user.fid}`, 'dismissed');
    }
    setShowAddFramePrompt(false);
  };

  if (!isSDKLoaded) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <h1 className="text-xl font-bold text-center text-white">
          SDK not loaded. Please use this app in Farcaster.
        </h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-indigo-950 relative overflow-hidden">
      {/* Monad Logo Watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <img 
          src="https://01node.com/wp-content/uploads/2025/02/monad.jpg"
          alt="Monad"
          className="w-80 h-80 object-contain opacity-5 scale-150"
          style={{
            filter: 'blur(0.5px) grayscale(20%)',
          }}
        />
      </div>
      
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-radial-gradient opacity-30" 
           style={{
             background: 'radial-gradient(circle at 50% 50%, rgba(120,53,215,0.3), transparent 50%)'
           }} />
      <div className="absolute inset-0 opacity-20" 
           style={{
             backgroundImage: 'radial-gradient(circle at 20px 20px, rgba(255,255,255,0.1) 1px, transparent 1px)',
             backgroundSize: '40px 40px'
           }} />
      
      <div className="relative z-10 w-full max-w-sm mx-auto p-4 flex flex-col min-h-screen">
        <SwapHeader />
        
        {/* Modern Segmented Control */}
        <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-1.5 mb-6 shadow-2xl">
          <div className="flex relative">
            {/* Active indicator */}
            <div 
              className={`absolute top-1 bottom-1 bg-gradient-to-r from-purple-400 to-indigo-400 rounded-xl transition-all duration-300 ease-out shadow-lg ${
                activeTab === 'swap' ? 'left-1 w-[calc(33.333%-2px)]' :
                activeTab === 'notifications' ? 'left-[calc(33.333%+1px)] w-[calc(33.333%-2px)]' :
                'left-[calc(66.666%+1px)] w-[calc(33.333%-2px)]'
              }`}
            />
            
            <button
              onClick={() => setActiveTab('swap')}
              className={`flex-1 py-3 px-2 rounded-xl text-sm font-semibold transition-all duration-300 relative z-10 ${
                activeTab === 'swap' 
                  ? 'text-white shadow-sm' 
                  : 'text-white/60 hover:text-white/80'
              }`}
            >
              Swap
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`flex-1 py-3 px-2 rounded-xl text-sm font-semibold transition-all duration-300 relative z-10 ${
                activeTab === 'notifications' 
                  ? 'text-white shadow-sm' 
                  : 'text-white/60 hover:text-white/80'
              }`}
            >
              Alerts
            </button>
            <button
              onClick={() => setActiveTab('trending')}
              className={`flex-1 py-3 px-2 rounded-xl text-sm font-semibold transition-all duration-300 relative z-10 ${
                activeTab === 'trending' 
                  ? 'text-white shadow-sm' 
                  : 'text-white/60 hover:text-white/80'
              }`}
            >
              Trending
            </button>
          </div>
        </div>

        {/* Tab Content - Flexible height with smooth transitions */}
        <div className="w-full flex-1 overflow-y-auto">
          <div className={activeTab === 'swap' ? 'block' : 'hidden'}>
            <SwapForm />
          </div>
          <div className={activeTab === 'notifications' ? 'block' : 'hidden'}>
            <PriceNotifications />
          </div>
          <div className={activeTab === 'trending' ? 'block' : 'hidden'}>
            <TrendingTokens />
          </div>
        </div>
      </div>

      {/* AddFrame Prompt Modal */}
      {showAddFramePrompt && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 max-w-sm w-full shadow-2xl">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-400 to-indigo-400 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4.343 12.344l1.414 1.414L8 11.414l2.243 2.243 1.414-1.414L9.414 10l2.243-2.243L10.243 6.343 8 8.586 5.757 6.343 4.343 7.757 6.586 10l-2.243 2.344z" />
                </svg>
              </div>
              
              <h3 className="text-white text-xl font-bold mb-2">🚀 Stay Ahead of Markets!</h3>
              <p className="text-white/90 text-sm mb-4 leading-relaxed font-medium">
                Add MonadSwap to get instant notifications for:
              </p>
              
              {/* Benefits List */}
              <div className="text-left mb-6 space-y-2">
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 bg-green-400 rounded-full flex-shrink-0"></div>
                  <span className="text-white/80">📈 Price alerts when your tokens hit targets</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 bg-blue-400 rounded-full flex-shrink-0"></div>
                  <span className="text-white/80">🔥 Trending tokens in your network</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 bg-purple-400 rounded-full flex-shrink-0"></div>
                  <span className="text-white/80">⚡ Market opportunities from friends</span>
                </div>
              </div>

              <div className="text-xs text-white/50 mb-6 bg-white/5 rounded-lg p-3">
                💡 Adding the frame enables push notifications to your Farcaster feed
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={handleAddFrame}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-semibold py-3 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-purple-500/25 active:scale-95"
                >
                  🔔 Add & Enable Alerts
                </button>
                <button
                  onClick={dismissAddFramePrompt}
                  className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white/60 hover:text-white font-semibold py-3 rounded-2xl transition-all duration-300 text-sm"
                >
                  Skip
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}