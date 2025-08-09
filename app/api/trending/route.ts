import { NextRequest, NextResponse } from 'next/server';
import { getTrendingTokensForUser, storeTrendingPreferences } from '@/lib/social-trending-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Missing userId parameter' },
        { status: 400 }
      );
    }

    console.log(`📊 Fetching trending tokens for user ${userId}`);

    const trendingTokens = await getTrendingTokensForUser(userId);

    // Add debug info to response
    return NextResponse.json({
      success: true,
      tokens: trendingTokens,
      count: trendingTokens.length,
      debug: {
        userId,
        message: `Processed ${trendingTokens.length} trending tokens`,
        sampleTokens: trendingTokens.slice(0, 3).map(t => ({
          symbol: t.symbol,
          mentions: t.mentionCount,
          score: Math.round(t.trendingScore * 100) / 100
        }))
      }
    });

  } catch (error) {
    console.error('❌ Trending API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch trending tokens', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, enabled } = body;

    if (!userId || typeof enabled !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'Missing userId or enabled parameter' },
        { status: 400 }
      );
    }

    const success = await storeTrendingPreferences(userId, enabled);

    if (success) {
      return NextResponse.json({
        success: true,
        message: `Trending notifications ${enabled ? 'enabled' : 'disabled'}`
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to update preferences' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ Trending preferences API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update trending preferences' },
      { status: 500 }
    );
  }
}