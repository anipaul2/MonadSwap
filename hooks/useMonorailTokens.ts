'use client'

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { monorailService, type MonorailToken } from '@/lib/monorail-service';

interface UseMonorailTokensReturn {
  tokens: MonorailToken[];
  isLoading: boolean;
  error: string | null;
  refreshTokens: () => void;
}

export function useMonorailTokens(): UseMonorailTokensReturn {
  const { address, isConnected } = useAccount();
  const [tokens, setTokens] = useState<MonorailToken[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (!isConnected || !address) {
      setTokens([]);
      return;
    }

    const fetchTokens = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        console.log('🔍 Fetching Monorail tokens for swap interface...');
        
        // Get both verified tokens AND wallet tokens for better selection
        const [verifiedTokens, walletTokens] = await Promise.all([
          monorailService.getTokensByCategory('verified'),
          monorailService.getWalletBalances(address)
        ]);
        
        // Create a map of user balances for quick lookup
        const balanceMap = new Map(
          walletTokens.map(token => [token.address.toLowerCase(), token.balance])
        );
        
        // Combine verified tokens with user balances
        const tokensWithBalances = verifiedTokens.map(token => ({
          ...token,
          balance: balanceMap.get(token.address.toLowerCase()) || '0'
        }));
        
        // Filter tokens with good price confidence and liquidity
        const filteredTokens = tokensWithBalances.filter(token => {
          const priceConf = parseFloat(token.pconf);
          const hasPrice = parseFloat(token.usd_per_token) > 0;
          return priceConf >= 50 && hasPrice; // 50%+ price confidence
        });

        // Sort by: 1) User balance (tokens they own first), 2) Price confidence, 3) USD value
        filteredTokens.sort((a, b) => {
          const aBalance = parseFloat(a.balance || '0');
          const bBalance = parseFloat(b.balance || '0');
          const aHasBalance = aBalance > 0;
          const bHasBalance = bBalance > 0;
          
          // First sort: tokens with balance come first
          if (aHasBalance && !bHasBalance) return -1;
          if (!aHasBalance && bHasBalance) return 1;
          
          // If both have balance or both don't, sort by USD value
          if (aHasBalance && bHasBalance) {
            const aValue = aBalance * parseFloat(a.usd_per_token);
            const bValue = bBalance * parseFloat(b.usd_per_token);
            return bValue - aValue; // Highest value first
          }
          
          // If neither has balance, sort by price confidence then market cap proxy
          const aPconf = parseFloat(a.pconf);
          const bPconf = parseFloat(b.pconf);
          if (aPconf !== bPconf) return bPconf - aPconf;
          
          return parseFloat(b.usd_per_token) - parseFloat(a.usd_per_token);
        });
        
        console.log('✅ Fetched tokens for swapping:', filteredTokens.length, '(verified with balances)');
        setTokens(filteredTokens);
      } catch (err) {
        console.error('❌ Error fetching Monorail tokens:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch tokens');
        
        // Fallback to empty array if API fails
        setTokens([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTokens();

    // Refresh every 60 seconds for balance updates (less frequent)
    const interval = setInterval(fetchTokens, 60000);
    return () => clearInterval(interval);
  }, [address, isConnected, refreshTrigger]);

  const refreshTokens = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return {
    tokens,
    isLoading,
    error,
    refreshTokens
  };
}

// Hook for getting a specific token by address
export function useMonorailToken(tokenAddress: string) {
  const { tokens } = useMonorailTokens();
  
  const token = tokens.find(t => 
    t.address.toLowerCase() === tokenAddress.toLowerCase()
  );
  
  return {
    token,
    isLoading: false // Already loaded by parent hook
  };
}