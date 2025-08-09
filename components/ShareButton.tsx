'use client'

import { useState } from 'react'
import { useFrame } from '@/components/farcaster-provider'
import { Share2, Loader2, Check, X } from 'lucide-react'

interface ShareButtonProps {
  cast: {
    text: string
    embeds?: [string] | [string, string] | []
  }
  buttonText?: string
  showIcon?: boolean
  className?: string
}

export function ShareButton({ 
  cast, 
  buttonText = "Share on Farcaster", 
  showIcon = true,
  className = ""
}: ShareButtonProps) {
  const { actions } = useFrame()
  const [isSharing, setIsSharing] = useState(false)
  const [shareStatus, setShareStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const handleShare = async () => {
    if (!actions?.composeCast) {
      console.error('❌ composeCast not available')
      setShareStatus('error')
      setTimeout(() => setShareStatus('idle'), 3000)
      return
    }

    setIsSharing(true)
    setShareStatus('idle')

    try {
      console.log('📤 Sharing cast:', cast)
      
      // Call composeCast with the exact format that works
      await actions.composeCast(cast)
      
      console.log('✅ Cast shared successfully')
      setShareStatus('success')
      
      // Reset status after 2 seconds
      setTimeout(() => {
        setShareStatus('idle')
      }, 2000)
      
    } catch (error) {
      console.error('❌ Error sharing cast:', error)
      setShareStatus('error')
      
      // Reset status after 3 seconds
      setTimeout(() => {
        setShareStatus('idle')
      }, 3000)
    } finally {
      setIsSharing(false)
    }
  }

  const getButtonContent = () => {
    if (isSharing) {
      return (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Sharing...
        </>
      )
    }

    if (shareStatus === 'success') {
      return (
        <>
          <Check className="w-3.5 h-3.5" />
          Shared!
        </>
      )
    }

    if (shareStatus === 'error') {
      return (
        <>
          <X className="w-3.5 h-3.5" />
          Failed
        </>
      )
    }

    return (
      <>
        {showIcon && <Share2 className="w-3.5 h-3.5" />}
        {buttonText}
      </>
    )
  }

  const getButtonStyle = () => {
    if (shareStatus === 'success') {
      return 'bg-gradient-to-r from-green-500/80 to-emerald-500/80 hover:from-green-600/80 hover:to-emerald-600/80'
    }
    
    if (shareStatus === 'error') {
      return 'bg-gradient-to-r from-red-500/80 to-red-600/80 hover:from-red-600/80 hover:to-red-700/80'
    }

    return 'bg-gradient-to-r from-purple-500/80 to-blue-500/80 hover:from-purple-600/80 hover:to-blue-600/80'
  }

  return (
    <button
      onClick={handleShare}
      disabled={isSharing}
      className={`inline-flex items-center gap-1.5 ${getButtonStyle()} text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-all shadow-lg hover:shadow-xl active:scale-95 disabled:opacity-75 disabled:cursor-not-allowed ${className}`}
    >
      {getButtonContent()}
    </button>
  )
}