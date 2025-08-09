'use client'

import { useState, useEffect } from 'react';
import { useAccount, useWalletClient, useSwitchChain } from 'wagmi';
import { ChevronDownIcon, ArrowUpDownIcon, XIcon } from 'lucide-react';
import { useFrame } from '@/components/farcaster-provider';
import { MONAD_TESTNET_CHAIN_ID } from '@/lib/constants';
import { TokenSelector } from './TokenSelector';
import { SwapButton } from './SwapButton';
import { WalletStatus } from './WalletStatus';
import { ShareButton } from '@/components/ShareButton';
import { useMonorailBalances, useMonorailTokenBalance } from '@/hooks/useMonorailBalances';
import { useMonorailSwap } from '@/hooks/useMonorailSwap';
import { useMonorailTokens } from '@/hooks/useMonorailTokens';
import type { MonorailToken } from '@/lib/monorail-service';

export function SwapForm() {
  const { address, isConnected, chain } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { switchChain } = useSwitchChain();
  const { actions, context, isSDKLoaded } = useFrame();
  
  // Debug actions availability
  useEffect(() => {
    console.log('🔧 SwapForm SDK Debug:', {
      hasActions: !!actions,
      isSDKLoaded,
      hasContext: !!context,
      actionsKeys: actions ? Object.keys(actions) : 'no actions',
      composeCastAvailable: actions?.composeCast ? 'yes' : 'no'
    });
  }, [actions, context, isSDKLoaded]);

  const [fromToken, setFromToken] = useState<MonorailToken | null>(null);
  const [toToken, setToToken] = useState<MonorailToken | null>(null);
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [showFromSelector, setShowFromSelector] = useState(false);
  const [showToSelector, setShowToSelector] = useState(false);
  const [priceImpact, setPriceImpact] = useState<string>('');
  const [showGasWarning, setShowGasWarning] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successTxHash, setSuccessTxHash] = useState('');

  // Monorail tokens and balances
  const { tokens } = useMonorailTokens();
  const { balance: fromBalance, isLoading: fromBalanceLoading } = useMonorailTokenBalance(fromToken?.address || '');
  const { refreshBalances } = useMonorailBalances();

  // Monorail swap hooks
  const { getQuote, executeSwap, isGettingQuote, isSwapping, isApproving, swapStep } = useMonorailSwap();

  // Switch to Monad testnet if needed
  useEffect(() => {
    if (isConnected && chain?.id !== MONAD_TESTNET_CHAIN_ID) {
      switchChain({ chainId: MONAD_TESTNET_CHAIN_ID });
    }
  }, [isConnected, chain, switchChain]);

  // Set default tokens when Monorail tokens load
  useEffect(() => {
    if (tokens.length > 0 && (!fromToken || !toToken)) {
      console.log('🔄 Setting default tokens from Monorail:', tokens.length);
      
      // Find MON token (native token)
      const monToken = tokens.find(t => 
        t.symbol === 'MON' || 
        t.address === '0x0000000000000000000000000000000000000000'
      );
      
      // Find USDC token
      const usdcToken = tokens.find(t => t.symbol === 'USDC');
      
      // Set defaults: MON -> USDC, or first two available tokens
      setFromToken(monToken || tokens[0] || null);
      setToToken(usdcToken || tokens[1] || null);
      
      console.log('✅ Set default tokens:', {
        from: monToken?.symbol || tokens[0]?.symbol,
        to: usdcToken?.symbol || tokens[1]?.symbol
      });
    }
  }, [tokens, fromToken, toToken]);

  // Recalculate quote when tokens change  
  useEffect(() => {
    if (fromAmount && parseFloat(fromAmount) > 0 && fromToken && toToken) {
      console.log('🔄 Token changed, recalculating quote...');
      handleFromAmountChange(fromAmount);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromToken?.address, toToken?.address]);

  const handleSwapTokens = () => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
    setFromAmount(toAmount);
    setToAmount(fromAmount);
  };

  const handleMaxBalance = () => {
    if (fromBalanceLoading || !fromBalance || !fromToken) return;
    
    const isNativeMON = fromToken.address === "0x0000000000000000000000000000000000000000";
    let maxAmount = fromBalance;
    
    if (isNativeMON) {
      // For native MON, reserve some for gas (0.1 MON)
      const gasReserve = 0.1;
      const availableBalance = parseFloat(fromBalance) - gasReserve;
      maxAmount = Math.max(0, availableBalance).toString();
      
      // Show gas warning
      setShowGasWarning(true);
      setTimeout(() => setShowGasWarning(false), 4000); // Hide after 4 seconds
    }
    
    handleFromAmountChange(maxAmount);
  };

  const handleFromAmountChange = async (value: string) => {
    console.log('💰 Amount changed:', value);
    console.log('🔄 Current tokens:', { 
      from: fromToken ? { symbol: fromToken.symbol, address: fromToken.address } : null, 
      to: toToken ? { symbol: toToken.symbol, address: toToken.address } : null
    });
    
    setFromAmount(value);
    
    if (value && parseFloat(value) > 0 && fromToken && toToken) {
      console.log('🔍 Getting quote for:', { 
        fromToken: fromToken.symbol, 
        toToken: toToken.symbol, 
        amount: value,
        fromAddress: fromToken.address,
        toAddress: toToken.address
      });
      
      try {
        const quote = await getQuote(fromToken, toToken, value);
        console.log('📊 Quote result:', quote);
        
        if (quote.success) {
          setToAmount(parseFloat(quote.amountOut).toFixed(6));
          setPriceImpact(quote.priceImpact);
          console.log('✅ Quote successful:', { amountOut: quote.amountOut, priceImpact: quote.priceImpact });
        } else {
          setToAmount('');
          setPriceImpact('');
          console.error('❌ Quote error:', quote.error);
          
          // Show user-friendly error message
          if (quote.error?.includes('No pools available')) {
            console.warn('⚠️ No liquidity pools found for this token pair. Try a different pair or check if markets exist.');
          }
        }
      } catch (error) {
        console.error('❌ Price calculation error:', error);
        setToAmount('');
        setPriceImpact('');
      }
    } else {
      setToAmount('');
      setPriceImpact('');
    }
  };

  const handleSwapSuccess = (txHash: string) => {
    console.log('🎉 Swap successful, showing success message and resetting amounts');
    setSuccessTxHash(txHash);
    setShowSuccessMessage(true);
    
    // Reset amounts
    setFromAmount('');
    setToAmount('');
    setPriceImpact('');
    
    // Refresh all balances immediately after successful swap
    console.log('🔄 Refreshing Monorail balances after successful swap...');
    refreshBalances();
    
    // Add a small delay and refresh again to catch any blockchain delays
    setTimeout(() => {
      refreshBalances();
      console.log('🔄 Second balance refresh after swap');
    }, 3000);
    
    // Auto-hide success message after 20 seconds (longer for users to see the link)
    setTimeout(() => {
      setShowSuccessMessage(false);
      setSuccessTxHash('');
    }, 20000);
  };

  const handleCloseSuccess = () => {
    setShowSuccessMessage(false);
    setSuccessTxHash('');
  };

  // Create share cast content for successful swaps
  const createShareCast = (): { text: string; embeds: [string] } | null => {
    if (!fromToken || !toToken || !fromAmount) return null;

    const appUrl = 'https://monadswap-psi.vercel.app';
    const shareText = `🔥 Just swapped ${fromAmount} ${fromToken.symbol} → ${toToken.symbol} using MonadSwap!

"Smooth DeFi trading on Monad Testnet with social price alerts and trending tokens from my network."

Swap tokens now: ${appUrl}`;

    return {
      text: shareText,
      embeds: [appUrl]
    };
  };

  return (
    <div className="space-y-4">
      {/* Wallet Status */}
      <WalletStatus />
      
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 shadow-xl">
        {/* From Token Input */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-white/80 text-xs font-medium">From</span>
          {isConnected && (
            <button
              onClick={() => handleMaxBalance()}
              className="text-white/60 hover:text-white text-xs transition-colors cursor-pointer"
            >
              Balance: {fromBalanceLoading ? '••••' : fromBalance || '0.0000'} {fromToken?.symbol || 'MON'}
            </button>
          )}
        </div>
        
        {/* Gas Warning for MON */}
        {showGasWarning && (
          <div className="mb-3 p-3 bg-yellow-500/20 border border-yellow-500/40 rounded-lg">
            <p className="text-yellow-300 text-sm font-medium">
              🚨 Gmonad! You are using all your MON, keep some for gas!
            </p>
          </div>
        )}
        
        <div className="bg-white/5 rounded-xl p-3 border border-white/10">
          <div className="flex items-center justify-between">
            <input
              type="number"
              placeholder="0.0"
              value={fromAmount}
              onChange={(e) => handleFromAmountChange(e.target.value)}
              className="bg-transparent text-white text-lg font-semibold placeholder-white/40 outline-none flex-1 mr-2"
            />
            
            <button
              onClick={() => setShowFromSelector(true)}
              className="flex items-center gap-1 bg-white/10 hover:bg-white/20 rounded-lg px-1.5 py-0.5 transition-all"
            >
              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"></div>
              <span className="text-white font-medium text-sm">{fromToken?.symbol || '...'}</span>
              <ChevronDownIcon className="w-3 h-3 text-white/60" />
            </button>
          </div>
        </div>
      </div>

      {/* Swap Button */}
      <div className="flex justify-center my-2">
        <button
          onClick={handleSwapTokens}
          className="bg-white/10 hover:bg-white/20 rounded-full p-1.5 transition-all"
        >
          <ArrowUpDownIcon className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* To Token Input */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <span className="text-white/80 text-xs font-medium">To</span>
          {priceImpact && (
            <span className="text-green-400 text-xs">
              Impact: {priceImpact}
            </span>
          )}
        </div>
        
        <div className="bg-white/5 rounded-xl p-3 border border-white/10">
          <div className="flex items-center justify-between">
            <input
              type="number"
              placeholder="0.0"
              value={toAmount}
              readOnly
              className="bg-transparent text-white text-lg font-semibold placeholder-white/40 outline-none flex-1 mr-2"
            />
            
            <button
              onClick={() => setShowToSelector(true)}
              className="flex items-center gap-1 bg-white/10 hover:bg-white/20 rounded-lg px-1.5 py-0.5 transition-all"
            >
              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500"></div>
              <span className="text-white font-medium text-sm">{toToken?.symbol || '...'}</span>
              <ChevronDownIcon className="w-3 h-3 text-white/60" />
            </button>
          </div>
        </div>
      </div>

      {/* Info message for ERC-20 swaps */}
      {fromToken && fromToken.address !== '0x0000000000000000000000000000000000000000' && (
        <div className="mb-3 p-3 bg-blue-500/20 border border-blue-500/40 rounded-lg">
          <p className="text-blue-300 text-sm">
            💡 {fromToken.symbol} swaps require two steps: approval then swap
          </p>
        </div>
      )}

      {/* Swap Button */}
      <SwapButton
        fromToken={fromToken}
        toToken={toToken}
        fromAmount={fromAmount}
        toAmount={toAmount}
        isLoading={isGettingQuote}
        swapHook={{ executeSwap, isSwapping, isApproving, swapStep }}
        onSwapSuccess={handleSwapSuccess}
      />

      {/* Success Message - Enhanced with Sharing */}
      {showSuccessMessage && (
        <div className="relative p-4 bg-gradient-to-r from-green-500/20 to-blue-500/20 border border-green-500/40 rounded-2xl mx-4 mt-2 shadow-lg">
          {/* Close Button */}
          <button
            onClick={handleCloseSuccess}
            className="absolute top-2 right-2 text-white/60 hover:text-white transition-colors"
          >
            <XIcon className="w-4 h-4" />
          </button>
          
          <div className="pr-8">
            <p className="text-white font-semibold mb-2 flex items-center gap-2">
              🎉 Swap Successful!
            </p>
            
            <p className="text-white/80 text-sm mb-3">
              Swapped {fromAmount} {fromToken?.symbol} → {toToken?.symbol}
            </p>
            
            <div className="flex items-center gap-2 flex-wrap">
              {successTxHash && (
                <a 
                  href={`https://testnet.monadexplorer.com/tx/${successTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 bg-white/10 hover:bg-white/20 text-white/90 hover:text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  title={successTxHash}
                >
                  View Transaction ↗
                </a>
              )}
              
              {createShareCast() && (
                <ShareButton
                  cast={createShareCast()!}
                  buttonText="Share on Farcaster"
                  showIcon={true}
                />
              )}
            </div>
            
            <p className="text-white/50 text-xs mt-2">
              💡 Share your swap to help others discover MonadSwap!
            </p>
          </div>
        </div>
      )}

      {/* Token Selectors */}
      {showFromSelector && (
        <TokenSelector
          selectedToken={fromToken}
          excludeToken={toToken} // Prevent selecting the same token as "to"
          onSelect={(token) => {
            setFromToken(token);
            setShowFromSelector(false);
          }}
          onClose={() => setShowFromSelector(false)}
        />
      )}
      
      {showToSelector && (
        <TokenSelector
          selectedToken={toToken}
          excludeToken={fromToken} // Prevent selecting the same token as "from"
          onSelect={(token) => {
            setToToken(token);
            setShowToSelector(false);
          }}
          onClose={() => setShowToSelector(false)}
        />
      )}
      </div>
    </div>
  );
}