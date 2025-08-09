'use client'

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Bell, BellOff, Plus, Trash2, Loader2 } from 'lucide-react';
import { useFrame } from '@/components/farcaster-provider';
import { useMonorailTokens } from '@/hooks/useMonorailTokens';

interface PriceAlert {
  id: string;
  userId: string;
  tokenAddress: string;
  tokenSymbol: string;
  targetPrice: number;
  condition: 'above' | 'below';
  enabled: boolean;
  createdAt: string;
  lastTriggered?: string;
}

export function PriceNotifications() {
  const { context } = useFrame();
  const { tokens } = useMonorailTokens();
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const [showAddForm, setShowAddForm] = useState(false);
  const [showTokenDropdown, setShowTokenDropdown] = useState(false);
  const [newAlert, setNewAlert] = useState({
    tokenSymbol: 'MON',
    targetPrice: '',
    condition: 'above' as 'above' | 'below'
  });

  const loadUserAlerts = useCallback(async () => {
    if (!context?.user?.fid) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/alerts?userId=${context.user.fid}`);
      const data = await response.json();

      if (data.success) {
        setAlerts(data.alerts);
        console.log('✅ Loaded user alerts:', data.alerts.length);
      } else {
        console.error('❌ Failed to load alerts:', data.error);
      }
    } catch (error) {
      console.error('❌ Error loading alerts:', error);
    } finally {
      setIsLoading(false);
    }
  }, [context?.user?.fid]);

  // Load user alerts on component mount
  useEffect(() => {
    if (context?.user?.fid && !isLoading) {
      loadUserAlerts();
    }
  }, [context?.user?.fid, loadUserAlerts]);

  // Debug log to check token count
  useEffect(() => {
    console.log('🪙 Price Alerts: Available tokens:', tokens.length);
  }, [tokens.length]);

  const toggleAlert = async (id: string) => {
    if (!context?.user?.fid) return;

    const alert = alerts.find(a => a.id === id);
    if (!alert) return;

    try {
      const response = await fetch('/api/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: context.user.fid,
          alertId: id,
          enabled: !alert.enabled,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setAlerts(prev => prev.map(a => 
          a.id === id ? { ...a, enabled: !a.enabled } : a
        ));
        console.log('✅ Alert toggled:', { id, enabled: !alert.enabled });
      } else {
        console.error('❌ Failed to toggle alert:', data.error);
      }
    } catch (error) {
      console.error('❌ Error toggling alert:', error);
    }
  };

  const removeAlert = async (id: string) => {
    if (!context?.user?.fid) return;

    try {
      const response = await fetch(`/api/alerts?userId=${context.user.fid}&alertId=${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        setAlerts(prev => prev.filter(a => a.id !== id));
        console.log('✅ Alert removed:', id);
      } else {
        console.error('❌ Failed to remove alert:', data.error);
      }
    } catch (error) {
      console.error('❌ Error removing alert:', error);
    }
  };

  const addAlert = async () => {
    if (!newAlert.targetPrice || !context?.user?.fid) return;

    // Find token address from symbol
    const token = tokens.find(t => t.symbol === newAlert.tokenSymbol);
    if (!token) {
      console.error('❌ Token not found:', newAlert.tokenSymbol);
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: context.user.fid,
          tokenAddress: token.address,
          tokenSymbol: newAlert.tokenSymbol,
          targetPrice: parseFloat(newAlert.targetPrice),
          condition: newAlert.condition,
        }),
      });

      const data = await response.json();
      if (data.success) {
        // Reload alerts to get the new one
        await loadUserAlerts();
        setNewAlert({ tokenSymbol: 'MON', targetPrice: '', condition: 'above' });
        setShowAddForm(false);
        console.log('✅ Alert created:', data.alertId);
      } else {
        console.error('❌ Failed to create alert:', data.error);
      }
    } catch (error) {
      console.error('❌ Error creating alert:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Modern Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Price Alerts</h2>
          <p className="text-white/60 text-sm">Get notified when targets hit</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="group relative bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white rounded-2xl p-3 transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-purple-500/25 active:scale-95"
        >
          <Plus className="w-5 h-5 transition-transform group-hover:rotate-90 duration-300" />
        </button>
      </div>

      {/* Existing Alerts */}
      {isLoading ? (
        <div className="space-y-4">
          {/* Modern Loading skeletons */}
          {[1, 2].map(i => (
            <div key={i} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-5 shadow-xl animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-white/20 to-white/10"></div>
                  <div>
                    <div className="w-32 h-5 bg-white/20 rounded-full mb-3"></div>
                    <div className="w-40 h-3 bg-white/15 rounded-full"></div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20"></div>
                  <div className="w-10 h-10 rounded-full bg-white/20"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 text-center shadow-xl">
          <div className="relative mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-500/20 to-indigo-500/20 rounded-3xl mx-auto flex items-center justify-center">
              <Bell className="w-10 h-10 text-white/60" />
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-purple-400 to-indigo-400 rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full"></div>
            </div>
          </div>
          <h3 className="text-white text-lg font-semibold mb-2">No alerts yet</h3>
          <p className="text-white/50 text-sm leading-relaxed max-w-xs mx-auto">
            Create your first price alert to get notified when tokens hit your target prices
          </p>
        </div>
      ) : (
        <div className="space-y-4">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="group bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-5 shadow-xl hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-300 hover:border-white/20"
              >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`relative w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${
                    alert.tokenSymbol === 'MON' 
                      ? 'bg-gradient-to-br from-purple-500 to-pink-500'
                      : alert.tokenSymbol === 'USDC'
                      ? 'bg-gradient-to-br from-blue-500 to-cyan-500'
                      : 'bg-gradient-to-br from-green-500 to-teal-500'
                  }`}>
                    <span className="text-white font-bold text-sm">{alert.tokenSymbol.slice(0, 3)}</span>
                    {alert.enabled && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-slate-950 animate-pulse" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-white font-semibold text-lg">
                        {alert.tokenSymbol}
                      </p>
                      <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        alert.condition === 'above' 
                          ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                          : 'bg-red-500/20 text-red-300 border border-red-500/30'
                      }`}>
                        {alert.condition} ${alert.targetPrice}
                      </div>
                    </div>
                    <p className="text-white/50 text-sm">
                      {alert.lastTriggered 
                        ? `Triggered ${new Date(alert.lastTriggered).toLocaleDateString()}`
                        : `Monitoring price movements`
                      }
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleAlert(alert.id)}
                    className={`relative p-2.5 rounded-xl transition-all duration-300 ${
                      alert.enabled 
                        ? 'bg-green-500/20 text-green-300 hover:bg-green-500/30 hover:scale-105 shadow-lg shadow-green-500/20'
                        : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60'
                    }`}
                  >
                    {alert.enabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                  </button>
                  
                  <button
                    onClick={() => removeAlert(alert.id)}
                    className="p-2.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-red-500/20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Alert Form */}
      {showAddForm && (
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-xl">
          <h3 className="text-white text-lg font-semibold mb-6">Add Price Alert</h3>
          
          <div className="space-y-5">
            <div>
              <label className="text-white/80 text-sm mb-3 block font-medium">Token</label>
              <div className="relative">
                {/* Custom Token Selector */}
                <button
                  type="button"
                  onClick={() => setShowTokenDropdown(!showTokenDropdown)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-left cursor-pointer hover:border-white/20 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 flex items-center justify-between"
                >
                  <span>{newAlert.tokenSymbol || 'Select Token'}</span>
                  <svg 
                    className={`w-5 h-5 text-white/60 transition-transform duration-200 ${showTokenDropdown ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Custom Dropdown Menu - Fixed Height with Scroll */}
                {showTokenDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900/95 backdrop-blur-xl border border-purple-500/30 rounded-2xl shadow-2xl z-50 max-h-48 overflow-y-auto">
                    <div className="p-1">
                      {tokens.length > 0 ? tokens.map(token => (
                        <button
                          key={`${token.symbol}-${token.address}`}
                          type="button"
                          onClick={() => {
                            setNewAlert(prev => ({ ...prev, tokenSymbol: token.symbol }));
                            setShowTokenDropdown(false);
                          }}
                          className="w-full text-left p-3 rounded-xl hover:bg-purple-500/20 hover:border-purple-400/50 transition-all duration-200 text-white text-sm flex items-center justify-between group border border-transparent"
                        >
                          <span className="font-semibold text-white">{token.symbol}</span>
                          <span className="text-purple-300/80 text-xs group-hover:text-purple-200">{token.name}</span>
                        </button>
                      )) : (
                        <div className="p-3 text-purple-300/70 text-sm">Loading tokens...</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Click outside to close */}
                {showTokenDropdown && (
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowTokenDropdown(false)}
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-white/80 text-sm mb-3 block font-medium">Condition</label>
                <div className="relative">
                  <select
                    value={newAlert.condition}
                    onChange={(e) => setNewAlert(prev => ({ ...prev, condition: e.target.value as 'above' | 'below' }))}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white appearance-none cursor-pointer hover:border-white/20 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                  >
                    <option value="above" className="bg-slate-800">Above</option>
                    <option value="below" className="bg-slate-800">Below</option>
                  </select>
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-white/80 text-sm mb-3 block font-medium">Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newAlert.targetPrice}
                  onChange={(e) => setNewAlert(prev => ({ ...prev, targetPrice: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder-white/40 hover:border-white/20 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                />
              </div>
            </div>

            <div className="flex gap-4 pt-2">
              <button
                onClick={addAlert}
                disabled={!newAlert.targetPrice || isCreating}
                className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 disabled:from-purple-800 disabled:to-indigo-800 text-white font-semibold py-4 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:shadow-purple-500/25 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCreating && <Loader2 className="w-4 h-4 animate-spin" />}
                {isCreating ? 'Creating Alert...' : 'Add Alert'}
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-semibold py-4 rounded-2xl transition-all duration-300 active:scale-95"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}