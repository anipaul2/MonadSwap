import { NextRequest, NextResponse } from 'next/server';

const MONORAIL_BASE_URL = 'https://api.monorail.xyz/v2';
const PATHFINDER_BASE_URL = ' https://pathfinder.monorail.xyz/v4';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const { path } = params;
    const searchParams = request.nextUrl.searchParams;
    
    // Determine which API to use based on the path
    const isPathfinder = path[0] === 'pathfinder';
    const baseUrl = isPathfinder ? PATHFINDER_BASE_URL : MONORAIL_BASE_URL;
    
    // Remove 'pathfinder' from path if it exists
    const apiPath = isPathfinder ? path.slice(1) : path;
    
    // Construct the full URL
    const url = `${baseUrl}/${apiPath.join('/')}?${searchParams.toString()}`;
    
    console.log('🔄 Proxying request to Monorail:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('❌ Monorail API error:', response.status, response.statusText);
      return NextResponse.json(
        { error: `API request failed: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Monorail API response received');
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const { path } = params;
    const body = await request.json();
    
    // Determine which API to use based on the path
    const isPathfinder = path[0] === 'pathfinder';
    const baseUrl = isPathfinder ? PATHFINDER_BASE_URL : MONORAIL_BASE_URL;
    
    // Remove 'pathfinder' from path if it exists
    const apiPath = isPathfinder ? path.slice(1) : path;
    
    // Construct the full URL
    const url = `${baseUrl}/${apiPath.join('/')}`;
    
    console.log('🔄 Proxying POST request to Monorail:', url);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error('❌ Monorail API error:', response.status, response.statusText);
      return NextResponse.json(
        { error: `API request failed: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Monorail API response received');
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
