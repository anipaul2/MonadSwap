'use client'

import { X } from 'lucide-react';
import { useMonorailTokens } from '@/hooks/useMonorailTokens';
import { type MonorailToken } from '@/lib/monorail-service';
import { useAccount } from 'wagmi';

interface TokenSelectorProps {
  selectedToken: MonorailToken | null;
  excludeToken?: MonorailToken | null; // Token to exclude from selection (opposite side)
  onSelect: (token: MonorailToken) => void;
  onClose: () => void;
}

export function TokenSelector({ selectedToken, excludeToken, onSelect, onClose }: TokenSelectorProps) {
  const { address } = useAccount();
  const { tokens, isLoading, error } = useMonorailTokens();

  // If there's an error or no tokens, show a message
  if (error || (tokens.length === 0 && !isLoading)) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-purple-900 rounded-3xl p-6 w-full max-w-md shadow-2xl border border-white/10">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-white text-xl font-bold">Select Token</h3>
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="text-center text-white/60">
            {error ? `Error: ${error}` : 'No tokens available'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-purple-900 rounded-3xl w-full max-w-md shadow-2xl border border-white/10 max-h-[70vh] flex flex-col">
        <div className="flex items-center justify-between p-4 pb-2">
          <h3 className="text-white text-lg font-bold">Select Token</h3>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="space-y-2">
            {isLoading ? (
              <div className="text-center text-white/60 py-8">Loading tokens...</div>
            ) : (
              tokens
                .filter((token) => {
                  // Exclude the token from the opposite side to prevent same-token selection
                  if (excludeToken && token.address.toLowerCase() === excludeToken.address.toLowerCase()) {
                    return false;
                  }
                  return true;
                })
                .map((token) => {
                  // Check if this token is the excluded token for disabled state
                  const isExcluded = Boolean(excludeToken && token.address.toLowerCase() === excludeToken.address.toLowerCase());
                  
                  return (
                    <button
                      key={token.address}
                      onClick={() => !isExcluded && onSelect(token)}
                      disabled={isExcluded}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                        isExcluded
                          ? 'bg-white/5 opacity-50 cursor-not-allowed border border-white/10'
                          : token.address === selectedToken?.address
                          ? 'bg-white/20 border border-white/30'
                          : 'bg-white/5 hover:bg-white/10 border border-transparent'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs ${
                        token.symbol === 'MON' 
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500'
                          : token.symbol === 'USDC'
                          ? 'bg-gradient-to-r from-blue-500 to-cyan-500'
                          : 'bg-gradient-to-r from-green-500 to-teal-500'
                      }`}>
                        {token.symbol.slice(0, 2)}
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-white font-semibold text-sm">{token.symbol}</div>
                        <div className="text-white/60 text-xs truncate">{token.name}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-white text-sm font-medium">
                          {parseFloat(token.balance || '0').toFixed(4)}
                        </div>
                        <div className="text-white/60 text-xs">
                          ${(parseFloat(token.balance || '0') * parseFloat(token.usd_per_token || '0')).toFixed(2)}
                        </div>
                      </div>
                      {token.address === selectedToken?.address && (
                        <div className="ml-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        </div>
                      )}
                    </button>
                  );
                })
            )}
          </div>
        </div>

        <div className="p-4 pt-2">
          <div className="p-3 bg-white/5 rounded-xl border border-white/10">
            <p className="text-white/60 text-xs text-center">
              Only Monad Testnet tokens are supported
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}