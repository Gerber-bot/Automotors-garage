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
    const backendUrl = process.env.BACKEND_API_URL || 'http://127.0.0.1:4000';

    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      // Empty body allowed
    }

    if (body.sessionId && sessionToken) {
      try {
        await fetch(`${backendUrl}/api/v1/auth/sessions/${body.sessionId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${sessionToken}`,
          },
        });
      } catch {
        // Continue clearing cookie even if backend session revocation failed
      }
    }

    const response = NextResponse.json(
      { message: 'Session terminated successfully.' },
      { status: 200 }
    );

    // Clear HTTP-only session cookie
    response.cookies.set({
      name: 'automotors_session',
      value: '',
      httpOnly: true,
      path: '/',
      maxAge: 0,
    });

    return response;
  } catch (err: unknown) {
    return NextResponse.json(
      { error: `Internal logout handler error: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}
