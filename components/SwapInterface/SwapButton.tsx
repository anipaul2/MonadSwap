'use client'

import { useState, useEffect } from 'react';
import { useAccount, useConnect, useWalletClient } from 'wagmi';
import { Loader2 } from 'lucide-react';
import { type MonorailToken } from '@/lib/monorail-service';
import { sdk } from '@farcaster/miniapp-sdk';

interface SwapButtonProps {
  fromToken: MonorailToken | null;
  toToken: MonorailToken | null;
  fromAmount: string;
  toAmount: string;
  isLoading: boolean;
  swapHook: {
    executeSwap: (fromToken: MonorailToken, toToken: MonorailToken, amount: string) => Promise<any>;
    isSwapping: boolean;
    isApproving: boolean;
    swapStep: 'idle' | 'approving' | 'swapping' | 'completed';
  };
  onSwapSuccess?: (txHash: string) => void;
}

export function SwapButton({ 
  fromToken, 
  toToken, 
  fromAmount, 
  toAmount, 
  isLoading,
  swapHook,
  onSwapSuccess
}: SwapButtonProps) {
  const { isConnected, address, chain } = useAccount();
  const { connect, connectors } = useConnect();

  // Debug logging for connection state
  console.log('SwapButton render:', { 
    isConnected, 
    address, 
    chain: chain?.name,
    connectorCount: connectors.length
  });
  const { data: walletClient, refetch: refetchWalletClient } = useWalletClient();
  const { executeSwap, isSwapping, isApproving, swapStep } = swapHook;
  const [isConnecting, setIsConnecting] = useState(false);
  const [walletRetryCount, setWalletRetryCount] = useState(0);

  // Auto-connect to Farcaster wallet on mount
  useEffect(() => {
    console.log('🔗 Wallet connection check:', {
      isConnected,
      hasWalletClient: !!walletClient,
      connectorsCount: connectors.length,
      isConnecting,
      connectorNames: connectors.map(c => c.name)
    });

    if (!isConnected && connectors.length > 0 && !isConnecting) {
      setIsConnecting(true);
      const farcasterConnector = connectors[0]; // Only Farcaster connector should be available
      console.log('Auto-connecting to Farcaster wallet...');
      
      const connectWallet = async () => {
        try {
          console.log('Attempting connection with connector:', farcasterConnector.name);
          connect({ connector: farcasterConnector });
          console.log('✅ Connected to Farcaster wallet');
        } catch (error: any) {
          console.error('❌ Failed to connect to Farcaster wallet:', error);
        } finally {
          setIsConnecting(false);
        }
      };
      
      connectWallet();
    }
    
    // Additional check for wallet client availability
    if (isConnected && !walletClient && walletRetryCount < 3) {
      console.log('⚠️ Connected but no wallet client available - retrying...', walletRetryCount);
      
      const retryTimer = setTimeout(() => {
        setWalletRetryCount(prev => prev + 1);
        console.log('🔄 Retrying wallet client connection...', walletRetryCount + 1);
      }, 1000);
      
      return () => clearTimeout(retryTimer);
    }
  }, [isConnected, connectors, connect, isConnecting, walletClient, walletRetryCount]);

  const handleSwap = async () => {
    console.log('🔘 Swap button clicked!', {
      isConnected,
      hasWalletClient: !!walletClient,
      fromAmount,
      toAmount,
      fromToken: fromToken?.symbol,
      toToken: toToken?.symbol
    });
    
    // Basic validation - let the hook handle wallet client fallback
    if (!isConnected || !fromAmount || !toAmount || !fromToken || !toToken) {
      console.log('❌ Missing required data for swap:', {
        isConnected,
        fromAmount,
        toAmount,
        fromToken: fromToken?.symbol,
        toToken: toToken?.symbol
      });
      return;
    }

    console.log('✅ All data available, proceeding to executeSwap hook...');

    console.log('🚀 Starting swap with Farcaster wallet');
    console.log('📝 Swap details:', {
      fromToken: fromToken.symbol,
      toToken: toToken.symbol,
      fromAmount,
      toAmount,
      isFromTokenERC20: fromToken.address !== '0x0000000000000000000000000000000000000000',
      hasWagmiWallet: !!walletClient,
      hasFarcasterSDK: !!sdk.wallet?.ethProvider,
      userAddress: address
    });

    try {
      const result = await executeSwap(fromToken, toToken, fromAmount);
      
      if (result.success) {
        console.log('✅ Swap completed successfully:', result.txHash);
        console.log('🎉 SWAP SUCCESS! Transaction:', result.txHash);
        // Notify parent component of successful swap
        onSwapSuccess?.(result.txHash || '');
      } else {
        console.error('❌ Swap failed:', result.error);
        console.error('🚫 SWAP FAILED:', result.error);
        
        // Show user-friendly error message with specific guidance
        let userMessage = result.error || 'Swap failed. Please try again.';
        
        // Special handling for ERC-20 approval issues
        if (result.error?.includes('approval') || result.error?.includes('allowance')) {
          const isERC20 = fromToken.address !== '0x0000000000000000000000000000000000000000';
          if (isERC20) {
            userMessage = `${fromToken.symbol} needs approval first. Please approve ${fromToken.symbol} spending in your Farcaster wallet, then try swapping again.`;
          }
        } else if (result.error?.includes('execution reverted')) {
          const isERC20 = fromToken.address !== '0x0000000000000000000000000000000000000000';
          if (isERC20) {
            userMessage = `Transaction failed. You may need to approve ${fromToken.symbol} spending first. Try the swap again - your wallet should prompt for approval.`;
          } else {
            userMessage = 'Transaction failed. Check your balance and try again.';
          }
        } else if (result.error?.includes('insufficient')) {
          userMessage = 'Insufficient token balance or gas.';
        } else if (result.error?.includes('slippage')) {
          userMessage = 'Price moved too much during swap. Please try again.';
        }
        
        console.log('👤 User-friendly error:', userMessage);
        
        // TODO: Show this error message to the user in the UI
        // For now it's logged to console
      }
    } catch (error) {
      console.error('❌ Swap error:', error);
      console.error('🚫 SWAP ERROR: Please try again.');
    }
  };

  // Still connecting
  if (isConnecting || (!isConnected && connectors.length > 0)) {
    return (
      <button
        disabled
        className="w-full bg-white/10 text-white/50 font-semibold py-3 px-4 rounded-xl cursor-not-allowed flex items-center justify-center gap-2"
      >
        <Loader2 className="w-4 h-4 animate-spin" />
        Connecting to Farcaster...
      </button>
    );
  }

  // No Farcaster wallet available
  if (!isConnected) {
    return (
      <button
        disabled
        className="w-full bg-white/10 text-white/50 font-semibold py-3 px-4 rounded-xl cursor-not-allowed"
      >
        Farcaster Wallet Required
      </button>
    );
  }

  // Tokens not loaded yet
  if (!fromToken || !toToken) {
    return (
      <button
        disabled
        className="w-full bg-white/10 text-white/50 font-semibold py-3 px-4 rounded-xl cursor-not-allowed flex items-center justify-center gap-2"
      >
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading tokens...
      </button>
    );
  }

  // No amount entered
  if (!fromAmount || parseFloat(fromAmount) <= 0) {
    return (
      <button
        disabled
        className="w-full bg-white/10 text-white/50 font-semibold py-3 px-4 rounded-xl cursor-not-allowed"
      >
        Enter Amount
      </button>
    );
  }

  // Connected but wallet client not ready - check if Farcaster SDK is available
  if (isConnected && !walletClient) {
    // Check if Farcaster SDK wallet is available
    const hasFarcasterWallet = sdk.wallet?.ethProvider;
    
    if (hasFarcasterWallet) {
      // Farcaster SDK is available, allow the swap to proceed
      console.log('✅ Farcaster SDK wallet available as fallback');
    } else {
      return (
        <button
          disabled
          className="w-full bg-white/10 text-white/50 font-semibold py-3 px-4 rounded-xl cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Loader2 className="w-4 h-4 animate-spin" />
          Connecting wallet...
        </button>
      );
    }
  }

  // Loading price
  if (isLoading) {
    return (
      <button
        disabled
        className="w-full bg-white/10 text-white/50 font-semibold py-3 px-4 rounded-xl cursor-not-allowed flex items-center justify-center gap-2"
      >
        <Loader2 className="w-4 h-4 animate-spin" />
        Calculating...
      </button>
    );
  }

  // Get button text based on current step
  const getButtonText = () => {
    if (swapStep === 'approving') {
      return (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Approve {fromToken.symbol} spending...
        </>
      );
    }
    
    if (swapStep === 'swapping') {
      return (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Swapping {fromToken.symbol} → {toToken.symbol}...
        </>
      );
    }
    
    if (swapStep === 'completed') {
      return '✅ Swap Complete!';
    }
    
    // Check if this will need approval
    const needsApproval = fromToken.address !== '0x0000000000000000000000000000000000000000';
    if (needsApproval) {
      return `Approve & Swap ${fromToken.symbol} → ${toToken.symbol}`;
    }
    
    return `Swap ${fromToken.symbol} → ${toToken.symbol}`;
  };

  const isProcessing = isSwapping || isApproving || swapStep !== 'idle';

  console.log('🔘 Button state:', {
    isSwapping,
    isApproving,
    swapStep,
    isProcessing,
    hasFromToken: !!fromToken,
    hasToToken: !!toToken,
    fromAmount,
    toAmount
  });

  // Ready to swap
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        console.log('🖱️ Button clicked!');
        handleSwap();
      }}
      disabled={isProcessing}
      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-purple-800 disabled:to-pink-800 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
    >
      {getButtonText()}
    </button>
  );
}