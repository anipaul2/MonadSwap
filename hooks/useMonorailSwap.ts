'use client'

import { useState, useCallback } from 'react';
import { useWalletClient, useAccount } from 'wagmi';
import { monorailService, type MonorailQuote, type SwapResult, type MonorailToken } from '@/lib/monorail-service';

interface UseMonorailSwapReturn {
  getQuote: (fromToken: MonorailToken, toToken: MonorailToken, amount: string) => Promise<{
    success: boolean;
    amountOut: string;
    priceImpact: string;
    error?: string;
  }>;
  executeSwap: (fromToken: MonorailToken, toToken: MonorailToken, amount: string) => Promise<SwapResult>;
  isGettingQuote: boolean;
  isSwapping: boolean;
  isApproving: boolean;
  swapStep: 'idle' | 'approving' | 'swapping' | 'completed';
  lastQuote: MonorailQuote | null;
}

export function useMonorailSwap(): UseMonorailSwapReturn {
  const { data: walletClient } = useWalletClient();
  const { address } = useAccount();
  const [isGettingQuote, setIsGettingQuote] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [swapStep, setSwapStep] = useState<'idle' | 'approving' | 'swapping' | 'completed'>('idle');
  const [lastQuote, setLastQuote] = useState<MonorailQuote | null>(null);

  const getQuote = useCallback(async (
    fromToken: MonorailToken,
    toToken: MonorailToken,
    amount: string
  ) => {
    if (!amount || parseFloat(amount) <= 0) {
      console.log('❌ Invalid amount for quote:', { amount, parsed: parseFloat(amount) });
      return { success: false, error: 'Invalid amount', amountOut: '', priceImpact: '' };
    }
    
    console.log('📊 Getting quote with amount:', { 
      amount, 
      parsed: parseFloat(amount),
      fromToken: fromToken.symbol,
      toToken: toToken.symbol
    });

    setIsGettingQuote(true);
    try {
      console.log('🔍 Getting Monorail quote for:', {
        from: fromToken.symbol,
        to: toToken.symbol,
        amount: amount
      });

      const quote = await monorailService.getSwapQuote(
        fromToken.address,
        toToken.address,
        parseFloat(amount),
        address // Include sender for transaction data
      );

      setLastQuote(quote);

      if (quote.success) {
        return {
          success: true,
          amountOut: quote.amountOut,
          priceImpact: quote.priceImpact
        };
      } else {
        return {
          success: false,
          error: quote.error || 'Failed to get quote',
          amountOut: '',
          priceImpact: ''
        };
      }
    } catch (error) {
      console.error('❌ Error getting quote:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Quote failed',
        amountOut: '',
        priceImpact: ''
      };
    } finally {
      setIsGettingQuote(false);
    }
  }, [address]);

  const executeSwap = useCallback(async (
    fromToken: MonorailToken,
    toToken: MonorailToken,
    amount: string
  ): Promise<SwapResult> => {
    console.log('🎯 ExecuteSwap called with:', {
      fromToken: fromToken?.symbol,
      toToken: toToken?.symbol,
      amount,
      hasWalletClient: !!walletClient,
      hasQuote: !!lastQuote,
      quoteSuccess: lastQuote?.success,
      hasAddress: !!address
    });

    // Try to use wagmi wallet client first, fallback to Farcaster SDK
    let effectiveWalletClient = walletClient;
    
    if (!effectiveWalletClient && address) {
      console.log('🔧 No wagmi wallet client, trying Farcaster SDK...');
      try {
        effectiveWalletClient = monorailService.createFarcasterWalletClient(address);
        console.log('✅ Created Farcaster wallet client');
      } catch (error) {
        console.error('❌ Failed to create Farcaster wallet client:', error);
      }
    }

    if (!effectiveWalletClient) {
      console.log('❌ No wallet client available (wagmi or Farcaster)');
      return { success: false, error: 'Farcaster wallet not connected' };
    }

    if (!lastQuote || !lastQuote.success) {
      console.log('❌ No valid quote available:', { hasQuote: !!lastQuote, success: lastQuote?.success });
      return { success: false, error: 'No valid quote available. Get a quote first.' };
    }

    if (!address) {
      console.log('❌ No user address available');
      return { success: false, error: 'User address not available' };
    }

    setIsSwapping(true);
    try {
      console.log('🔄 Executing Monorail swap with Farcaster wallet');
      console.log('💰 Swap details:', {
        from: fromToken.symbol,
        to: toToken.symbol,
        amount: amount,
        fromAddress: fromToken.address,
        toAddress: toToken.address,
        isFromNative: fromToken.address === '0x0000000000000000000000000000000000000000'
      });

      // Check if this is an ERC-20 token swap (needs approval)
      const isFromTokenERC20 = fromToken.address !== '0x0000000000000000000000000000000000000000';
      
      if (isFromTokenERC20 && lastQuote.transaction) {
        console.log('🔍 ERC-20 token swap detected - checking if approval needed');
        console.log('📋 Router contract:', lastQuote.transaction.to);
        
        // For ERC-20 tokens, try approval first, then swap
        try {
          setSwapStep('approving');
          setIsApproving(true);
          console.log('🔐 Step 1: Requesting token approval first...');
          
          // First, approve the token
          const approvalResult = await monorailService.approveToken(
            effectiveWalletClient,
            fromToken.address,
            lastQuote.transaction.to,
            address
          );
          
          setIsApproving(false);
          
          if (!approvalResult.success) {
            setSwapStep('idle');
            return {
              success: false,
              error: `Failed to approve ${fromToken.symbol}: ${approvalResult.error}. Approval is required before swapping.`
            };
          }
          
          console.log('✅ Step 1 complete: Token approved, now executing swap...');
          setSwapStep('swapping');
          
          // Wait a moment for approval to propagate
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Now attempt the actual swap
          const swapResult = await monorailService.executeSwap(effectiveWalletClient, lastQuote);
          
          if (swapResult.success) {
            console.log('✅ Step 2 complete: Swap executed successfully');
            setSwapStep('completed');
            setLastQuote(null); // Clear used quote
            
            // Reset step after a delay
            setTimeout(() => setSwapStep('idle'), 3000);
            
            return {
              success: true,
              txHash: swapResult.txHash
            };
          } else {
            setSwapStep('idle');
            return {
              success: false,
              error: `Approval succeeded but swap failed: ${swapResult.error}. You may need to get a new quote or try again.`
            };
          }
          
        } catch (error) {
          console.error('❌ ERC-20 swap process error:', error);
          setIsApproving(false);
          setSwapStep('idle');
          
          const errorMessage = error instanceof Error ? error.message.toLowerCase() : '';
          if (errorMessage.includes('user rejected') || errorMessage.includes('denied')) {
            return {
              success: false,
              error: `Transaction cancelled. ${fromToken.symbol} to MON swaps require two transactions: approval then swap.`
            };
          }
          
          return {
            success: false,
            error: `Failed to complete ${fromToken.symbol} swap: ${errorMessage}`
          };
        }
      } else {
        // Native token swap - no approval needed
        console.log('🔄 Native token swap - no approval needed');
        const result = await monorailService.executeSwap(effectiveWalletClient, lastQuote);
        
        if (result.success) {
          console.log('✅ Native swap completed:', result.txHash);
          setLastQuote(null); // Clear used quote
        }
        
        return result;
      }
    } catch (error) {
      console.error('❌ Error executing swap:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Swap failed'
      };
    } finally {
      setIsSwapping(false);
    }
  }, [walletClient, lastQuote, address]);

  return {
    getQuote,
    executeSwap,
    isGettingQuote,
    isSwapping,
    isApproving,
    swapStep,
    lastQuote
  };
}