'use client'

import { useFrame } from '@/components/farcaster-provider';

export function SwapHeader() {
  const { context } = useFrame();

  return (
    <div className="text-center mb-8">
      <div className="flex items-center justify-center gap-3 mb-2">
        <div className="relative">
          <img 
            src="https://chainbroker.io/_next/image/?url=https%3A%2F%2Fstatic.chainbroker.io%2Fmediafiles%2Fprojects%2Fmonad%2Fmonad.jpeg&w=1024&q=75" 
            alt="Monad" 
            className="w-10 h-10 rounded-2xl shadow-lg ring-2 ring-white/20"
          />
        </div>
        <div>
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-indigo-200">
            MonadSwap
          </h1>
        </div>
      </div>
      <p className="text-purple-300/80 text-sm mb-4 font-medium">
        Built by{' '}
        <a 
          href="https://x.com/Alphooor" 
          target="_blank" 
          rel="noopener noreferrer"
          className="font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-300 to-pink-300 hover:from-white hover:to-purple-200 transition-all cursor-pointer"
        >
          @Alphoor
        </a>
      </p>
      {context?.user && (
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-3 mx-4 shadow-xl">
          <p className="text-white/90 text-sm font-medium">
            @{context.user.username} <span className="text-white/50">•</span> <span className="text-purple-300">FID: {context.user.fid}</span>
          </p>
        </div>
      )}
    </div>
  );
}