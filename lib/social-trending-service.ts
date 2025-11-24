'use server'

import { redis } from './redis-client';

const NEYNAR_API_KEY = '5CE139E3-1B85-41DB-8A49-CC47D96629AD';
const NEYNAR_BASE_URL = 'https://api.neynar.com/v2';

interface NeynarUser {
  fid: number;
  username: string;
  display_name: string;
  pfp_url?: string;
}

interface NeynarFollowing {
  users: NeynarUser[];
}

interface NeynarCast {
  hash: string;
  text: string;
  author: NeynarUser;
  timestamp: string;
  reactions?: {
    likes_count: number;
    recasts_count: number;
    replies_count: number;
  };
  embeds?: Array<{
    url?: string;
    metadata?: any;
  }>;
}

interface NeynarFeed {
  casts: NeynarCast[];
}

interface TokenMention {
  symbol: string;
  contractAddress?: string;
  mentionCount: number;
  engagementScore: number;
  mentionedBy: string[];
  recentMentions: Date[];
  priceChange24h?: number;
}

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

// Get user's following list from Neynar
export async function getUserFollowing(fid: string): Promise<NeynarUser[]> {
  try {
    console.log(`🔍 Fetching following for FID ${fid}...`);
    const url = `${NEYNAR_BASE_URL}/farcaster/user/${fid}/following?limit=150`;
    console.log(`🔗 Neynar URL: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'accept': 'application/json',
        'api_key': NEYNAR_API_KEY
      }
    });

    console.log(`📡 Neynar response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Neynar following API error:', response.status, response.statusText, errorText);
      return [];
    }

    const data: any = await response.json();
    console.log(`📊 Raw Neynar response:`, JSON.stringify(data, null, 2));
    console.log(`✅ Fetched ${data.users?.length || 0} following for FID ${fid}`);
    console.log('👥 Sample users:', data.users?.slice(0, 3).map((u: any) => u.username));
    return data.users || [];
  } catch (error) {
    console.error('❌ Error fetching following:', error);
    return [];
  }
}

// Get recent casts from user's social graph
export async function getSocialGraphCasts(fid: string, limit: number = 50): Promise<NeynarCast[]> {
  try {
    console.log(`📱 Fetching social graph casts for FID ${fid}...`);
    const url = `${NEYNAR_BASE_URL}/farcaster/feed?feed_type=following&fid=${fid}&limit=${limit}`;
    console.log(`🔗 Feed URL: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'accept': 'application/json',
        'api_key': NEYNAR_API_KEY
      }
    });

    console.log(`📡 Feed response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Neynar feed API error:', response.status, response.statusText, errorText);
      return [];
    }

    const data: NeynarFeed = await response.json();
    console.log(`✅ Fetched ${data.casts?.length || 0} casts from social graph for FID ${fid}`);
    
    // Log sample casts with token mentions
    const castsWithTokens = data.casts?.filter(cast => 
      /(MON|USDC|WETH|\$[A-Z]{2,10}|0x[a-fA-F0-9]{40})/i.test(cast.text)
    ) || [];
    console.log(`🪙 Found ${castsWithTokens.length} casts with potential token mentions`);
    
    return data.casts || [];
  } catch (error) {
    console.error('❌ Error fetching social graph casts:', error);
    return [];
  }
}

// Extract token mentions from cast text (simplified to avoid recursion)
function extractTokenMentions(text: string): string[] {
  const tokenPatterns = [
    // Token symbols with $ prefix
    /\$([A-Z]{2,10})\b/gi,
    // Common token symbols without $
    /\b(MON|USDC|WETH|USDT|DAI|WBTC|PEPE|DOGE|SHIB|MATIC|QR|BYTE)\b/gi,
    // Contract addresses (basic pattern)
    /0x[a-fA-F0-9]{40}/g
  ];

  const mentions = new Set<string>();
  
  for (const pattern of tokenPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      for (const match of matches) {
        // Clean up the match
        const cleaned = match.replace('$', '').toUpperCase();
        if (cleaned.length >= 2) {
          mentions.add(cleaned);
        }
      }
    }
  }

  return Array.from(mentions);
}

// Analyze token mentions in social graph
export async function analyzeSocialTokenMentions(fid: string): Promise<TokenMention[]> {
  const casts = await getSocialGraphCasts(fid, 100);
  const tokenMentions = new Map<string, TokenMention>();

  for (const cast of casts) {
    const mentions = extractTokenMentions(cast.text);
    const engagement = (cast.reactions?.likes_count || 0) + 
                     (cast.reactions?.recasts_count || 0) + 
                     (cast.reactions?.replies_count || 0);

    for (const token of mentions) {
      if (!tokenMentions.has(token)) {
        tokenMentions.set(token, {
          symbol: token,
          mentionCount: 0,
          engagementScore: 0,
          mentionedBy: [],
          recentMentions: []
        });
      }

      const existing = tokenMentions.get(token)!;
      existing.mentionCount++;
      existing.engagementScore += engagement;
      
      if (!existing.mentionedBy.includes(cast.author.username)) {
        existing.mentionedBy.push(cast.author.username);
      }
      
      existing.recentMentions.push(new Date(cast.timestamp));
    }
  }

  return Array.from(tokenMentions.values());
}

