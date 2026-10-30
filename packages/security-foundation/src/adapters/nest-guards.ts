import { AuthenticationRequiredError } from '../domain/errors.ts';
import { AuthenticatedPrincipal } from '../domain/principal.ts';
import { TokenService } from '../services/token.service.ts';
import { SessionService } from '../services/session.service.ts';
import { Role, Permission } from '../domain/roles.ts';

export interface HttpRequestContext {
  readonly path: string;
  readonly method: string;
  readonly headers: Record<string, string | undefined>;
  readonly params?: Record<string, string>;
  readonly query?: Record<string, string>;
  principal?: AuthenticatedPrincipal;
}

export class RoutePrivacyRegistry {
  private readonly publicRoutes = new Set<string>();

  public registerPublicRoute(path: string, method: string = 'GET'): void {
    this.publicRoutes.add(`${method.toUpperCase()} ${path.toLowerCase()}`);
  }

  public isPublic(path: string, method: string): boolean {
    return this.publicRoutes.has(`${method.toUpperCase()} ${path.toLowerCase()}`);
  }
}

export class AuthenticationGuard {
  private readonly tokenService: TokenService;
  private readonly sessionService: SessionService;
  private readonly routeRegistry: RoutePrivacyRegistry;

  constructor(
    tokenService: TokenService,
    sessionService: SessionService,
    routeRegistry: RoutePrivacyRegistry
  ) {
    this.tokenService = tokenService;
    this.sessionService = sessionService;
    this.routeRegistry = routeRegistry;
  }

  public canActivate(req: HttpRequestContext): boolean {
    if (this.routeRegistry.isPublic(req.path, req.method)) {
      return true;
    }

    const authHeader = req.headers['authorization'] ?? req.headers['Authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationRequiredError('Missing or malformed Authorization header.');
    }

    const token = authHeader.substring(7);
    const payload = this.tokenService.verifyAccessToken(token);

    this.sessionService.assertActive(payload.sessionId);

    req.principal = new AuthenticatedPrincipal({
      id: payload.sub,
      email: payload.email,
      activeTenantId: payload.tenantId,
      sessionId: payload.sessionId,
      memberships: [
        {
          tenantId: payload.tenantId ?? '',
          role: payload.role as Role,
          status: 'active',
          customPermissions: payload.permissions as readonly Permission[],
        },
      ],
    });

    return true;
  }

  public async canActivateAsync(req: HttpRequestContext): Promise<boolean> {
    const authHeader = req.headers['authorization'] ?? req.headers['Authorization'];

    if (this.routeRegistry.isPublic(req.path, req.method)) {
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.substring(7);
          const payload = this.tokenService.verifyAccessToken(token);
          await this.sessionService.assertActivePersisted(payload.sessionId);
          req.principal = new AuthenticatedPrincipal({
            id: payload.sub,
            email: payload.email,
            activeTenantId: payload.tenantId,
            sessionId: payload.sessionId,
            memberships: [
              {
                tenantId: payload.tenantId ?? '',
                role: payload.role as Role,
                status: 'active',
                customPermissions: payload.permissions as readonly Permission[],
              },
            ],
          });
        } catch {
          // Public route: ignore invalid/missing optional auth
        }
      }
      return true;
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationRequiredError('Missing or malformed Authorization header.');
    }

    const token = authHeader.substring(7);
    const payload = this.tokenService.verifyAccessToken(token);

    await this.sessionService.assertActivePersisted(payload.sessionId);

    req.principal = new AuthenticatedPrincipal({
      id: payload.sub,
      email: payload.email,
      activeTenantId: payload.tenantId,
      sessionId: payload.sessionId,
      memberships: [
        {
          tenantId: payload.tenantId ?? '',
          role: payload.role as Role,
          status: 'active',
          customPermissions: payload.permissions as readonly Permission[],
        },
      ],
    });

    return true;
  }
}

export class TenantGuard {
  public canActivate(req: HttpRequestContext): boolean {
    const principal = req.principal;
    if (!principal) {
      throw new AuthenticationRequiredError();
    }

    const clientSuppliedTenant = req.headers['x-tenant-id'] ?? req.params?.['tenantId'];

    if (clientSuppliedTenant) {
      principal.assertActiveTenant(clientSuppliedTenant);
    }

    return true;
  }
}
