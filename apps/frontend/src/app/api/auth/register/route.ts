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
    const body = await req.json();
    const backendUrl = process.env.BACKEND_API_URL || 'http://127.0.0.1:4000';

    const backendRes = await fetch(`${backendUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await backendRes.json();

    if (!backendRes.ok) {
      return NextResponse.json(
        { error: data.error || 'Registration failed.' },
        { status: backendRes.status }
      );
    }

    // Never expose raw JWT string in response JSON payload
    const { token, ...sanitizedPayload } = data;
    const response = NextResponse.json(sanitizedPayload, { status: 201 });

    // Store access token in secure HTTP-only cookie (BFF session)
    if (token) {
      response.cookies.set({
        name: 'automotors_session',
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24, // 24 hours
      });
    }

    return response;
  } catch (err: unknown) {
    return NextResponse.json(
      { error: `Internal registration handler error: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}
