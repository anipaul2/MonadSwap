'use server'

const NEYNAR_API_KEY = '5CE139E3-1B85-41DB-8A49-CC47D96629AD';

// Send trending token notification using Neynar broadcast
export async function sendTrendingNotification(trendingTokens: any[]): Promise<boolean> {
  try {
    console.log(`🔔 Broadcasting trending notification to all frame users...`);
    
    const topToken = trendingTokens[0];
    const title = `🔥 ${topToken.symbol} is Trending!`;
    const body = `${topToken.symbol} has ${topToken.mentionCount} mentions in your network (Score: ${Math.round(topToken.trendingScore)})`;
    const targetUrl = process.env.VERCEL_URL || 'https://bringing-listprice-corresponding-satin.trycloudflare.com';
    
    // Use Neynar's broadcast notification API
    // Note: The actual API endpoint may differ - this is based on typical REST patterns
    const response = await fetch('https://api.neynar.com/v2/farcaster/frame/notification', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api_key': NEYNAR_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        title,
        body,
        target_url: targetUrl,
        app_id: '0266a77e-57e2-4277-a9fe-d3cb92b6ac08'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Failed to send trending notification:', response.status, errorText);
      return false;
    }

    console.log(`✅ Trending notification broadcasted successfully`);
    return true;
  } catch (error) {
    console.error('❌ Error sending trending notification:', error);
    return false;
  }
}

// Send price alert notification
export async function sendPriceAlert(
  tokenSymbol: string,
  currentPrice: number,
  targetPrice: number,
  condition: 'above' | 'below'
): Promise<boolean> {
  try {
    console.log(`💰 Broadcasting price alert for ${tokenSymbol}...`);
    
    const emoji = condition === 'above' ? '🚀' : '📉';
    const title = `${emoji} ${tokenSymbol} Price Alert!`;
    const body = `${tokenSymbol} hit $${currentPrice.toFixed(4)} (target: ${condition} $${targetPrice.toFixed(4)})`;
    const targetUrl = process.env.VERCEL_URL || 'https://bringing-listprice-corresponding-satin.trycloudflare.com';
    
    const response = await fetch('https://api.neynar.com/v2/farcaster/frame/notification', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api_key': NEYNAR_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        title,
        body,
        target_url: targetUrl,
        app_id: '0266a77e-57e2-4277-a9fe-d3cb92b6ac08'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Failed to send price alert:', response.status, errorText);
      return false;
    }

    console.log(`✅ Price alert broadcasted successfully`);
    return true;
  } catch (error) {
    console.error('❌ Error sending price alert:', error);
    return false;
  }
}

// Test notification function
export async function sendTestNotification(): Promise<boolean> {
  try {
    console.log(`🧪 Sending test notification...`);
    
    const title = "🧪 MonadSwap Test";
    const body = "Your trending tokens and price alerts are working!";
    const targetUrl = process.env.VERCEL_URL || 'https://bringing-listprice-corresponding-satin.trycloudflare.com';
    
    const response = await fetch('https://api.neynar.com/v2/farcaster/frame/notification', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api_key': NEYNAR_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        title,
        body,
        target_url: targetUrl,
        app_id: '0266a77e-57e2-4277-a9fe-d3cb92b6ac08'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Failed to send test notification:', response.status, errorText);
      return false;
    }

    console.log(`✅ Test notification sent successfully`);
    return true;
  } catch (error) {
    console.error('❌ Error sending test notification:', error);
    return false;
  }
}