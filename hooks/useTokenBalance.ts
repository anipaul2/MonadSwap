'use client'

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { monadBalanceService } from '@/lib/monad-balance-service';
import { TOKENS } from '@/lib/constants';

export function useTokenBalance(tokenAddress: string, symbol: string) {
  const { address, isConnected } = useAccount();
  const [balance, setBalance] = useState<string>('0.00');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (!isConnected || !address) {
      setBalance('0.00');
      return;
    }

    const fetchBalance = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        console.log(`🔍 Fetching ${symbol} balance for address: ${address}`);
        console.log(`Token address: ${tokenAddress}`);
        
        let tokenBalance: string;
        
        // Handle MON (native token) vs ERC20 tokens
        if (tokenAddress === '0x0000000000000000000000000000000000000000' || symbol === 'MON') {
          tokenBalance = await monadBalanceService.getMonBalance(address);
        } else {
          // Find token info from constants
          const tokenInfo = Object.values(TOKENS).find(token => 
            token.address.toLowerCase() === tokenAddress.toLowerCase()
          );
          const decimals = tokenInfo?.decimals || 18;
          
          tokenBalance = await monadBalanceService.getTokenBalance(tokenAddress, address, decimals);
        }
        
        console.log(`✅ ${symbol} balance retrieved: ${tokenBalance}`);
        setBalance(parseFloat(tokenBalance).toFixed(6));
      } catch (err) {
        console.error(`❌ Error fetching ${symbol} balance:`, err);
        setError(err instanceof Error ? err.message : 'Failed to fetch balance');
        setBalance('0.00');
      } finally {
        setIsLoading(false);
      }
    };

    // Verify network connection first
    monadBalanceService.verifyNetwork().then(isValid => {
      if (isValid) {
        fetchBalance();
      } else {
        console.error('❌ Not connected to Monad testnet');
        setError('Not connected to Monad testnet');
      }
    });

    // Refresh balance every 10 seconds (faster updates)
    const interval = setInterval(fetchBalance, 10000);
    return () => clearInterval(interval);
  }, [tokenAddress, symbol, address, isConnected, refreshTrigger]);

  // Manual refresh function
  const refreshBalance = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return { balance, isLoading, error, refreshBalance };
}