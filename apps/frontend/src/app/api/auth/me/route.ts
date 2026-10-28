import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const sessionToken = req.cookies.get('automotors_session')?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: 'No active session found.' }, { status: 401 });
    }

    const backendUrl = process.env.BACKEND_API_URL || 'http://127.0.0.1:4000';
    const backendRes = await fetch(`${backendUrl}/api/v1/auth/me`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
    });

    const data = await backendRes.json();

    if (!backendRes.ok) {
      const response = NextResponse.json(
        { error: data.error || 'Session validation failed.' },
        { status: backendRes.status }
      );
      // Clear cookie if session is revoked or invalid
      if (backendRes.status === 401) {
        response.cookies.set({
          name: 'automotors_session',
          value: '',
          httpOnly: true,
          path: '/',
          maxAge: 0,
        });
      }
      return response;
    }

    // Return sanitized profile and memberships without raw JWT token in JSON payload
    const { token: _t, ...sanitized } = data;
    return NextResponse.json(sanitized, { status: 200 });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: `Internal session handler error: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}
