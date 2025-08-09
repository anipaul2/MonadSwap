import { NextRequest, NextResponse } from 'next/server';
import { checkAllAlerts, cleanupExpiredAlerts } from '@/lib/price-alert-service';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Price monitoring cycle started...');
    const startTime = Date.now();

    // Run the price check cycle
    await checkAllAlerts();

    // Also cleanup expired alerts periodically
    await cleanupExpiredAlerts();

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`✅ Price monitoring cycle completed in ${duration}ms`);

    return NextResponse.json({
      success: true,
      message: 'Price monitoring cycle completed',
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Error in price monitoring cycle:', error);
    return NextResponse.json(
      { 
        error: 'Price monitoring cycle failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET endpoint for manual testing
export async function GET() {
  return NextResponse.json({
    message: 'Price monitoring endpoint is active. Use POST to trigger a monitoring cycle.',
    timestamp: new Date().toISOString(),
  });
}