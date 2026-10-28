import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function validateCsrf(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return true;
  const host = req.headers.get('host');
  if (!host) return true;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  if (!validateCsrf(req)) {
    return NextResponse.json(
      { error: 'CSRF violation: cross-site origin forbidden.' },
      { status: 403 }
    );
  }

  try {
    const sessionToken = req.cookies.get('automotors_session')?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const body = await req.json();
    const backendUrl = process.env.BACKEND_API_URL || 'http://127.0.0.1:4000';

    const backendRes = await fetch(`${backendUrl}/api/v1/auth/select-workshop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify(body),
    });

    const data = await backendRes.json();

    if (!backendRes.ok) {
      return NextResponse.json(
        { error: data.error || 'Workshop selection failed.' },
        { status: backendRes.status }
      );
    }

    // Return sanitized tenant information without raw token in JSON
    const response = NextResponse.json(
      { activeTenantId: data.activeTenantId },
      { status: 200 }
    );

    // Update cookie with freshly issued tenant token
    if (data.token) {
      response.cookies.set({
        name: 'automotors_session',
        value: data.token,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24,
      });
    }

    return response;
  } catch (err: unknown) {
    return NextResponse.json(
      { error: `Internal workshop switch error: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}
