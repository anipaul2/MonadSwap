'use client'

import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, Users, Bell, BellOff, Loader2, Zap, Copy, Check } from 'lucide-react';
import { useFrame } from '@/components/farcaster-provider';

interface TrendingToken {
  symbol: string;
  contractAddress?: string;
  trendingScore: number;
  mentionCount: number;
  engagementScore: number;
  socialProof: {
    mentionedBy: string[];
    totalEngagement: number;
  };
  priceData?: {
    current: number;
    change24h: number;
    confidence: number;
  };
}

export function TrendingTokens() {
  const { context } = useFrame();
  const [tokens, setTokens] = useState<TrendingToken[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const loadTrendingTokens = useCallback(async () => {
    if (!context?.user?.fid) return;

    setIsLoading(true);
    try {
      console.log('🔍 Loading trending tokens for user:', context.user.fid);
      const response = await fetch(`/api/trending?userId=${context.user.fid}`);
      const data = await response.json();

      if (data.success) {
        setTokens(data.tokens);
        setLastRefresh(new Date());
        console.log('✅ Loaded trending tokens:', data.tokens.length);
        if (data.debug) {
          console.log('🐛 Debug info:', data.debug);
        }
      } else {
        console.error('❌ Failed to load trending tokens:', data.error);
      }
    } catch (error) {
      console.error('❌ Error loading trending tokens:', error);
    } finally {
      setIsLoading(false);
    }
  }, [context?.user?.fid]);

  const toggleNotifications = async () => {
    if (!context?.user?.fid) return;

    try {
      const newEnabled = !notificationsEnabled;
      const response = await fetch('/api/trending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: context.user.fid,
          enabled: newEnabled
        })
      });

      const data = await response.json();
      if (data.success) {
        setNotificationsEnabled(newEnabled);
        console.log(`✅ Notifications ${newEnabled ? 'enabled' : 'disabled'}`);
      }
    } catch (error) {
      console.error('❌ Error toggling notifications:', error);
    }
  };

  // Auto-load trending tokens when component mounts
  useEffect(() => {
    if (context?.user?.fid) {
      loadTrendingTokens();
    }
  }, [context?.user?.fid, loadTrendingTokens]);

  const formatTimeAgo = (date: Date) => {
    const minutes = Math.floor((Date.now() - date.getTime()) / (1000 * 60));
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const getTrendingIcon = (score: number) => {
    if (score > 50) return <Zap className="w-4 h-4 text-yellow-400" />;
    if (score > 25) return <TrendingUp className="w-4 h-4 text-green-400" />;
    return <TrendingUp className="w-4 h-4 text-blue-400" />;
  };

  const getTrendingColor = (score: number) => {
    if (score > 50) return 'from-yellow-500/20 to-orange-500/20 border-yellow-500/30';
    if (score > 25) return 'from-green-500/20 to-emerald-500/20 border-green-500/30';
    return 'from-blue-500/20 to-indigo-500/20 border-blue-500/30';
  };

  const copyToClipboard = async (address: string, identifier: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(identifier);
      setTimeout(() => setCopiedAddress(null), 2000); // Reset after 2 seconds
    } catch (error) {
      console.error('Failed to copy address:', error);
    }
  };

  const shouldShowCopyButton = (token: TrendingToken) => {
    // Only show copy button for contract addresses (0X format symbols)
    return token.symbol.startsWith('0X') && token.symbol.length > 10;
  };

  const getAddressToCopy = (token: TrendingToken) => {
    // Use contractAddress if available, otherwise use symbol
    return token.contractAddress || token.symbol;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Trending in Your Network</h2>
          <p className="text-white/60 text-sm">
            Tokens trending among people you follow
            {lastRefresh && <span className="ml-2">• {formatTimeAgo(lastRefresh)}</span>}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={toggleNotifications}
            className={`p-3 rounded-2xl transition-all duration-300 ${
              notificationsEnabled 
                ? 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30' 
                : 'bg-white/5 text-white/40 hover:bg-white/10'
            }`}
            title={`${notificationsEnabled ? 'Disable' : 'Enable'} trending notifications`}
          >
            {notificationsEnabled ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
          </button>
          
          <button
            onClick={loadTrendingTokens}
            disabled={isLoading}
            className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white rounded-2xl p-3 transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-purple-500/25 active:scale-95 disabled:opacity-50"
          >
            <TrendingUp className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-5 shadow-xl animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-white/20 to-white/10"></div>
                  <div>
                    <div className="w-32 h-5 bg-white/20 rounded-full mb-3"></div>
                    <div className="w-40 h-3 bg-white/15 rounded-full"></div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-6 bg-white/20 rounded-full"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : tokens.length === 0 ? (
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 text-center shadow-xl">
          <div className="relative mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-500/20 to-indigo-500/20 rounded-3xl mx-auto flex items-center justify-center">
              <TrendingUp className="w-10 h-10 text-white/60" />
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-purple-400 to-indigo-400 rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full"></div>
            </div>
          </div>
          <h3 className="text-white text-lg font-semibold mb-2">No trending tokens yet</h3>
          <p className="text-white/50 text-sm leading-relaxed max-w-xs mx-auto">
            Follow more people or wait for token discussions to appear in your network
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tokens.map((token, index) => (
            <div
              key={`${token.symbol}-${token.contractAddress || index}`}
              className={`group bg-gradient-to-r ${getTrendingColor(token.trendingScore)} backdrop-blur-xl border rounded-2xl p-3 shadow-xl hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-300 hover:border-white/20`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="relative flex-shrink-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${
                      token.symbol === 'MON' 
                        ? 'bg-gradient-to-br from-purple-500 to-pink-500'
                        : token.symbol === 'USDC'
                        ? 'bg-gradient-to-br from-blue-500 to-cyan-500'
                        : token.symbol === 'WETH'
                        ? 'bg-gradient-to-br from-gray-600 to-gray-800'
                        : 'bg-gradient-to-br from-green-500 to-teal-500'
                    }`}>
                      <span className="text-white font-bold text-xs">{token.symbol.slice(0, 3)}</span>
                    </div>
                    <div className="absolute -top-0.5 -right-0.5 flex items-center justify-center">
                      {getTrendingIcon(token.trendingScore)}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="text-white font-semibold text-base truncate" title={token.symbol}>
                          {token.symbol}
                        </p>
                        {shouldShowCopyButton(token) && (
                          <button
                            onClick={() => copyToClipboard(getAddressToCopy(token), token.symbol)}
                            className="flex-shrink-0 p-1 rounded-lg bg-white/10 hover:bg-white/20 transition-all"
                            title="Copy contract address"
                          >
                            {copiedAddress === token.symbol ? (
                              <Check className="w-3 h-3 text-green-400" />
                            ) : (
                              <Copy className="w-3 h-3 text-white/60" />
                            )}
                          </button>
                        )}
                      </div>
                      <div className="px-1.5 py-0.5 rounded-full text-xs font-medium bg-white/10 text-white/80 flex-shrink-0">
                        ↗ {Math.round(token.trendingScore)}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-white/70">
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Users className="w-3 h-3" />
                        <span>{token.socialProof.mentionedBy.length}</span>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <TrendingUp className="w-3 h-3" />
                        <span>{token.mentionCount}</span>
                      </div>
                      {token.priceData && (
                        <div className="text-green-300 text-xs flex-shrink-0">
                          ${token.priceData.current.toFixed(4)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right flex-shrink-0 ml-2">
                  {token.priceData?.change24h && (
                    <div className={`flex items-center gap-1 text-xs font-medium ${
                      token.priceData.change24h > 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {token.priceData.change24h > 0 ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      {Math.abs(token.priceData.change24h).toFixed(1)}%
                    </div>
                  )}
                  <div className="text-white/40 text-xs mt-0.5">
                    ♥ {token.socialProof.totalEngagement}
                  </div>
                </div>
              </div>

              {/* Social Proof - Show who's talking about it */}
              {token.socialProof.mentionedBy.length > 0 && (
                <div className="mt-2 pt-2 border-t border-white/10">
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-white/50 text-xs flex-shrink-0">By:</span>
                    <div className="flex flex-wrap gap-1 min-w-0">
                      {token.socialProof.mentionedBy.slice(0, 2).map((username, i) => (
                        <span key={i} className="text-xs bg-white/10 text-white/80 px-1.5 py-0.5 rounded-full truncate max-w-[100px]" title={`@${username}`}>
                          @{username}
                        </span>
                      ))}
                      {token.socialProof.mentionedBy.length > 2 && (
                        <span className="text-xs text-white/60 flex-shrink-0">
                          +{token.socialProof.mentionedBy.length - 2}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}