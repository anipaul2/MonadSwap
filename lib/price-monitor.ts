'use server'

import { sendFrameNotification } from './notifs';
import { Redis } from '@upstash/redis';

// Redis client setup
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export interface PriceAlert {
  id: string;
  userId: string; // FID from Farcaster
  tokenAddress: string;
  tokenSymbol: string;
  targetPrice: number;
  condition: 'above' | 'below';
  enabled: boolean;
  createdAt: string;
  lastTriggered?: string;
}

// Store user price alert
export async function storeAlert(alert: Omit<PriceAlert, 'id' | 'createdAt'>): Promise<string> {
  const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const fullAlert: PriceAlert = {
    ...alert,
    id: alertId,
    createdAt: new Date().toISOString(),
  };

  // Store in Redis: user:{fid}:alerts:{alertId}
  await redis.set(
    `user:${alert.userId}:alerts:${alertId}`,
    JSON.stringify(fullAlert),
    { ex: 30 * 24 * 60 * 60 } // 30 days expiry
  );

  // Add to user's alert list
  await redis.sadd(`user:${alert.userId}:alert_ids`, alertId);
  
  // Add user to master list of users with alerts
  await redis.sadd('users_with_alerts', alert.userId);

  console.log('✅ Stored price alert:', { alertId, userId: alert.userId, tokenSymbol: alert.tokenSymbol, targetPrice: alert.targetPrice, condition: alert.condition });
  return alertId;
}

// Get all alerts for a user
export async function getUserAlerts(userId: string): Promise<PriceAlert[]> {
  const alertIds = await redis.smembers(`user:${userId}:alert_ids`);
  const alerts: PriceAlert[] = [];

  for (const alertId of alertIds) {
    const alertData = await redis.get(`user:${userId}:alerts:${alertId}`);
    if (alertData) {
      if (typeof alertData === 'string') {
        alerts.push(JSON.parse(alertData));
      } else {
        alerts.push(alertData as PriceAlert);
      }
    }
  }

  return alerts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// Remove an alert
export async function removeAlert(userId: string, alertId: string): Promise<boolean> {
  const deleted = await redis.del(`user:${userId}:alerts:${alertId}`);
  await redis.srem(`user:${userId}:alert_ids`, alertId);
  
  // Check if user has any remaining alerts, if not remove from master list
  const remainingAlerts = await redis.scard(`user:${userId}:alert_ids`);
  if (remainingAlerts === 0) {
    await redis.srem('users_with_alerts', userId);
  }
  
  console.log('🗑️ Removed price alert:', { alertId, userId, deleted: !!deleted });
  return !!deleted;
}

// Toggle alert enabled/disabled
export async function toggleAlert(userId: string, alertId: string, enabled: boolean): Promise<boolean> {
  const alertData = await redis.get(`user:${userId}:alerts:${alertId}`);
  if (!alertData) return false;

  const alert: PriceAlert = typeof alertData === 'string' ? JSON.parse(alertData) : alertData as PriceAlert;
  alert.enabled = enabled;

  await redis.set(
    `user:${userId}:alerts:${alertId}`,
    JSON.stringify(alert),
    { ex: 30 * 24 * 60 * 60 }
  );

  console.log('🔔 Toggled alert:', { alertId, userId, enabled });
  return true;
}

// Get current token price from Monorail
async function getCurrentPrice(tokenAddress: string): Promise<number | null> {
  try {
    // Use Monorail API to get current token price
    const response = await fetch(`https://api.monorail.xyz/v2/tokens/${tokenAddress}/price`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('❌ Failed to fetch price from Monorail:', response.status);
      return null;
    }

    const data = await response.json();
    return data.price || null;
  } catch (error) {
    console.error('❌ Error fetching token price:', error);
    return null;
  }
}

// Check all active alerts and trigger notifications
export async function checkAllAlerts(): Promise<void> {
  console.log('🔍 Starting price alert check cycle...');

  try {
    // Since Upstash Redis doesn't support KEYS command well, we'll use SCAN
    // For now, we'll maintain a master list of users with alerts
    const userIds = await redis.smembers('users_with_alerts');
    
    console.log(`📊 Found ${userIds.length} users with price alerts`);

    for (const userId of userIds) {
      const alerts = await getUserAlerts(userId.toString());
      
      const enabledAlerts = alerts.filter(a => a.enabled);
      console.log(`👤 User ${userId}: ${enabledAlerts.length} enabled alerts`);

      for (const alert of enabledAlerts) {
        await checkSingleAlert(alert);
      }
    }
  } catch (error) {
    console.error('❌ Error in checkAllAlerts:', error);
  }
}

// Check a single alert and trigger notification if needed
async function checkSingleAlert(alert: PriceAlert): Promise<void> {
  try {
    // Skip if triggered recently (within last 15 minutes to avoid spam)
    if (alert.lastTriggered) {
      const lastTrigger = new Date(alert.lastTriggered);
      const now = new Date();
      const timeDiff = now.getTime() - lastTrigger.getTime();
      const minutesDiff = timeDiff / (1000 * 60);
      
      if (minutesDiff < 15) {
        return; // Skip this alert
      }
    }

    const currentPrice = await getCurrentPrice(alert.tokenAddress);
    if (currentPrice === null) {
      console.log(`⚠️ Could not get price for ${alert.tokenSymbol}`);
      return;
    }

    const shouldTrigger = 
      (alert.condition === 'above' && currentPrice > alert.targetPrice) ||
      (alert.condition === 'below' && currentPrice < alert.targetPrice);

    if (shouldTrigger) {
      console.log(`🚨 ALERT TRIGGERED: ${alert.tokenSymbol} is ${alert.condition} $${alert.targetPrice} (current: $${currentPrice})`);

      // Send notification
      const message = `🚨 Price Alert: ${alert.tokenSymbol} is now $${currentPrice.toFixed(6)} (${alert.condition} your target of $${alert.targetPrice})`;
      
      await sendFrameNotification({
        fid: parseInt(alert.userId),
        title: "Price Alert",
        body: message
      });

      // Update lastTriggered timestamp
      alert.lastTriggered = new Date().toISOString();
      await redis.set(
        `user:${alert.userId}:alerts:${alert.id}`,
        JSON.stringify(alert),
        { ex: 30 * 24 * 60 * 60 }
      );

      console.log('✅ Notification sent and alert updated');
    }
  } catch (error) {
    console.error('❌ Error checking single alert:', error);
  }
}

// Cleanup expired alerts (called periodically)
export async function cleanupExpiredAlerts(): Promise<void> {
  console.log('🧹 Starting cleanup of expired alerts...');
  
  const userIds = await redis.smembers('users_with_alerts');
  let cleaned = 0;

  for (const userId of userIds) {
    const alertIds = await redis.smembers(`user:${userId}:alert_ids`);
    
    for (const alertId of alertIds) {
      const alertKey = `user:${userId}:alerts:${alertId}`;
      const exists = await redis.exists(alertKey);
      
      if (!exists) {
        // Alert key doesn't exist, remove from user's alert_ids set
        await redis.srem(`user:${userId}:alert_ids`, alertId);
        cleaned++;
      }
    }
    
    // Check if user has any remaining alerts
    const remainingAlerts = await redis.scard(`user:${userId}:alert_ids`);
    if (remainingAlerts === 0) {
      await redis.srem('users_with_alerts', userId);
    }
  }

  console.log(`🧹 Cleaned up ${cleaned} expired alerts`);
}
