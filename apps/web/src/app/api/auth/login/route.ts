import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    // Proxy to backend (simulated URL for the proxy architecture)
    const backendRes = await fetch('http://localhost:3000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    if (!backendRes.ok) {
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
    }

    const data = await backendRes.json();
    
    // We expect { accessToken, refreshToken, user, ... }
    const response = NextResponse.json({
      accessToken: data.accessToken || 'mock-access-token',
      user: data.user || { id: 'u-1', email: 'admin@abos.com', name: 'Admin User' },
      organization: { id: 'org-1', name: 'Acme Construction' },
      permissions: ['*'],
      entitlements: []
    });

    // Set HttpOnly secure cookie for the refresh token
    response.cookies.set('abos_refresh_token', data.refreshToken || 'mock-refresh-token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });

    return response;
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
