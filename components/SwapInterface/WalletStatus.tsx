'use client'

import { useAccount } from 'wagmi';
import { CheckCircle, XCircle } from 'lucide-react';

export function WalletStatus() {
  const { address, isConnected, chain } = useAccount();

  // Debug logging
  console.log('WalletStatus render:', { 
    address, 
    isConnected, 
    chain: chain?.name, 
    chainId: chain?.id 
  });

  if (!isConnected) {
    return (
      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 mb-4">
        <div className="flex items-center gap-2 text-white/60">
          <XCircle className="w-4 h-4" />
          <span className="text-sm">Farcaster wallet not connected</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 mb-4">
      <div className="flex items-center gap-2">
        <CheckCircle className="w-4 h-4 text-green-400" />
        <div className="text-sm">
          <div className="text-white font-medium">
            Farcaster Connected
          </div>
          <div className="text-white/60 text-xs">
            {address?.slice(0, 6)}...{address?.slice(-4)} • {chain?.name} ({chain?.id})
          </div>
        </div>
      </div>
    </div>
  );
}