// Get price data from Monorail for token validation (now optional)
export async function enrichWithPriceData(tokenMentions: TokenMention[]): Promise<TrendingToken[]> {
  const enrichedTokens: TrendingToken[] = [];
  
  console.log(`💎 Enriching ${tokenMentions.length} token mentions...`);

  for (const mention of tokenMentions) {
    try {
      console.log(`🔍 Processing ${mention.symbol} (${mention.mentionCount} mentions)`);
      
      // Calculate trending score (don't require Monorail validation)
      const timeDecay = calculateTimeDecay(mention.recentMentions);
      const networkDiversity = mention.mentionedBy.length;
      const trendingScore = (
        mention.mentionCount * 0.4 +
        (mention.engagementScore / mention.mentionCount || 0) * 0.3 +
        networkDiversity * 0.2 +
        timeDecay * 0.1
      );

      // Try to get token data from Monorail (optional)
      let tokenData = null;
      try {
        const response = await fetch(`https://api.monorail.xyz/v2/token?find=${mention.symbol}`);
        if (response.ok) {
          const tokens = await response.json();
          tokenData = tokens.find((t: any) => t.symbol === mention.symbol);
          console.log(`${tokenData ? '✅' : '❌'} Monorail data for ${mention.symbol}: ${tokenData ? 'found' : 'not found'}`);
        }
      } catch (error) {
        console.log(`⚠️ Monorail lookup failed for ${mention.symbol}, proceeding without price data`);
      }

      // Add token regardless of Monorail validation
      enrichedTokens.push({
        symbol: mention.symbol,
        contractAddress: tokenData?.address,
        trendingScore,
        mentionCount: mention.mentionCount,
        engagementScore: mention.engagementScore,
        socialProof: {
          mentionedBy: mention.mentionedBy,
          totalEngagement: mention.engagementScore
        },
        priceData: tokenData?.usd_per_token ? {
          current: parseFloat(tokenData.usd_per_token),
          change24h: 0,
          confidence: parseFloat(tokenData.pconf || '0')
        } : undefined
      });
      
      console.log(`✅ Added ${mention.symbol} with score ${trendingScore.toFixed(2)}`);
      
    } catch (error) {
      console.error(`❌ Error processing token ${mention.symbol}:`, error);
    }
  }

  const sorted = enrichedTokens.sort((a, b) => b.trendingScore - a.trendingScore);
  console.log(`🏆 Final ranking: ${sorted.map(t => `${t.symbol}(${t.trendingScore.toFixed(1)})`).join(', ')}`);
  
  return sorted;
}

// Calculate time decay factor for recent mentions (simplified)
function calculateTimeDecay(mentions: Date[]): number {
  if (mentions.length === 0) return 0;
  
  const now = new Date().getTime();
  const last24h = mentions.filter(m => (now - m.getTime()) < 24 * 60 * 60 * 1000);
  const last7d = mentions.filter(m => (now - m.getTime()) < 7 * 24 * 60 * 60 * 1000);
  
  // Recent mentions get higher score
  return (last24h.length * 2 + last7d.length) / mentions.length;
}

// Main function to get trending tokens for a user
export async function getTrendingTokensForUser(fid: string): Promise<TrendingToken[]> {
  try {
    console.log(`🔍 Analyzing trending tokens for FID ${fid}...`);
    
    // Get user's social network and analyze token mentions
    const tokenMentions = await analyzeSocialTokenMentions(fid);
    console.log(`📊 Found ${tokenMentions.length} token mentions in social graph`);
    
    if (tokenMentions.length === 0) {
      console.log(`⚠️ No token mentions found for FID ${fid}, returning empty array`);
      return [];
    }

    // Enrich with price data and calculate trending scores
    const trendingTokens = await enrichWithPriceData(tokenMentions);
    console.log(`🏆 Generated ${trendingTokens.length} trending tokens`);

    // Cache the results
    const cacheKey = `trending:${fid}`;
    await redis.setex(cacheKey, 300, JSON.stringify(trendingTokens)); // 5 minutes
    
    return trendingTokens;
    
  } catch (error) {
    console.error('❌ Error getting trending tokens:', error);
    return [];
  }
}

// Store user's trending preferences for notifications
export async function storeTrendingPreferences(fid: string, enabled: boolean): Promise<boolean> {
  try {
    const key = `trending_prefs:${fid}`;
    await redis.set(key, JSON.stringify({ enabled, updatedAt: new Date().toISOString() }), { ex: 30 * 24 * 60 * 60 }); // 30 days
    return true;
  } catch (error) {
    console.error('❌ Error storing trending preferences:', error);
    return false;
  }
}

// Check for new trending tokens and send notifications
export async function checkForNewTrendingTokens(): Promise<void> {
  // This would be called by a background job
  // For now, just a placeholder for the notification logic
  console.log('🔄 Background job: Checking for new trending tokens...');
}
