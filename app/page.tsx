import App from '@/components/pages/app'
import { APP_URL } from '@/lib/constants'
import type { Metadata } from 'next'

const frame = {
  version: '1',
  imageUrl: `${APP_URL}/images/feed.png`,
  button: {
    title: '🔄 Swap Tokens',
    action: {
      type: 'launch_frame',
      name: 'MonadSwap',
      url: APP_URL,
      splashImageUrl: `${APP_URL}/images/splash.png`,
      splashBackgroundColor: '#7c3aed',
    },
  },
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'MonadSwap - DEX on Monad',
    openGraph: {
      title: 'MonadSwap - DEX on Monad',
      description: 'Swap tokens on Monad testnet with Kuru Exchange. Get price alerts and trending tokens from your social graph.',
    },
    other: {
      'fc:miniapp': JSON.stringify(frame),
      'fc:frame': JSON.stringify(frame),
    },
  }
}

export default function Home() {
  return <App />
}
