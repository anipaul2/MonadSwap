import { NextRequest, NextResponse } from 'next/server';
import { getUserFollowing, getSocialGraphCasts } from '@/lib/social-trending-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || '15104';

    console.log(`🔍 Debug trending for user ${userId}`);
    
    // Test 1: Check if we can get following list
    console.log('=== STEP 1: Getting Following ===');
    const following = await getUserFollowing(userId);
    console.log(`Following result: ${following.length} users`);
    
    // Test 2: Check if we can get social graph casts
    console.log('=== STEP 2: Getting Social Graph Casts ===');
    const casts = await getSocialGraphCasts(userId, 20);
    console.log(`Casts result: ${casts.length} casts`);
    
    // Test 3: Manual token search in cast texts
    console.log('=== STEP 3: Searching for Token Mentions ===');
    const tokenMentions = [];
    for (const cast of casts.slice(0, 5)) {
      const text = cast.text;
      const hasToken = /(MON|USDC|WETH|ETH|\$[A-Z]{2,10}|token|coin)/i.test(text);
      if (hasToken) {
        tokenMentions.push({
          author: cast.author.username,
          text: text.substring(0, 100) + '...',
          matches: text.match(/(MON|USDC|WETH|ETH|\$[A-Z]{2,10}|token|coin)/gi)
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      debug: {
        userId,
        followingCount: following.length,
        castsCount: casts.length,
        tokenMentions: tokenMentions.length,
        sampleFollowing: following.slice(0, 5).map(u => ({ username: u.username, fid: u.fid })),
        sampleCasts: casts.slice(0, 3).map(c => ({ 
          author: c.author.username, 
          text: c.text.substring(0, 100) + '...',
          timestamp: c.timestamp 
        })),
        allTokenMentions: tokenMentions
      }
    });

  } catch (error) {
    console.error('❌ Debug error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}