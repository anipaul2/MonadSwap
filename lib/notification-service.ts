'use server'

import { sendFrameNotification } from '@/lib/notifs';

const NEYNAR_API_KEY = '5CE139E3-1B85-41DB-8A49-CC47D96629AD';

// Send trending notification via unified notification system
export async function sendTrendingNotification(
  userFid: string, 
  trendingTokens: { symbol: string; mentionCount: number; trendingScore: number }[]
): Promise<boolean> {
  try {
    console.log(`🔔 Sending trending notification to FID ${userFid}...`);
    
    const topToken = trendingTokens[0];
    const title = `🔥 ${topToken.symbol} is Trending!`;
    const body = `${topToken.symbol} has ${topToken.mentionCount} mentions in your network (Score: ${Math.round(topToken.trendingScore)})`;
    
    // Try miniapp notification first (for users who added frame)
    const frameResult = await sendFrameNotification({
      fid: parseInt(userFid),
      title,
      body
    });
    
    if (frameResult.state === 'success') {
      console.log(`✅ Frame notification sent to FID ${userFid}`);
      return true;
    }
    
    console.log(`⚠️ Frame notification failed (${frameResult.state}), falling back to Neynar API...`);
    
    // Fallback to direct Neynar API
    const message = `🔥 ${topToken.symbol} is trending in your network! ${topToken.mentionCount} mentions (Score: ${Math.round(topToken.trendingScore)})`;
    
    const response = await fetch('https://api.neynar.com/v2/farcaster/notifications', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api_key': NEYNAR_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        recipient_fid: parseInt(userFid),
        message: message,
        type: 'app_notification',
        app_context: {
          name: 'MonadSwap',
          url: process.env.VERCEL_URL || 'https://monadswap.vercel.app'
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Failed to send Neynar notification:', response.status, errorText);
      return false;
    }

    console.log(`✅ Neynar notification sent to FID ${userFid}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending trending notification:', error);
    return false;
  }
}

// Send price alert notification
export async function sendPriceAlertNotification(
  userFid: string,
  tokenSymbol: string,
  currentPrice: number,
  targetPrice: number,
  condition: 'above' | 'below'
): Promise<boolean> {
  try {
    console.log(`💰 Sending price alert to FID ${userFid} for ${tokenSymbol}...`);
    
    const emoji = condition === 'above' ? '🚀' : '📉';
    const message = `${emoji} ${tokenSymbol} alert! Price hit $${currentPrice.toFixed(4)} (target: ${condition} $${targetPrice.toFixed(4)})`;
    
    const response = await fetch('https://api.neynar.com/v2/farcaster/notifications', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api_key': NEYNAR_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        recipient_fid: parseInt(userFid),
        message: message,
        type: 'app_notification',
        app_context: {
          name: 'MonadSwap',
          url: process.env.VERCEL_URL || 'https://bringing-listprice-corresponding-satin.trycloudflare.com'
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Failed to send price alert:', response.status, errorText);
      return false;
    }

    console.log(`✅ Price alert sent to FID ${userFid}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending price alert:', error);
    return false;
  }
}