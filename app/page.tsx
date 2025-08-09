import App from '@/components/pages/app'
import { APP_URL } from '@/lib/constants'
import type { Metadata } from 'next'

const frame = {
  version: '1',
  imageUrl: 'https://miro.medium.com/v2/resize:fit:4800/format:webp/1*vsb_NQTH7xE5Y6TAfuAlNQ.jpeg',
  button: {
    title: '🔄 Swap Tokens on Monad',
    action: {
      type: 'launch_frame',
      name: 'MonadSwap',
      url: APP_URL,
      splashImageUrl: 'https://dropsearn.fra1.cdn.digitaloceanspaces.com/media/projects/covers/monad_cover_1740116581.webp',
      splashBackgroundColor: '#7c3aed',
    },
  },
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'MonadSwap - Swap Tokens on Monad',
    openGraph: {
      title: 'MonadSwap - Swap Tokens on Monad',
      description: 'Swap tokens on Monad testnet with social price alerts and trending tokens from your network.',
      images: ['https://miro.medium.com/v2/resize:fit:4800/format:webp/1*vsb_NQTH7xE5Y6TAfuAlNQ.jpeg'],
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
