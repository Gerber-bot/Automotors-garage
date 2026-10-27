export interface SecurityHeadersConfig {
  readonly isProduction: boolean;
  readonly allowedOrigins: readonly string[];
}

export class SecurityHeadersService {
  private readonly config: SecurityHeadersConfig;

  constructor(config: SecurityHeadersConfig) {
    this.config = config;
  }

  public getSecurityHeaders(): Record<string, string> {
    return {
      'Content-Security-Policy':
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self';",
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '0',
      'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(self), geolocation=(), payment=()',
    };
  }

  public isOriginAllowed(origin?: string): boolean {
    if (!origin) return false;
    return this.config.allowedOrigins.includes(origin);
  }

  public getSecureCookieOptions(maxAgeSeconds: number): {
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'lax' | 'strict';
    maxAge: number;
    path: string;
  } {
    return {
      httpOnly: true,
      secure: this.config.isProduction,
      sameSite: 'lax',
      maxAge: maxAgeSeconds * 1000,
      path: '/',
    };
  }
}
