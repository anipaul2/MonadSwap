'use client'

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { monorailService, type MonorailToken } from '@/lib/monorail-service';

interface UseMonorailBalancesReturn {
  balances: MonorailToken[];
  isLoading: boolean;
  error: string | null;
  portfolioValue: string | null;
  refreshBalances: () => void;
}

export function useMonorailBalances(): UseMonorailBalancesReturn {
  const { address, isConnected } = useAccount();
  const [balances, setBalances] = useState<MonorailToken[]>([]);
  const [portfolioValue, setPortfolioValue] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (!isConnected || !address) {
      setBalances([]);
      setPortfolioValue(null);
      return;
    }

    const fetchBalances = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        console.log('💰 Fetching Monorail balances for:', address);
        
        // Fetch both balances and portfolio value in parallel
        const [balancesData, portfolioData] = await Promise.all([
          monorailService.getWalletBalances(address),
          monorailService.getPortfolioValue(address)
        ]);
        
        console.log('✅ Monorail data retrieved:', {
          tokens: balancesData.length,
          portfolioValue: portfolioData
        });
        
        setBalances(balancesData);
        setPortfolioValue(portfolioData);
      } catch (err) {
        console.error('❌ Error fetching Monorail balances:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch balances');
        setBalances([]);
        setPortfolioValue(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBalances();

    // Refresh every 15 seconds (faster than before since Monorail is more reliable)
    const interval = setInterval(fetchBalances, 15000);
    return () => clearInterval(interval);
  }, [address, isConnected, refreshTrigger]);

  const refreshBalances = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return {
    balances,
    isLoading,
    error,
    portfolioValue,
    refreshBalances
  };
}

// Hook for getting specific token balance
export function useMonorailTokenBalance(tokenAddress: string) {
  const { balances } = useMonorailBalances();
  
  const tokenBalance = balances.find(token => 
    token.address.toLowerCase() === tokenAddress.toLowerCase()
  );
  
  return {
    balance: tokenBalance?.balance || '0',
    monValue: tokenBalance?.mon_value || '0',
    usdValue: tokenBalance ? 
      (parseFloat(tokenBalance.balance || '0') * parseFloat(tokenBalance.usd_per_token || '0')).toString() : 
      '0',
    isLoading: false
  };
}