import { NextRequest, NextResponse } from 'next/server';

// Simple token extraction test
function extractTokenMentions(text: string): string[] {
  const tokenPatterns = [
    /\$([A-Z]{2,10})\b/gi,
    /\b(MON|USDC|WETH|USDT|DAI|WBTC|PEPE|DOGE|SHIB|MATIC|QR|BYTE)\b/gi,
    /0x[a-fA-F0-9]{40}/g
  ];

  const mentions = new Set<string>();
  
  for (const pattern of tokenPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      for (const match of matches) {
        const cleaned = match.replace('$', '').toUpperCase();
        if (cleaned.length >= 2) {
          mentions.add(cleaned);
        }
      }
    }
  }

  return Array.from(mentions);
}

export async function GET(request: NextRequest) {
  try {
    // Test data from your debug results
    const testCasts = [
      {
        author: 'jake',
        text: '7 of the top 8 trending mini apps right now have won at least 1 $QR auction. The best builders bid...'
      },
      {
        author: 'block1337.eth', 
        text: 'used @minibyte ref code: UVaRNk\nfree tokens $BYTE after tge\nhttps://minibyte.network/?ref=UVaRNk'
      }
    ];

    const results = [];
    
    for (const cast of testCasts) {
      const mentions = extractTokenMentions(cast.text);
      results.push({
        author: cast.author,
        text: cast.text.substring(0, 100) + '...',
        mentions,
        mentionCount: mentions.length
      });
    }

    const allMentions = results.flatMap(r => r.mentions);
    const uniqueTokens = Array.from(new Set(allMentions));

    return NextResponse.json({
      success: true,
      testResults: results,
      uniqueTokens,
      totalMentions: allMentions.length,
      uniqueCount: uniqueTokens.length
    });

  } catch (error) {
    console.error('❌ Test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}