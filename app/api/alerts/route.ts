import { NextRequest, NextResponse } from 'next/server';
import { storeAlert, getUserAlerts, removeAlert, toggleAlert } from '@/lib/price-alert-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, tokenAddress, tokenSymbol, targetPrice, condition } = body;

    // Validation
    if (!userId || !tokenAddress || !tokenSymbol || !targetPrice || !condition) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, tokenAddress, tokenSymbol, targetPrice, condition' },
        { status: 400 }
      );
    }

    if (!['above', 'below'].includes(condition)) {
      return NextResponse.json(
        { error: 'Condition must be either "above" or "below"' },
        { status: 400 }
      );
    }

    if (typeof targetPrice !== 'number' || targetPrice <= 0) {
      return NextResponse.json(
        { error: 'Target price must be a positive number' },
        { status: 400 }
      );
    }

    // Create alert
    const alertId = await storeAlert({
      userId: userId.toString(),
      tokenAddress,
      tokenSymbol,
      targetPrice: parseFloat(targetPrice.toString()),
      condition,
      enabled: true,
    });

    console.log('✅ Created price alert via API:', { alertId, userId, tokenSymbol, targetPrice, condition });

    return NextResponse.json({
      success: true,
      alertId,
      message: `Price alert created for ${tokenSymbol} ${condition} $${targetPrice}`,
    });
  } catch (error) {
    console.error('❌ Error creating price alert:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { error: 'Failed to create price alert', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId parameter' },
        { status: 400 }
      );
    }

    const alerts = await getUserAlerts(userId);

    return NextResponse.json({
      success: true,
      alerts,
      count: alerts.length,
    });
  } catch (error) {
    console.error('❌ Error fetching user alerts:', error);
    console.error('❌ Error details:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { error: 'Failed to fetch alerts', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const alertId = searchParams.get('alertId');

    if (!userId || !alertId) {
      return NextResponse.json(
        { error: 'Missing userId or alertId parameter' },
        { status: 400 }
      );
    }

    const deleted = await removeAlert(userId, alertId);

    if (deleted) {
      return NextResponse.json({
        success: true,
        message: 'Alert deleted successfully',
      });
    } else {
      return NextResponse.json(
        { error: 'Alert not found' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('❌ Error deleting alert:', error);
    return NextResponse.json(
      { error: 'Failed to delete alert' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, alertId, enabled } = body;

    if (!userId || !alertId || typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing required fields: userId, alertId, enabled' },
        { status: 400 }
      );
    }

    const updated = await toggleAlert(userId, alertId, enabled);

    if (updated) {
      return NextResponse.json({
        success: true,
        message: `Alert ${enabled ? 'enabled' : 'disabled'} successfully`,
      });
    } else {
      return NextResponse.json(
        { error: 'Alert not found' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('❌ Error updating alert:', error);
    return NextResponse.json(
      { error: 'Failed to update alert' },
      { status: 500 }
    );
  }
}