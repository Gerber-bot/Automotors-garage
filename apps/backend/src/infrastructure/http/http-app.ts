import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import * as crypto from 'node:crypto';
import {
  TokenService,
  SessionService,
  RoutePrivacyRegistry,
  AuthenticationGuard,
  TenantGuard,
  AuthenticationRequiredError,
  SessionRevokedError,
  TokenExpiredOrInvalidError,
  CrossTenantViolationError,
  PrivilegeEscalationError,
  SecurityHeadersService,
  PasswordService,
} from '@automotors/security-foundation';
import type { DatabaseInstance } from '@automotors/database';
import { DatabaseFactory, PostgresSessionRepository } from '@automotors/database';
import { PostgresVehicleRepository } from '../database/postgres-vehicle.repository.ts';
import { PostgresWorkOrderRepository } from '../database/postgres-work-order.repository.ts';
import { PostgresCustomerRepository } from '../database/postgres-customer.repository.ts';
import { PostgresMaintenanceHistoryRepository } from '../database/postgres-maintenance-history.repository.ts';
import { PostgresUserRepository, type UserWorkshopMembership } from '../database/postgres-user.repository.ts';
import { PostgresUnitOfWork } from '../database/postgres-unit-of-work.ts';
import { CreateVehicleUseCase } from '../../modules/vehicle/application/create-vehicle.usecase.ts';
import { CreateWorkOrderUseCase } from '../../modules/work-order/application/create-work-order.usecase.ts';
import { CloseWorkOrderUseCase } from '../../modules/work-order/application/close-work-order.usecase.ts';
import { QuickServiceUseCase } from '../../modules/work-order/application/quick-service.usecase.ts';
import { GetVehiclePassportUseCase } from '../../modules/maintenance-history/application/get-vehicle-passport.usecase.ts';
import { CalculatePreventiveDueUseCase } from '../../modules/maintenance-intelligence/application/calculate-preventive-due.usecase.ts';
import {
  DeterministicMaintenanceEngine,
  MaintenanceStatus,
  type PreviousServiceEntry,
} from '../../modules/maintenance-intelligence/domain/deterministic-engine.ts';
import {
  IntervalSource,
  type ServiceIntervalRule,
} from '../../modules/maintenance-intelligence/domain/intervals.ts';
import {
  VehicleKnowledgeBase,
  OWNER_MAINTENANCE_CATEGORIES,
  INSUFFICIENT_DATA_MESSAGE,
} from '../../modules/maintenance-intelligence/domain/vehicle-knowledge-base.ts';
import { Vehicle } from '../../modules/vehicle/domain/vehicle.ts';
import { MaintenanceRecord } from '../../modules/maintenance-history/domain/maintenance-record.ts';
import { VerificationLevel } from '../../modules/maintenance-history/domain/verification-level.ts';
import { maintenanceIntervals, PostgresKnowledgeBaseRepository } from '@automotors/database';
import { ilike, and } from 'drizzle-orm';
import { SummarizeHistoryUseCase } from '../../modules/maintenance-intelligence/application/summarize-history.usecase.ts';
import { ExplainMaintenanceUseCase } from '../../modules/maintenance-intelligence/application/explain-maintenance.usecase.ts';
import { InterpretObd2UseCase } from '../../modules/maintenance-intelligence/application/interpret-obd2.usecase.ts';
import { OpenAIAIAdapter } from '../../modules/maintenance-intelligence/adapters/openai-ai.adapter.ts';
import type { AIProviderPort } from '../../modules/maintenance-intelligence/ports/ai-provider.port.ts';
import type { StructuredExtractionPort } from '../../modules/maintenance-intelligence/ports/structured-extraction.port.ts';
import { DemoSeeder } from '../database/demo-seed.ts';
import { getDemoDashboardHtml } from './demo-web-ui.ts';
import { ObdDiagnosticsService, ObdError, ObdSecurityError } from '@automotors/obd-core';
import { TechnicalIdentificationEngine } from '../../modules/maintenance-intelligence/domain/technical-identification-engine.ts';

const WORKSHOP_VEHICLE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface HttpAppDependencies {
  db: DatabaseInstance;
  jwtSecret?: string;
  aiProvider?: AIProviderPort & StructuredExtractionPort;
}

export class HttpApp {
  private readonly db: DatabaseInstance;
  private readonly tokenService: TokenService;
  private readonly sessionService: SessionService;
  private readonly routeRegistry: RoutePrivacyRegistry;
  private readonly authGuard: AuthenticationGuard;
  private readonly tenantGuard: TenantGuard;
  private readonly passwordService: PasswordService;

  // Repositories
  private readonly vehicleRepo: PostgresVehicleRepository;
  private readonly workOrderRepo: PostgresWorkOrderRepository;
  private readonly customerRepo: PostgresCustomerRepository;
  private readonly historyRepo: PostgresMaintenanceHistoryRepository;
  private readonly userRepo: PostgresUserRepository;
  private readonly unitOfWork: PostgresUnitOfWork;
  private readonly kbRepo: PostgresKnowledgeBaseRepository;
  private readonly techIdentificationEngine: TechnicalIdentificationEngine;

  // Use cases
  private readonly createVehicleUseCase: CreateVehicleUseCase;
  private readonly createWorkOrderUseCase: CreateWorkOrderUseCase;
  private readonly closeWorkOrderUseCase: CloseWorkOrderUseCase;
  private readonly quickServiceUseCase: QuickServiceUseCase;
  private readonly getPassportUseCase: GetVehiclePassportUseCase;
  private readonly calcPreventiveUseCase: CalculatePreventiveDueUseCase;
  private readonly aiProvider: AIProviderPort & StructuredExtractionPort;
  private readonly summarizeHistoryUseCase: SummarizeHistoryUseCase;
  private readonly explainMaintenanceUseCase: ExplainMaintenanceUseCase;
  private readonly obd2UseCase: InterpretObd2UseCase;
  private readonly obdService: ObdDiagnosticsService;

  /**
   * Resolves the JWT signing secret from the environment.
   * SECURITY: a secret committed to the repository must never sign tokens outside local
   * development/tests; otherwise anyone could forge tokens (including platform SUPER_ADMIN).
   */
  private static resolveJwtSecret(): string {
    const configured = process.env.JWT_SECRET;
    if (configured && configured.length >= 32) {
      return configured;
    }
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be configured with at least 32 characters in production.');
    }
    // Development/test-only fallback. Never valid in production (guarded above).
    return 'production-grade-super-secret-key-automotors-32-chars';
  }

  constructor(deps: HttpAppDependencies) {
    this.db = deps.db;
    const jwtSecret = deps.jwtSecret ?? HttpApp.resolveJwtSecret();
    this.tokenService = new TokenService(jwtSecret, 3600);
    this.passwordService = new PasswordService();

    const sessionRepo = new PostgresSessionRepository(this.db);
    this.sessionService = new SessionService(sessionRepo);

    this.routeRegistry = new RoutePrivacyRegistry();
    // Register Public Routes
    this.routeRegistry.registerPublicRoute('/', 'GET');
    this.routeRegistry.registerPublicRoute('/demo', 'GET');
    this.routeRegistry.registerPublicRoute('/health/live', 'GET');
    this.routeRegistry.registerPublicRoute('/health/ready', 'GET');
    this.routeRegistry.registerPublicRoute('/api/v1/ai/status', 'GET');
    this.routeRegistry.registerPublicRoute('/api/v1/auth/login', 'POST');
    this.routeRegistry.registerPublicRoute('/api/v1/auth/register', 'POST');
    this.routeRegistry.registerPublicRoute('/api/v1/demo/seed', 'POST');
    this.routeRegistry.registerPublicRoute('/api/v1/vehicles/:id/passport', 'GET'); // Public view sanitized
    this.routeRegistry.registerPublicRoute('/api/v1/kb/*', 'GET');
    this.routeRegistry.registerPublicRoute('/api/v1/kb/identify', 'POST');

    this.authGuard = new AuthenticationGuard(this.tokenService, this.sessionService, this.routeRegistry);
    this.tenantGuard = new TenantGuard();

    this.vehicleRepo = new PostgresVehicleRepository(this.db);
    this.workOrderRepo = new PostgresWorkOrderRepository(this.db);
    this.customerRepo = new PostgresCustomerRepository(this.db);
    this.historyRepo = new PostgresMaintenanceHistoryRepository(this.db);
    this.userRepo = new PostgresUserRepository(this.db);
    this.unitOfWork = new PostgresUnitOfWork(this.db);
    this.kbRepo = new PostgresKnowledgeBaseRepository(this.db);
    this.techIdentificationEngine = new TechnicalIdentificationEngine(this.kbRepo);

    this.createVehicleUseCase = new CreateVehicleUseCase(this.vehicleRepo);
    this.createWorkOrderUseCase = new CreateWorkOrderUseCase(
      this.workOrderRepo,
      this.vehicleRepo,
      this.customerRepo
    );
    this.closeWorkOrderUseCase = new CloseWorkOrderUseCase(
      this.workOrderRepo,
      this.vehicleRepo,
      this.historyRepo,
      undefined,
      this.unitOfWork
    );
    this.quickServiceUseCase = new QuickServiceUseCase(
      this.vehicleRepo,
      this.workOrderRepo,
      this.customerRepo,
      this.closeWorkOrderUseCase
    );
    this.getPassportUseCase = new GetVehiclePassportUseCase(this.vehicleRepo, this.historyRepo);
    this.calcPreventiveUseCase = new CalculatePreventiveDueUseCase();

    this.aiProvider =
      deps.aiProvider ??
      new OpenAIAIAdapter({
        apiKey: process.env.OPENAI_API_KEY,
        model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
      });
    this.summarizeHistoryUseCase = new SummarizeHistoryUseCase(this.aiProvider);
    this.explainMaintenanceUseCase = new ExplainMaintenanceUseCase(this.aiProvider);
    this.obd2UseCase = new InterpretObd2UseCase(this.aiProvider);
    this.obdService = new ObdDiagnosticsService();
  }

  private sendJson(res: ServerResponse, statusCode: number, data: unknown, requestId?: string): void {
    const securityHeadersService = new SecurityHeadersService({ isProduction: false, allowedOrigins: ['*'] });
    const headers = securityHeadersService.getSecurityHeaders();
    for (const [k, v] of Object.entries(headers)) {
      res.setHeader(k, v);
    }
    if (requestId) {
      res.setHeader('x-request-id', requestId);
    }
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-tenant-id, x-request-id');
    res.statusCode = statusCode;
    res.end(JSON.stringify(data));
  }

  private sendHtml(res: ServerResponse, statusCode: number, html: string, requestId?: string): void {
    if (requestId) {
      res.setHeader('x-request-id', requestId);
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.statusCode = statusCode;
    res.end(html);
  }

  private async parseBody(req: IncomingMessage): Promise<Record<string, any>> {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => {
        if (!body || body.trim().length === 0) return resolve({});
        try {
          resolve(JSON.parse(body));
        } catch {
          reject(new Error('Invalid JSON payload.'));
        }
      });
      req.on('error', reject);
    });
  }

  private log(level: 'INFO' | 'WARN' | 'ERROR', message: string, metadata: Record<string, unknown> = {}): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...metadata,
    };
    // Structured JSON log output (credentials and tokens are excluded by design)
    console.log(JSON.stringify(logEntry));
  }

  public async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const startMs = Date.now();
    const method = req.method?.toUpperCase() ?? 'GET';
    const parsedUrl = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    const pathname = parsedUrl.pathname;
    const rawRequestId = req.headers['x-request-id'];
    const requestId = typeof rawRequestId === 'string' && rawRequestId.trim().length > 0
      ? rawRequestId.trim()
      : crypto.randomUUID();

    if (method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-tenant-id, x-request-id');
      res.statusCode = 204;
      res.end();
      return;
    }

    try {
      // 0. Static Frontend UI Serving
      if ((pathname === '/' || pathname === '/demo') && method === 'GET') {
        const html = getDemoDashboardHtml();
        this.sendHtml(res, 200, html, requestId);
        this.log('INFO', 'Served Demo Web UI', { requestId, durationMs: Date.now() - startMs });
        return;
      }

      // 1. Healthcheck & Readiness Checks
      if (pathname === '/health/live') {
        return this.sendJson(res, 200, { status: 'UP', timestamp: new Date().toISOString() }, requestId);
      }

      if (pathname === '/health/ready') {
        const dbHealth = await DatabaseFactory.checkHealth(this.db);
        if (dbHealth.isHealthy) {
          return this.sendJson(
            res,
            200,
            { status: 'READY', database: 'HEALTHY', latencyMs: dbHealth.latencyMs },
            requestId
          );
        } else {
          return this.sendJson(
            res,
            503,
            { status: 'UNHEALTHY', database: 'DOWN', error: dbHealth.error },
            requestId
          );
        }
      }

      // 2. Demo Seed Endpoint (Blocked in Production)
      if (pathname === '/api/v1/demo/seed' && method === 'POST') {
        if (process.env.NODE_ENV === 'production') {
          return this.sendJson(res, 403, { error: 'Seeding demo data is prohibited in production.' }, requestId);
        }
        const seeder = new DemoSeeder(this.db);
        const seedResult = await seeder.seed();
        this.log('INFO', 'Demo seed executed successfully', { requestId, seedResult });
        return this.sendJson(res, 200, { message: 'Demo data seeded successfully.', seedResult }, requestId);
      }

      // AI: Configuration & Availability Status
      if (pathname === '/api/v1/ai/status' && method === 'GET') {
        const isConfigured = this.aiProvider.isConfigured();
        return this.sendJson(
          res,
          200,
          {
            isConfigured,
            providerName: this.aiProvider.getProviderName(),
            model: this.aiProvider.getModelVersion(),
            message: isConfigured
              ? 'Servicio de IA activo y configurado.'
              : 'El servicio de IA no está configurado (falta API key). Las funciones operan en modo determinista sin asistencia de IA.',
          },
          requestId
        );
      }

      // Convert Node headers to record
      const headersRecord: Record<string, string> = {};
      for (const [k, v] of Object.entries(req.headers)) {
        if (typeof v === 'string') headersRecord[k.toLowerCase()] = v;
      }

      // Support HttpOnly session cookie as alternative to Bearer header
      if (!headersRecord['authorization'] && headersRecord['cookie']) {
        const match = headersRecord['cookie'].match(/automotors_session=([^;]+)/);
        if (match && match[1]) {
          headersRecord['authorization'] = `Bearer ${decodeURIComponent(match[1])}`;
        }
      }

      let checkPath = pathname;
      if (pathname.match(/^\/api\/v1\/vehicles\/[^/]+\/passport$/)) {
        checkPath = '/api/v1/vehicles/:id/passport';
      }

      const reqContext: any = {
        path: checkPath,
        method,
        headers: headersRecord,
        query: Object.fromEntries(parsedUrl.searchParams),
      };

      // 3. Authentication Guard (with persisted session hydration)
      await this.authGuard.canActivateAsync(reqContext);

      // A token selects an identity and workshop; only current server-side state grants access.
      let currentMembership: UserWorkshopMembership | null = null;
      if (reqContext.principal) {
        const principal = reqContext.principal;
        const session = await this.sessionService.assertActivePersisted(principal.sessionId);
        if (session.userId !== principal.id) {
          return this.sendJson(res, 403, { error: 'Access forbidden.' }, requestId);
        }
        const user = await this.userRepo.findById(principal.id);
        if (!user?.isActive) {
          return this.sendJson(res, 403, { error: 'Access forbidden.' }, requestId);
        }
        if (principal.activeTenantId) {
          currentMembership = await this.userRepo.verifyMembership(principal.id, principal.activeTenantId);
          if (!currentMembership) {
            return this.sendJson(res, 403, { error: 'Access forbidden.' }, requestId);
          }
        }
      }

      // 3b. AUTH: REGISTER VEHICLE OWNER (MI AUTOMOTORS)
      if (pathname === '/api/v1/auth/register' && method === 'POST') {
        const body = await this.parseBody(req);
        const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';
        const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
        const password = typeof body.password === 'string' ? body.password : '';
        const phone = typeof body.phone === 'string' ? body.phone.trim() : undefined;

        if (!fullName || fullName.length < 2) {
          return this.sendJson(res, 400, { error: 'El nombre completo es obligatorio (mínimo 2 caracteres).' }, requestId);
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) {
          return this.sendJson(res, 400, { error: 'Ingresá un correo electrónico válido.' }, requestId);
        }
        if (!password || password.length < 8) {
          return this.sendJson(res, 400, { error: 'La contraseña debe tener al menos 8 caracteres.' }, requestId);
        }

        const existingUser = await this.userRepo.findByEmail(email);
        if (existingUser) {
          return this.sendJson(
            res,
            409,
            { error: 'Ya existe una cuenta registrada con este correo electrónico.' },
            requestId
          );
        }

        const passwordHash = await this.passwordService.hash(password);
        const createdUser = await this.userRepo.createUser({
          email,
          passwordHash,
          fullName,
          phone,
        });

        const session = await this.sessionService.createSessionPersisted(
          createdUser.id,
          null,
          60 * 24,
          { ipAddress: req.socket.remoteAddress, userAgent: req.headers['user-agent'] }
        );

        const permissions = ['OWNER_PORTAL_ACCESS', 'READ', 'UPDATE', 'CREATE', 'CALCULATE_PREVENTIVE'];
        const token = this.tokenService.generateAccessToken({
          sub: createdUser.id,
          email: createdUser.email,
          tenantId: null,
          role: 'VEHICLE_OWNER',
          permissions,
          sessionId: session.id,
        });

        this.log('INFO', 'Vehicle owner registered successfully in Mi Automotors', {
          userId: createdUser.id,
          requestId,
        });

        return this.sendJson(
          res,
          201,
          {
            token,
            session: {
              id: session.id,
              expiresAt: session.expiresAt,
              activeTenantId: null,
            },
            user: {
              id: createdUser.id,
              email: createdUser.email,
              fullName: createdUser.fullName,
              phone: createdUser.phone ?? null,
              role: 'VEHICLE_OWNER',
              accountType: 'VEHICLE_OWNER',
              profiles: ['VEHICLE_OWNER'],
              workshops: [],
            },
          },
          requestId
        );
      }

      // 4. AUTH: LOGIN
      if (pathname === '/api/v1/auth/login' && method === 'POST') {
        const body = await this.parseBody(req);
        const { email, password, workshopId } = body;

        if (!email || !password) {
          return this.sendJson(res, 400, { error: 'Email and password are required.' }, requestId);
        }

        // Verify credentials via UserRepository
        const user = await this.userRepo.findByEmail(email);
        if (!user || !user.isActive) {
          this.log('WARN', 'Authentication failure: user not found or inactive', { email, requestId });
          return this.sendJson(res, 401, { error: 'Invalid email or password.' }, requestId);
        }

        const isPasswordValid = await this.passwordService.verify(password, user.passwordHash);
        if (!isPasswordValid) {
          this.log('WARN', 'Authentication failure: invalid password', { email, requestId });
          return this.sendJson(res, 401, { error: 'Invalid email or password.' }, requestId);
        }

        // Retrieve user's workshop memberships
        const memberships = await this.userRepo.getUserMemberships(user.id);
        const hasWorkshops = memberships.length > 0;
        const targetWorkshop = hasWorkshops
          ? (workshopId ? memberships.find((m) => m.workshopId === workshopId) ?? memberships[0] : memberships[0])
          : undefined;

        const activeTenantId = targetWorkshop ? targetWorkshop.workshopId : null;
        const role = targetWorkshop ? targetWorkshop.role : 'VEHICLE_OWNER';
        const permissions = targetWorkshop
          ? targetWorkshop.permissions
          : ['OWNER_PORTAL_ACCESS', 'READ', 'UPDATE', 'CREATE', 'CALCULATE_PREVENTIVE'];
        const accountType = hasWorkshops ? 'WORKSHOP_USER' : 'VEHICLE_OWNER';
        const profiles = hasWorkshops ? ['WORKSHOP_USER', 'VEHICLE_OWNER'] : ['VEHICLE_OWNER'];

        const session = await this.sessionService.createSessionPersisted(
          user.id,
          activeTenantId,
          60 * 24,
          { ipAddress: req.socket.remoteAddress, userAgent: req.headers['user-agent'] }
        );

        const token = this.tokenService.generateAccessToken({
          sub: user.id,
          email: user.email,
          tenantId: activeTenantId,
          role,
          permissions,
          sessionId: session.id,
        });

        this.log('INFO', 'User authenticated successfully', { userId: user.id, activeTenantId, accountType, requestId });

        return this.sendJson(
          res,
          200,
          {
            token,
            session: {
              id: session.id,
              expiresAt: session.expiresAt,
              activeTenantId: session.activeTenantId,
            },
            user: {
              id: user.id,
              email: user.email,
              fullName: user.fullName,
              phone: user.phone ?? null,
              role,
              accountType,
              profiles,
              workshops: memberships.map((m) => ({ id: m.workshopId, name: m.workshopName, role: m.role })),
            },
          },
          requestId
        );
      }

      // 5. AUTH: CURRENT USER & MEMBERSHIPS (ME)
      if (pathname === '/api/v1/auth/me' && method === 'GET') {
        const principal = reqContext.principal;
        const [userRecord, memberships] = await Promise.all([
          this.userRepo.findById(principal.id),
          this.userRepo.getUserMemberships(principal.id),
        ]);
        const hasWorkshops = memberships.length > 0;
        const activeMembership = memberships.find((m) => m.workshopId === principal.activeTenantId) ?? memberships[0];
        const role = hasWorkshops ? (activeMembership?.role ?? 'MECHANIC') : 'VEHICLE_OWNER';
        const accountType = hasWorkshops ? 'WORKSHOP_USER' : 'VEHICLE_OWNER';
        const profiles = hasWorkshops ? ['WORKSHOP_USER', 'VEHICLE_OWNER'] : ['VEHICLE_OWNER'];

        return this.sendJson(
          res,
          200,
          {
            user: {
              id: principal.id,
              email: principal.email,
              fullName: userRecord?.fullName ?? principal.email,
              phone: userRecord?.phone ?? null,
              role,
              accountType,
              profiles,
            },
            sessionId: principal.sessionId,
            activeTenantId: principal.activeTenantId,
            workshops: memberships,
          },
          requestId
        );
      }

      // 6. AUTH: SELECT WORKSHOP (SWITCH TENANT)
      if (pathname === '/api/v1/auth/select-workshop' && method === 'POST') {
        const body = await this.parseBody(req);
        const { workshopId } = body;
        const principal = reqContext.principal;

        if (!workshopId) {
          return this.sendJson(res, 400, { error: 'workshopId is required.' }, requestId);
        }

        const membership = await this.userRepo.verifyMembership(principal.id, workshopId);
        if (!membership) {
          return this.sendJson(res, 403, { error: `User is not a member of workshop '${workshopId}'.` }, requestId);
        }

        const newToken = this.tokenService.generateAccessToken({
          sub: principal.id,
          email: principal.email,
          tenantId: workshopId,
          role: membership.role,
          permissions: membership.permissions,
          sessionId: principal.sessionId,
        });

        return this.sendJson(res, 200, { token: newToken, activeTenantId: workshopId }, requestId);
      }

      // 7. AUTH: REVOKE SESSION
      if (pathname.startsWith('/api/v1/auth/sessions/') && method === 'DELETE') {
        const rawSessionId = pathname.split('/').pop()!;
        const principal = reqContext.principal;
        const targetSessionId =
          rawSessionId === 'current' && principal?.sessionId ? principal.sessionId : rawSessionId;

        if (principal && targetSessionId !== principal.sessionId) {
          const existingSession = this.sessionService.getSession(targetSessionId);
          if (existingSession && existingSession.userId !== principal.id) {
            return this.sendJson(res, 403, { error: 'Cannot revoke a session belonging to another user.' }, requestId);
          }
        }

        await this.sessionService.revokeSession(targetSessionId);
        this.log('INFO', 'Session revoked', { sessionId: targetSessionId, requestId });
        return this.sendJson(res, 200, { message: `Session '${targetSessionId}' revoked successfully.` }, requestId);
      }

      // =======================================================================
      // KNOWLEDGE BASE — AUTOMOTORS VEHICLE KNOWLEDGE BASE
      // =======================================================================
      // GET /api/v1/kb/manufacturers
      if (pathname === '/api/v1/kb/manufacturers' && method === 'GET') {
        const list = await this.kbRepo.listManufacturers();
        return this.sendJson(res, 200, list, requestId);
      }

      // GET /api/v1/kb/models
      if (pathname === '/api/v1/kb/models' && method === 'GET') {
        const manufacturerId = parsedUrl.searchParams.get('manufacturerId') ?? undefined;
        const list = await this.kbRepo.listModels(manufacturerId);
        return this.sendJson(res, 200, list, requestId);
      }

      // GET /api/v1/kb/generations
      if (pathname === '/api/v1/kb/generations' && method === 'GET') {
        const modelId = parsedUrl.searchParams.get('modelId');
        if (!modelId) {
          return this.sendJson(res, 400, { error: 'modelId is required.' }, requestId);
        }
        const list = await this.kbRepo.listGenerations(modelId);
        return this.sendJson(res, 200, list, requestId);
      }

      // GET /api/v1/kb/configurations
      if (pathname === '/api/v1/kb/configurations' && method === 'GET') {
        const make = parsedUrl.searchParams.get('make') ?? undefined;
        const model = parsedUrl.searchParams.get('model') ?? undefined;
        const year = parsedUrl.searchParams.get('year') ? Number(parsedUrl.searchParams.get('year')) : undefined;
        const market = parsedUrl.searchParams.get('market') ?? undefined;
        const list = await this.kbRepo.searchConfigurations({ make, model, year, market });
        return this.sendJson(res, 200, list, requestId);
      }

      // GET /api/v1/kb/configurations/:id/specs
      const kbSpecsMatch = pathname.match(/^\/api\/v1\/kb\/configurations\/([^/]+)\/specs$/);
      if (kbSpecsMatch && method === 'GET') {
        const configId = kbSpecsMatch[1]!;
        const specs = await this.kbRepo.listTechnicalSpecs(configId);
        return this.sendJson(res, 200, specs, requestId);
      }

      // GET /api/v1/kb/configurations/:id/rules
      const kbRulesMatch = pathname.match(/^\/api\/v1\/kb\/configurations\/([^/]+)\/rules$/);
      if (kbRulesMatch && method === 'GET') {
        const configId = kbRulesMatch[1]!;
        const onlyVerified = parsedUrl.searchParams.get('verified') === 'true';
        const rules = await this.kbRepo.listRulesByConfiguration(configId, { onlyActive: true, onlyVerified });
        return this.sendJson(res, 200, rules, requestId);
      }

      // GET /api/v1/kb/configurations/:id
      const kbConfigDetailMatch = pathname.match(/^\/api\/v1\/kb\/configurations\/([^/]+)$/);
      if (kbConfigDetailMatch && method === 'GET') {
        const configId = kbConfigDetailMatch[1]!;
        const config = await this.kbRepo.findConfigurationById(configId);
        if (!config) {
          return this.sendJson(res, 404, { error: 'Configuration not found.' }, requestId);
        }
        const specs = await this.kbRepo.listTechnicalSpecs(configId);
        const rules = await this.kbRepo.listRulesByConfiguration(configId, { onlyActive: true });
        return this.sendJson(res, 200, { ...config, specs, rules }, requestId);
      }

      // POST /api/v1/kb/identify
      if (pathname === '/api/v1/kb/identify' && method === 'POST') {
        const body = await this.parseBody(req);
        const result = await this.techIdentificationEngine.identify(body as any);
        return this.sendJson(res, 200, result, requestId);
      }

      // POST /api/v1/kb/rules/:id/verify (Restricted/Authenticated - ONLY PLATFORM SUPER_ADMIN)
      const kbVerifyMatch = pathname.match(/^\/api\/v1\/kb\/rules\/([^/]+)\/verify$/);
      if (kbVerifyMatch && method === 'POST') {
        const principal = reqContext.principal;
        if (!principal) {
          return this.sendJson(res, 401, { error: 'Authentication required.' }, requestId);
        }
        const isSuperAdmin =
          principal.isPlatformSuperAdmin === true && principal.activeTenantId === null;
        if (!isSuperAdmin) {
          return this.sendJson(
            res,
            403,
            { error: 'Forbidden: Solamente administradores globales (SUPER_ADMIN) están autorizados a verificar reglas del catálogo técnico compartido.' },
            requestId
          );
        }
        const ruleId = kbVerifyMatch[1]!;
        const body = await this.parseBody(req);
        try {
          const verified = await this.kbRepo.verifyRule({
            ruleId,
            verifierUserId: principal.id,
            notes: body.notes,
          });
          return this.sendJson(res, 200, verified, requestId);
        } catch (err: any) {
          return this.sendJson(res, 404, { error: err.message }, requestId);
        }
      }

      // POST /api/v1/kb/rules/:id/revision (Restricted/Authenticated - ONLY PLATFORM SUPER_ADMIN)
      const kbRevisionMatch = pathname.match(/^\/api\/v1\/kb\/rules\/([^/]+)\/revision$/);
      if (kbRevisionMatch && method === 'POST') {
        const principal = reqContext.principal;
        if (!principal) {
          return this.sendJson(res, 401, { error: 'Authentication required.' }, requestId);
        }
        const isSuperAdmin =
          principal.isPlatformSuperAdmin === true && principal.activeTenantId === null;
        if (!isSuperAdmin) {
          return this.sendJson(
            res,
            403,
            { error: 'Forbidden: Solamente administradores globales (SUPER_ADMIN) están autorizados a crear revisiones de reglas técnicas del catálogo compartido.' },
            requestId
          );
        }
        const ruleId = kbRevisionMatch[1]!;
        const body = await this.parseBody(req);
        try {
          const newRev = await this.kbRepo.createRuleRevision({
            ruleId,
            changes: body.changes ?? body,
            actorUserId: principal.id,
            autoVerify: body.autoVerify ?? false,
          });
          return this.sendJson(res, 201, newRev, requestId);
        } catch (err: any) {
          return this.sendJson(res, 400, { error: err.message }, requestId);
        }
      }

      // VEHICLES: PASSPORT (Public or Authenticated View)
      const passportMatch = pathname.match(/^\/api\/v1\/vehicles\/([^/]+)\/passport$/);
      if (passportMatch && method === 'GET') {
        const vehicleId = passportMatch[1]!;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(vehicleId)) {
          const targetVehicle = await this.vehicleRepo.findById(vehicleId);
          if (targetVehicle?.ownerId && reqContext.principal?.id !== targetVehicle.ownerId) {
            return this.sendJson(
              res,
              403,
              { error: 'Access forbidden: private owner vehicle passport is not shared publicly.' },
              requestId
            );
          }
        }
        const isPublic = parsedUrl.searchParams.get('public') === 'true';
        const result = await this.getPassportUseCase.execute({ vehicleId, isPublicView: isPublic });
        if (result.isFailure) {
          return this.sendJson(res, 404, { error: result.getError() }, requestId);
        }
        return this.sendJson(res, 200, result.getValue(), requestId);
      }

      // =======================================================================
      // 7b. MI AUTOMOTORS — OWNER PORTAL ENDPOINTS (Resource-Scoped by principal.id)
      // =======================================================================
      if (pathname.startsWith('/api/v1/owner/')) {
        const principal = reqContext.principal;
        if (!principal) {
          return this.sendJson(res, 401, { error: 'Authentication required.' }, requestId);
        }

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

        // Helper to serialize an owner vehicle with its technical profile
        const serializeOwnerVehicle = (v: Vehicle) => {
          const specs = (v.technicalSpecs ?? {}) as Record<string, unknown>;
          const kbProfile = VehicleKnowledgeBase.findProfile({
            make: v.make,
            model: v.model,
            year: v.year,
            engine: v.engine,
            technicalSpecs: specs,
          });
          return {
            id: v.id,
            vin: v.vin ?? null,
            plate: v.plate ?? null,
            make: v.make,
            model: v.model,
            year: v.year,
            engine: v.engine ?? null,
            fuelType: v.fuelType ?? 'Nafta Super',
            currentMileage: v.currentMileage,
            ownerUserId: v.ownerId ?? principal.id,
            configurationId: v.configurationId ?? null,
            transmission:
              (specs.transmission as string) ??
              kbProfile?.transmission ??
              'No especificada',
            distributionType:
              (specs.distributionType as string) ??
              kbProfile?.distributionType ??
              'DESCONOCIDO',
            exactEngineCode:
              (specs.exactEngineCode as string) ??
              kbProfile?.exactEngineCodeNote ??
              'Pendiente de confirmación documental',
            technicalProfile: kbProfile
              ? {
                  profileId: kbProfile.profileId,
                  exactEngineCodeStatus: kbProfile.exactEngineCodeStatus,
                  exactEngineCodeNote: kbProfile.exactEngineCodeNote,
                  transmission: kbProfile.transmission,
                  distributionType: kbProfile.distributionType,
                  distributionNote: kbProfile.distributionNote,
                  isProfileComplete: kbProfile.isProfileComplete,
                }
              : null,
          };
        };

        // OWNER PROFILE: GET & PUT
        if (pathname === '/api/v1/owner/profile' && method === 'GET') {
          const [userRecord, memberships, ownedVehicles] = await Promise.all([
            this.userRepo.findById(principal.id),
            this.userRepo.getUserMemberships(principal.id),
            this.vehicleRepo.findByOwnerUserId(principal.id),
          ]);
          if (!userRecord) {
            return this.sendJson(res, 404, { error: 'User profile not found.' }, requestId);
          }
          const hasWorkshops = memberships.length > 0;
          return this.sendJson(
            res,
            200,
            {
              id: userRecord.id,
              email: userRecord.email,
              fullName: userRecord.fullName,
              phone: userRecord.phone ?? null,
              createdAt: userRecord.createdAt?.toISOString() ?? null,
              accountType: hasWorkshops ? 'WORKSHOP_USER' : 'VEHICLE_OWNER',
              profiles: hasWorkshops ? ['WORKSHOP_USER', 'VEHICLE_OWNER'] : ['VEHICLE_OWNER'],
              vehiclesCount: ownedVehicles.length,
            },
            requestId
          );
        }

        if (pathname === '/api/v1/owner/profile' && method === 'PUT') {
          const body = await this.parseBody(req);
          if (body.fullName !== undefined && String(body.fullName).trim().length < 2) {
            return this.sendJson(res, 400, { error: 'El nombre completo debe tener al menos 2 caracteres.' }, requestId);
          }
          const updated = await this.userRepo.updateProfile(principal.id, {
            fullName: body.fullName,
            phone: body.phone,
          });
          if (!updated) {
            return this.sendJson(res, 404, { error: 'User profile not found.' }, requestId);
          }
          return this.sendJson(
            res,
            200,
            {
              id: updated.id,
              email: updated.email,
              fullName: updated.fullName,
              phone: updated.phone ?? null,
            },
            requestId
          );
        }

        // OWNER VEHICLES: LIST (MI GARAJE)
        if (pathname === '/api/v1/owner/vehicles' && method === 'GET') {
          const ownedVehicles = await this.vehicleRepo.findByOwnerUserId(principal.id);
          return this.sendJson(
            res,
            200,
            ownedVehicles.map(serializeOwnerVehicle),
            requestId
          );
        }

        // OWNER VEHICLES: REGISTER IN MI GARAJE
        if (pathname === '/api/v1/owner/vehicles' && method === 'POST') {
          const body = await this.parseBody(req);
          const make = typeof body.make === 'string' ? body.make.trim() : '';
          const model = typeof body.model === 'string' ? body.model.trim() : '';
          const year = Number(body.year);
          const currentMileage = Number(body.currentMileage ?? 0);
          const rawPlate = typeof body.plate === 'string' ? body.plate.trim().toUpperCase().replace(/[^A-Z0-9]/g, '') : '';
          const rawVin = typeof body.vin === 'string' && body.vin.trim().length > 0
            ? body.vin.trim().toUpperCase()
            : undefined;

          if (!make || !model || Number.isNaN(year) || !rawPlate) {
            return this.sendJson(
              res,
              400,
              { error: 'Marca, modelo, año y patente son obligatorios para registrar un vehículo en Mi Garaje.' },
              requestId
            );
          }
          if (Number.isNaN(currentMileage) || currentMileage < 0) {
            return this.sendJson(res, 400, { error: 'El kilometraje actual no puede ser negativo.' }, requestId);
          }
          if (rawVin && (rawVin.length < 8 || rawVin.length > 17)) {
            return this.sendJson(res, 400, { error: 'El código VIN debe contener entre 8 y 17 caracteres alfanuméricos.' }, requestId);
          }

          // SECURITY INVARIANT: Knowing or registering an existing VIN or Plate must NEVER grant access
          // to another person's or workshop's private vehicle or history.
          if (rawVin) {
            const existingByVin = await this.vehicleRepo.findByVin(rawVin);
            if (existingByVin) {
              return this.sendJson(
                res,
                409,
                {
                  error:
                    'El VIN ingresado ya se encuentra registrado. Por seguridad y privacidad, conocer un VIN no otorga acceso automático al historial de otro titular.',
                },
                requestId
              );
            }
          }

          const existingByPlate = await this.vehicleRepo.findByPlate(rawPlate);
          if (existingByPlate.length > 0) {
            return this.sendJson(
              res,
              409,
              {
                error:
                  'La patente ingresada ya se encuentra registrada. Por seguridad, conocer una patente no vincula ni expone historiales privados de terceros.',
              },
              requestId
            );
          }

          const kbProfile = VehicleKnowledgeBase.findProfile({
            make,
            model,
            year,
            engine: body.engine,
          });

          const vResult = Vehicle.create({
            vin: rawVin,
            plate: rawPlate,
            make,
            model,
            year,
            engine: typeof body.engine === 'string' && body.engine.trim().length > 0 ? body.engine.trim() : undefined,
            fuelType: body.fuelType || 'Nafta Super',
            currentMileage,
            ownerId: principal.id,
            technicalSpecs: {
              isOwnerPortalVehicle: true,
              transmission: body.transmission || kbProfile?.transmission || 'Manual',
              distributionType: body.distributionType || kbProfile?.distributionType || 'DESCONOCIDO',
              exactEngineCode:
                body.exactEngineCode ||
                kbProfile?.exactEngineCodeNote ||
                'Pendiente de confirmación documental',
            },
          });

          if (vResult.isFailure) {
            return this.sendJson(res, 400, { error: vResult.getError() }, requestId);
          }

          const vehicle = vResult.getValue();
          await this.vehicleRepo.save(vehicle);

          return this.sendJson(res, 201, serializeOwnerVehicle(vehicle), requestId);
        }

        // OWNER VEHICLE DETAIL & UPDATE (/api/v1/owner/vehicles/:id)
        const ownerVehicleMatch = pathname.match(/^\/api\/v1\/owner\/vehicles\/([^/]+)$/);
        if (ownerVehicleMatch) {
          const vehicleId = ownerVehicleMatch[1]!;
          if (!uuidRegex.test(vehicleId)) {
            return this.sendJson(res, 404, { error: 'Vehículo no encontrado.' }, requestId);
          }

          const vehicle = await this.vehicleRepo.findById(vehicleId);
          if (!vehicle) {
            return this.sendJson(res, 404, { error: 'Vehículo no encontrado.' }, requestId);
          }
          if (vehicle.ownerId !== principal.id) {
            return this.sendJson(
              res,
              403,
              { error: 'Acceso denegado: no sos el propietario autorizado de este vehículo.' },
              requestId
            );
          }

          if (method === 'GET') {
            return this.sendJson(res, 200, serializeOwnerVehicle(vehicle), requestId);
          }

          if (method === 'PUT') {
            const body = await this.parseBody(req);
            let targetMileage = vehicle.currentMileage;
            if (body.currentMileage !== undefined) {
              const parsedMileage = Number(body.currentMileage);
              if (Number.isNaN(parsedMileage) || parsedMileage < 0) {
                return this.sendJson(res, 400, { error: 'El kilometraje debe ser un número válido.' }, requestId);
              }
              const mileageRes = vehicle.updateMileage(parsedMileage);
              if (mileageRes.isFailure) {
                return this.sendJson(res, 400, { error: mileageRes.getError() }, requestId);
              }
              targetMileage = parsedMileage;
            }

            const currentSpecs = (vehicle.technicalSpecs ?? {}) as Record<string, unknown>;
            const updatedVehicleRes = Vehicle.create(
              {
                vin: vehicle.vin,
                plate: body.plate !== undefined ? String(body.plate).trim().toUpperCase() : vehicle.plate,
                make: body.make !== undefined ? String(body.make).trim() : vehicle.make,
                model: body.model !== undefined ? String(body.model).trim() : vehicle.model,
                year: body.year !== undefined ? Number(body.year) : vehicle.year,
                engine: body.engine !== undefined ? String(body.engine).trim() : vehicle.engine,
                fuelType: (body.fuelType ?? vehicle.fuelType) as any,
                currentMileage: targetMileage,
                ownerId: principal.id,
                technicalSpecs: {
                  ...currentSpecs,
                  ...(body.transmission !== undefined ? { transmission: body.transmission } : {}),
                  ...(body.distributionType !== undefined ? { distributionType: body.distributionType } : {}),
                },
              },
              vehicle.id
            );

            if (updatedVehicleRes.isFailure) {
              return this.sendJson(res, 400, { error: updatedVehicleRes.getError() }, requestId);
            }

            const updatedVehicle = updatedVehicleRes.getValue();
            await this.vehicleRepo.save(updatedVehicle);
            return this.sendJson(res, 200, serializeOwnerVehicle(updatedVehicle), requestId);
          }
        }

        // OWNER VEHICLE HISTORY (/api/v1/owner/vehicles/:id/history)
        const ownerHistoryMatch = pathname.match(/^\/api\/v1\/owner\/vehicles\/([^/]+)\/history$/);
        if (ownerHistoryMatch && method === 'GET') {
          const vehicleId = ownerHistoryMatch[1]!;
          if (!uuidRegex.test(vehicleId)) {
            return this.sendJson(res, 404, { error: 'Vehículo no encontrado.' }, requestId);
          }

          const vehicle = await this.vehicleRepo.findById(vehicleId);
          if (!vehicle) {
            return this.sendJson(res, 404, { error: 'Vehículo no encontrado.' }, requestId);
          }
          if (vehicle.ownerId !== principal.id) {
            return this.sendJson(
              res,
              403,
              { error: 'Acceso denegado: no sos el propietario autorizado de este vehículo.' },
              requestId
            );
          }

          const records = await this.historyRepo.findByVehicleId(vehicle.id);
          const correctionsMap = await this.historyRepo.findCorrectionsByRecordIds(records.map((r) => r.id));

          const timeline = records.map((r) => {
            const firstIntervention = r.interventions[0];
            const totalCost =
              (r.partsCost !== undefined ? r.partsCost : 0) +
              (r.laborCost !== undefined ? r.laborCost : 0);

            return {
              id: r.id,
              vehicleId: r.vehicleId,
              serviceDate: r.serviceDate.toISOString(),
              createdAt: r.createdAt.toISOString(),
              recordedMileage: r.recordedMileage,
              recordedByUserId: r.recordedByUserId ?? null,
              category: firstIntervention?.category ?? 'GENERAL_INSPECTION',
              title: firstIntervention?.title ?? 'Mantenimiento Registrado',
              description:
                firstIntervention?.description ??
                r.interventions.map((i) => i.title).join(', '),
              interventions: r.interventions,
              workshopName: r.performingWorkshopName,
              recordOrigin: r.recordOrigin,
              verificationLevel: r.verificationLevel,
              isCertified: r.isCertified,
              observations: r.internalNotes ?? null,
              cost: totalCost > 0 ? totalCost : null,
              corrections: (correctionsMap[r.id] ?? []).map((c) => ({
                id: c.id,
                actorName: c.actorName,
                reason: c.reason,
                previousData: c.previousData,
                correctedData: c.correctedData,
                createdAt: c.createdAt.toISOString(),
              })),
            };
          });

          return this.sendJson(
            res,
            200,
            {
              vehicle: serializeOwnerVehicle(vehicle),
              totalRecords: timeline.length,
              certifiedCount: timeline.filter((t) => t.isCertified).length,
              declaredCount: timeline.filter((t) => !t.isCertified).length,
              timeline,
            },
            requestId
          );
        }

        // OWNER VEHICLE HISTORY SUMMARY (/api/v1/owner/vehicles/:id/history/summary)
        const ownerSummaryMatch = pathname.match(/^\/api\/v1\/owner\/vehicles\/([^/]+)\/history\/summary$/);
        if (ownerSummaryMatch && method === 'POST') {
          const vehicleId = ownerSummaryMatch[1]!;
          if (!uuidRegex.test(vehicleId)) {
            return this.sendJson(res, 404, { error: 'Vehículo no encontrado.' }, requestId);
          }

          const vehicle = await this.vehicleRepo.findById(vehicleId);
          if (!vehicle) {
            return this.sendJson(res, 404, { error: 'Vehículo no encontrado.' }, requestId);
          }
          if (vehicle.ownerId !== principal.id) {
            return this.sendJson(
              res,
              403,
              { error: 'Acceso denegado: no sos el propietario autorizado de este vehículo.' },
              requestId
            );
          }

          const records = await this.historyRepo.findByVehicleId(vehicle.id);
          const mappedRecords = records.map((r) => ({
            id: r.id,
            serviceDate: r.serviceDate,
            mileage: r.recordedMileage,
            title: r.interventions[0]?.title ?? 'Mantenimiento',
            description: r.interventions.map((i) => i.title).join(', '),
            performedInterventions: r.interventions.map((i) => i.title),
            isVerified: r.isCertified,
            verificationLevel: r.verificationLevel,
            observations: r.internalNotes,
          }));

          const summaryResult = await this.summarizeHistoryUseCase.execute({
            vehicleId: vehicle.id,
            vehicleMake: vehicle.make,
            vehicleModel: vehicle.model,
            vehicleYear: vehicle.year,
            currentMileageKm: vehicle.currentMileage,
            records: mappedRecords,
            userId: principal.id,
          });

          if (summaryResult.isFailure) {
            return this.sendJson(res, 400, { error: summaryResult.getError() }, requestId);
          }

          return this.sendJson(res, 200, summaryResult.getValue(), requestId);
        }

        // OWNER VEHICLE TECHNICAL CONFIGURATION BINDING (/api/v1/owner/vehicles/:id/configuration)
        const ownerConfigBindMatch = pathname.match(/^\/api\/v1\/owner\/vehicles\/([^/]+)\/configuration$/);
        if (ownerConfigBindMatch && method === 'POST') {
          const vehicleId = ownerConfigBindMatch[1]!;
          if (!uuidRegex.test(vehicleId)) {
            return this.sendJson(res, 404, { error: 'Vehículo no encontrado.' }, requestId);
          }
          const vehicle = await this.vehicleRepo.findById(vehicleId);
          if (!vehicle) {
            return this.sendJson(res, 404, { error: 'Vehículo no encontrado.' }, requestId);
          }
          if (vehicle.ownerId !== principal.id) {
            return this.sendJson(
              res,
              403,
              { error: 'Acceso denegado: no sos el propietario autorizado de este vehículo.' },
              requestId
            );
          }
          const body = await this.parseBody(req);
          if (!body.configurationId) {
            return this.sendJson(res, 400, { error: 'El campo configurationId es obligatorio.' }, requestId);
          }
          const config = await this.kbRepo.findConfigurationById(body.configurationId);
          if (!config) {
            return this.sendJson(res, 404, { error: 'Configuración técnica no encontrada en el catálogo.' }, requestId);
          }

          vehicle.setConfigurationId(config.id);
          const currentSpecs = (vehicle.technicalSpecs ?? {}) as Record<string, unknown>;
          vehicle.updateTechnicalSpecs({
            ...currentSpecs,
            configurationId: config.id,
            commercialName: config.commercialName,
            transmission: config.transmission,
            distributionType: config.powertrain?.timingMechanism ?? 'DESCONOCIDO',
            exactEngineCode: config.powertrain?.engineCode ?? 'PENDIENTE_CONFIRMACION',
            isDocumentarilyVerified: config.verificationStatus === 'VERIFIED',
          });
          await this.vehicleRepo.save(vehicle);
          return this.sendJson(res, 200, serializeOwnerVehicle(vehicle), requestId);
        }

        // OWNER MANUAL MAINTENANCE REGISTRATION (/api/v1/owner/vehicles/:id/maintenance)
        const ownerMaintMatch = pathname.match(/^\/api\/v1\/owner\/vehicles\/([^/]+)\/maintenance$/);
        if (ownerMaintMatch && method === 'POST') {
          const vehicleId = ownerMaintMatch[1]!;
          if (!uuidRegex.test(vehicleId)) {
            return this.sendJson(res, 404, { error: 'Vehículo no encontrado.' }, requestId);
          }

          const vehicle = await this.vehicleRepo.findById(vehicleId);
          if (!vehicle) {
            return this.sendJson(res, 404, { error: 'Vehículo no encontrado.' }, requestId);
          }
          if (vehicle.ownerId !== principal.id) {
            return this.sendJson(
              res,
              403,
              { error: 'Acceso denegado: no sos el propietario autorizado de este vehículo.' },
              requestId
            );
          }

          const body = await this.parseBody(req);
          const rawCategory = typeof body.category === 'string' ? body.category.trim() : '';
          const description = typeof body.description === 'string' ? body.description.trim() : '';
          const title = typeof body.title === 'string' && body.title.trim().length > 0
            ? body.title.trim()
            : description;
          const recordedMileage = Number(body.recordedMileage);
          const workshopNameInput = typeof body.workshopName === 'string' ? body.workshopName.trim() : '';
          const observations = typeof body.observations === 'string' ? body.observations.trim() : undefined;
          const cost = body.cost !== undefined && body.cost !== null && body.cost !== ''
            ? Number(body.cost)
            : undefined;

          if (!rawCategory || !description || Number.isNaN(recordedMileage) || recordedMileage < 0) {
            return this.sendJson(
              res,
              400,
              { error: 'Categoría, descripción del trabajo y kilometraje válido son obligatorios.' },
              requestId
            );
          }

          const serviceDate = body.serviceDate ? new Date(body.serviceDate) : new Date();
          if (Number.isNaN(serviceDate.getTime())) {
            return this.sendJson(res, 400, { error: 'Fecha de mantenimiento inválida.' }, requestId);
          }
          if (serviceDate.getTime() > Date.now() + 24 * 60 * 60 * 1000) {
            return this.sendJson(
              res,
              400,
              { error: 'La fecha del mantenimiento realizado no puede estar en el futuro.' },
              requestId
            );
          }

          const normalizedCategory = VehicleKnowledgeBase.normalizeCategory(rawCategory);
          const performingWorkshopName = workshopNameInput
            ? `${workshopNameInput} (Declarado por Propietario)`
            : 'Mantenimiento Personal Declarado por Propietario';

          const recordRes = MaintenanceRecord.create({
            vehicleId: vehicle.id,
            performingTenantId: null,
            performingWorkshopName,
            recordedByUserId: principal.id,
            recordOrigin: 'OWNER_DECLARED',
            serviceDate,
            recordedMileage,
            verificationLevel: VerificationLevel.DECLARED,
            isCertified: false,
            criteriaMet: ['Self-declared by owner without external workshop verification'],
            interventions: [
              {
                title,
                category: normalizedCategory,
                description,
              },
            ],
            evidenceAssetIds: [],
            internalNotes: observations,
            partsCost: cost,
            laborCost: 0,
          });

          if (recordRes.isFailure) {
            return this.sendJson(res, 400, { error: recordRes.getError() }, requestId);
          }

          const record = recordRes.getValue();
          await this.historyRepo.save(record);

          // Advance vehicle currentMileage if the recorded service is higher than current odometer
          if (recordedMileage > vehicle.currentMileage) {
            vehicle.updateMileage(recordedMileage);
            await this.vehicleRepo.save(vehicle);
          }

          return this.sendJson(
            res,
            201,
            {
              id: record.id,
              vehicleId: record.vehicleId,
              serviceDate: record.serviceDate.toISOString(),
              createdAt: record.createdAt.toISOString(),
              recordedMileage: record.recordedMileage,
              recordedByUserId: record.recordedByUserId ?? principal.id,
              category: normalizedCategory,
              title,
              description,
              workshopName: record.performingWorkshopName,
              recordOrigin: record.recordOrigin,
              verificationLevel: record.verificationLevel,
              isCertified: record.isCertified,
              observations: record.internalNotes ?? null,
              cost: record.partsCost ?? null,
            },
            requestId
          );
        }

        // OWNER AUDITED CORRECTION ON MAINTENANCE RECORD (/api/v1/owner/maintenance/:recordId/corrections)
        const ownerCorrectionMatch = pathname.match(/^\/api\/v1\/owner\/maintenance\/([^/]+)\/corrections$/);
        if (ownerCorrectionMatch && method === 'POST') {
          const recordId = ownerCorrectionMatch[1]!;
          if (!uuidRegex.test(recordId)) {
            return this.sendJson(res, 404, { error: 'Registro de mantenimiento no encontrado.' }, requestId);
          }

          const record = await this.historyRepo.findById(recordId);
          if (!record) {
            return this.sendJson(res, 404, { error: 'Registro de mantenimiento no encontrado.' }, requestId);
          }

          const vehicle = await this.vehicleRepo.findById(record.vehicleId);
          if (!vehicle || vehicle.ownerId !== principal.id) {
            return this.sendJson(
              res,
              403,
              { error: 'Acceso denegado: no tenés permisos para corregir este registro.' },
              requestId
            );
          }

          const body = await this.parseBody(req);
          const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
          const correctedData = (body.correctedData ?? {}) as Record<string, any>;

          if (!reason || reason.length < 3) {
            return this.sendJson(
              res,
              400,
              { error: 'Debés indicar el motivo de la corrección auditada (mínimo 3 caracteres).' },
              requestId
            );
          }

          const userRecord = await this.userRepo.findById(principal.id);
          const firstInt = record.interventions[0];
          const previousData: Record<string, unknown> = {
            recordedMileage: record.recordedMileage,
            serviceDate: record.serviceDate.toISOString(),
            category: firstInt?.category ?? 'GENERAL_INSPECTION',
            description: firstInt?.description ?? firstInt?.title ?? '',
            workshopName: record.performingWorkshopName,
            observations: record.internalNotes ?? null,
            cost: record.partsCost ?? null,
          };

          const correctionEntry = await this.historyRepo.addCorrection({
            recordId: record.id,
            actorId: principal.id,
            actorName: userRecord?.fullName ?? principal.email,
            reason,
            previousData,
            correctedData,
          });

          // If record was declared by the owner, update its current fields while preserving the immutable correction log
          if (record.recordOrigin === 'OWNER_DECLARED') {
            const newMileage =
              correctedData.recordedMileage !== undefined
                ? Number(correctedData.recordedMileage)
                : record.recordedMileage;
            const newDate =
              correctedData.serviceDate !== undefined
                ? new Date(correctedData.serviceDate)
                : record.serviceDate;
            const newCategory =
              correctedData.category !== undefined
                ? VehicleKnowledgeBase.normalizeCategory(String(correctedData.category))
                : (firstInt?.category ?? 'GENERAL_INSPECTION');
            const newDescription =
              correctedData.description !== undefined
                ? String(correctedData.description).trim()
                : (firstInt?.description ?? firstInt?.title ?? '');
            const newWorkshop =
              correctedData.workshopName !== undefined
                ? `${String(correctedData.workshopName).trim()} (Declarado por Propietario)`
                : record.performingWorkshopName;
            const newNotes =
              correctedData.observations !== undefined
                ? String(correctedData.observations).trim()
                : record.internalNotes;
            const newCost =
              correctedData.cost !== undefined && correctedData.cost !== null && correctedData.cost !== ''
                ? Number(correctedData.cost)
                : record.partsCost;

            const updatedRecord = MaintenanceRecord.restore(
              {
                vehicleId: record.vehicleId,
                workOrderId: record.workOrderId,
                performingTenantId: null,
                performingWorkshopName: newWorkshop,
                recordedByUserId: principal.id,
                recordOrigin: 'OWNER_DECLARED',
                serviceDate: newDate,
                recordedMileage: newMileage,
                verificationLevel: VerificationLevel.DECLARED,
                isCertified: false,
                criteriaMet: record.criteriaMet,
                interventions: [
                  {
                    title: newDescription,
                    category: newCategory,
                    description: newDescription,
                  },
                ],
                evidenceAssetIds: record.evidenceAssetIds,
                internalNotes: newNotes,
                partsCost: newCost,
                laborCost: 0,
              },
              record.id
            );

            await this.historyRepo.save(updatedRecord);
          }

          return this.sendJson(
            res,
            201,
            {
              correction: {
                id: correctionEntry.id,
                recordId: correctionEntry.recordId,
                actorName: correctionEntry.actorName,
                reason: correctionEntry.reason,
                previousData: correctionEntry.previousData,
                correctedData: correctionEntry.correctedData,
                createdAt: correctionEntry.createdAt.toISOString(),
              },
            },
            requestId
          );
        }

        // OWNER DETERMINISTIC MAINTENANCE PREDICTIONS (/api/v1/owner/vehicles/:id/predictions)
        const ownerPredictMatch = pathname.match(/^\/api\/v1\/owner\/vehicles\/([^/]+)\/predictions$/);
        if (ownerPredictMatch && method === 'GET') {
          const vehicleId = ownerPredictMatch[1]!;
          if (!uuidRegex.test(vehicleId)) {
            return this.sendJson(res, 404, { error: 'Vehículo no encontrado.' }, requestId);
          }

          const vehicle = await this.vehicleRepo.findById(vehicleId);
          if (!vehicle) {
            return this.sendJson(res, 404, { error: 'Vehículo no encontrado.' }, requestId);
          }
          if (vehicle.ownerId !== principal.id) {
            return this.sendJson(
              res,
              403,
              { error: 'Acceso denegado: no sos el propietario autorizado de este vehículo.' },
              requestId
            );
          }

          const records = await this.historyRepo.findByVehicleId(vehicle.id);
          const kbProfile = VehicleKnowledgeBase.findProfile({
            make: vehicle.make,
            model: vehicle.model,
            year: vehicle.year,
            engine: vehicle.engine,
            technicalSpecs: vehicle.technicalSpecs,
          });

          // Also query documented rules from maintenance_intervals table for this make/model
          const dbIntervalRows = await (this.db as any)
            .select()
            .from(maintenanceIntervals)
            .where(
              and(
                ilike(maintenanceIntervals.make, `%${vehicle.make.trim()}%`),
                ilike(maintenanceIntervals.model, `%${vehicle.model.split(' ')[0]!.trim()}%`)
              )
            );

          const ruleMap = new Map<string, ServiceIntervalRule>();
          if (kbProfile) {
            for (const r of kbProfile.intervals) {
              ruleMap.set(r.category, r);
            }
          }
          if (vehicle.configurationId) {
            const kbRules = await this.kbRepo.listRulesByConfiguration(vehicle.configurationId, {
              onlyActive: true,
              onlyVerified: true,
            });
            for (const r of kbRules) {
              const cat = VehicleKnowledgeBase.normalizeCategory(r.category);
              ruleMap.set(cat, {
                id: r.id,
                category: cat,
                title: r.title,
                intervalKm: r.intervalKm ?? 10000,
                intervalMonths: r.intervalMonths ?? 12,
                source: (r.sourceTitle as any) ?? IntervalSource.OEM_MANUAL,
                sourceCitation: r.sourceReference ?? r.sourceTitle ?? 'Manual Oficial OEM',
                severeUsageIntervalKm: r.severeIntervalKm ?? undefined,
                severeUsageIntervalMonths: r.severeIntervalMonths ?? undefined,
                verificationStatus: 'VERIFIED',
              });
            }
          }
          for (const row of dbIntervalRows) {
            const cat = VehicleKnowledgeBase.normalizeCategory(row.category);
            if (!ruleMap.has(cat) && row.intervalKm && row.intervalMonths) {
              ruleMap.set(cat, {
                id: row.id,
                category: cat,
                title: `Mantenimiento Preventivo (${cat})`,
                intervalKm: Number(row.intervalKm),
                intervalMonths: Number(row.intervalMonths),
                source: IntervalSource.OEM_MANUAL,
                sourceCitation: row.sourceCitation,
                verificationStatus: 'VERIFIED',
              });
            }
          }

          // Extract previous services from vehicle maintenance records
          const previousServices: PreviousServiceEntry[] = [];
          for (const rec of records) {
            for (const intv of rec.interventions) {
              previousServices.push({
                serviceDate: rec.serviceDate,
                recordedMileage: rec.recordedMileage,
                category: VehicleKnowledgeBase.normalizeCategory(intv.category || intv.title),
              });
            }
          }

          // Estimate average monthly usage when historical points are available
          let estimatedMonthlyKm: number | undefined;
          if (records.length >= 2) {
            const sortedByDate = [...records].sort((a, b) => a.serviceDate.getTime() - b.serviceDate.getTime());
            const oldest = sortedByDate[0]!;
            const monthsElapsed = Math.max(
              1,
              (Date.now() - oldest.serviceDate.getTime()) / (1000 * 60 * 60 * 24 * 30.4375)
            );
            const kmDelta = vehicle.currentMileage - oldest.recordedMileage;
            if (kmDelta > 0) {
              estimatedMonthlyKm = Math.round(kmDelta / monthsElapsed);
            }
          }

          const engine = new DeterministicMaintenanceEngine();
          const predictions = OWNER_MAINTENANCE_CATEGORIES.map((meta) => {
            const rule = ruleMap.get(meta.category) ?? null;
            const calc = engine.calculate({
              vehicle: {
                id: vehicle.id,
                make: vehicle.make,
                model: vehicle.model,
                year: vehicle.year,
                currentMileage: vehicle.currentMileage,
              },
              rule,
              previousServices,
              odometerReadings: records.map((r) => ({ date: r.serviceDate, mileage: r.recordedMileage })),
              usageConditions: estimatedMonthlyKm ? { averageMonthlyKm: estimatedMonthlyKm } : undefined,
            });

            const lastForCategory = previousServices
              .filter((s) => s.category === meta.category)
              .sort((a, b) => b.serviceDate.getTime() - a.serviceDate.getTime())[0];

            const isInsufficient = calc.status === MaintenanceStatus.INSUFFICIENT_DATA;

            let technicalNote: string | null = null;
            if (meta.category === 'TIMING_BELT' && kbProfile?.distributionType === 'CADENA') {
              technicalNote = kbProfile.distributionNote;
            }

            return {
              category: meta.category,
              label: meta.label,
              shortDescription: meta.shortDescription,
              status: calc.status,
              nextDueMileage: calc.nextDueMileage,
              remainingKm: calc.remainingKm,
              nextDueDate: calc.nextDueDate ? calc.nextDueDate.toISOString() : null,
              estimatedDaysRemaining: calc.estimatedDaysRemaining,
              dueReason: calc.dueReason,
              confidence: calc.confidence,
              sourceCitation: calc.sourceCitation ?? null,
              lastServiceDate: lastForCategory ? lastForCategory.serviceDate.toISOString() : null,
              lastServiceMileage: lastForCategory ? lastForCategory.recordedMileage : null,
              message: isInsufficient ? INSUFFICIENT_DATA_MESSAGE : null,
              technicalNote,
            };
          });

          return this.sendJson(
            res,
            200,
            {
              vehicle: serializeOwnerVehicle(vehicle),
              estimatedMonthlyKm: estimatedMonthlyKm ?? 1250,
              insufficientDataMessage: INSUFFICIENT_DATA_MESSAGE,
              predictions,
            },
            requestId
          );
        }

        // OWNER DETERMINISTIC MAINTENANCE PREDICTION EXPLAIN (/api/v1/owner/vehicles/:id/predictions/:category/explain)
        const ownerExplainMatch = pathname.match(/^\/api\/v1\/owner\/vehicles\/([^/]+)\/predictions\/([^/]+)\/explain$/);
        if (ownerExplainMatch && method === 'POST') {
          const vehicleId = ownerExplainMatch[1]!;
          const categoryParam = ownerExplainMatch[2]!;
          if (!uuidRegex.test(vehicleId)) {
            return this.sendJson(res, 404, { error: 'Vehículo no encontrado.' }, requestId);
          }

          const vehicle = await this.vehicleRepo.findById(vehicleId);
          if (!vehicle) {
            return this.sendJson(res, 404, { error: 'Vehículo no encontrado.' }, requestId);
          }
          if (vehicle.ownerId !== principal.id) {
            return this.sendJson(
              res,
              403,
              { error: 'Acceso denegado: no sos el propietario autorizado de este vehículo.' },
              requestId
            );
          }

          const normalizedCat = VehicleKnowledgeBase.normalizeCategory(categoryParam);
          const records = await this.historyRepo.findByVehicleId(vehicle.id);
          const kbProfile = VehicleKnowledgeBase.findProfile({ make: vehicle.make, model: vehicle.model, year: vehicle.year });
          let rule = kbProfile?.intervals.find((r) => r.category === normalizedCat) ?? null;

          if (vehicle.configurationId) {
            const kbRules = await this.kbRepo.listRulesByConfiguration(vehicle.configurationId, {
              onlyActive: true,
              onlyVerified: true,
            });
            const matchedKbRule = kbRules.find((r) => VehicleKnowledgeBase.normalizeCategory(r.category) === normalizedCat);
            if (matchedKbRule && matchedKbRule.intervalKm && matchedKbRule.intervalMonths) {
              rule = {
                id: matchedKbRule.id,
                category: normalizedCat,
                title: matchedKbRule.title,
                intervalKm: matchedKbRule.intervalKm,
                intervalMonths: matchedKbRule.intervalMonths,
                source: (matchedKbRule.sourceTitle as any) ?? IntervalSource.OEM_MANUAL,
                sourceCitation: matchedKbRule.sourceReference ?? matchedKbRule.sourceTitle ?? 'Manual Oficial OEM',
                verificationStatus: 'VERIFIED',
              };
            }
          }

          if (!rule) {
            const dbIntervalRows = await this.db
              .select()
              .from(maintenanceIntervals)
              .where(
                and(
                  ilike(maintenanceIntervals.make, vehicle.make),
                  ilike(maintenanceIntervals.model, vehicle.model)
                )
              );
            const foundRow = dbIntervalRows.find((r) => VehicleKnowledgeBase.normalizeCategory(r.category) === normalizedCat);
            if (foundRow && foundRow.intervalKm && foundRow.intervalMonths) {
              rule = {
                id: foundRow.id,
                category: normalizedCat,
                title: `Mantenimiento Preventivo (${normalizedCat})`,
                intervalKm: Number(foundRow.intervalKm),
                intervalMonths: Number(foundRow.intervalMonths),
                source: IntervalSource.OEM_MANUAL,
                sourceCitation: foundRow.sourceCitation,
              };
            }
          }

          const previousServices: PreviousServiceEntry[] = [];
          for (const rec of records) {
            for (const intv of rec.interventions) {
              if (VehicleKnowledgeBase.normalizeCategory(intv.category || intv.title) === normalizedCat) {
                previousServices.push({
                  serviceDate: rec.serviceDate,
                  recordedMileage: rec.recordedMileage,
                  category: normalizedCat,
                });
              }
            }
          }

          const engine = new DeterministicMaintenanceEngine();
          const calcResult = engine.calculate({
            vehicle: {
              id: vehicle.id,
              make: vehicle.make,
              model: vehicle.model,
              year: vehicle.year,
              currentMileage: vehicle.currentMileage,
            },
            rule,
            previousServices,
          });

          const explainResult = await this.explainMaintenanceUseCase.execute({
            vehicleSummary: `${vehicle.make} ${vehicle.model} (${vehicle.year}), Odómetro: ${vehicle.currentMileage} km`,
            deterministicCalculation: calcResult,
            customerLanguage: 'Spanish',
            userId: principal.id,
          });

          if (explainResult.isFailure) {
            return this.sendJson(res, 400, { error: explainResult.getError() }, requestId);
          }

          return this.sendJson(res, 200, explainResult.getValue(), requestId);
        }

        return this.sendJson(res, 404, { error: `Owner route '${method} ${pathname}' not found.` }, requestId);
      }

      // 8. Tenant Guard for workshop tenant-scoped operations
      this.tenantGuard.canActivate(reqContext);
      if (!reqContext.principal?.activeTenantId) {
        return this.sendJson(
          res,
          403,
          { error: 'Access forbidden: active workshop membership required for workshop operations.' },
          requestId
        );
      }
      const tenantId = reqContext.principal.activeTenantId;

      // WORKSHOPS: LIST USER AUTHORIZED WORKSHOPS
      if (pathname === '/api/v1/workshops' && method === 'GET') {
        const memberships = await this.userRepo.getUserMemberships(reqContext.principal.id);
        return this.sendJson(res, 200, memberships, requestId);
      }

      // VEHICLES: CREATE
      if (pathname === '/api/v1/vehicles' && method === 'POST') {
        const body = await this.parseBody(req);
        const result = await this.createVehicleUseCase.execute(body as any);
        if (result.isFailure) {
          return this.sendJson(res, 400, { error: result.getError() }, requestId);
        }
        const val = result.getValue();
        return this.sendJson(res, 201, { id: val.vehicleId, ...val }, requestId);
      }

      // VEHICLES: SEARCH OR LIST
      if (pathname === '/api/v1/vehicles' && method === 'GET') {
        const plate = parsedUrl.searchParams.get('plate') ?? undefined;
        const vin = parsedUrl.searchParams.get('vin') ?? undefined;
        const q = parsedUrl.searchParams.get('q') ?? undefined;

        let vehicles = (await this.vehicleRepo.search({ plate, vin })).filter((v) => !v.ownerId);
        if (q && q.trim().length > 0) {
          const term = q.trim().toLowerCase();
          vehicles = vehicles.filter(
            (v) =>
              (v.plate && v.plate.toLowerCase().includes(term)) ||
              (v.vin && v.vin.toLowerCase().includes(term)) ||
              v.make.toLowerCase().includes(term) ||
              v.model.toLowerCase().includes(term)
          );
        }

        return this.sendJson(
          res,
          200,
          vehicles.map((v) => ({
            id: v.id,
            vin: v.vin,
            plate: v.plate,
            make: v.make,
            model: v.model,
            year: v.year,
            engine: v.engine,
            fuelType: v.fuelType,
            currentMileage: v.currentMileage,
          })),
          requestId
        );
      }

      // VEHICLES: DETAIL
      const vehicleDetailMatch = pathname.match(/^\/api\/v1\/vehicles\/([^/]+)$/);
      if (vehicleDetailMatch && method === 'GET') {
        const vehicleId = vehicleDetailMatch[1]!;
        const vehicle = await this.vehicleRepo.findById(vehicleId);
        if (!vehicle) {
          return this.sendJson(res, 404, { error: `Vehicle '${vehicleId}' not found.` }, requestId);
        }
        if (vehicle.ownerId) {
          return this.sendJson(
            res,
            403,
            { error: 'Access forbidden: private owner vehicle has not shared access with this workshop.' },
            requestId
          );
        }
        return this.sendJson(
          res,
          200,
          {
            id: vehicle.id,
            vin: vehicle.vin,
            plate: vehicle.plate,
            make: vehicle.make,
            model: vehicle.model,
            year: vehicle.year,
            engine: vehicle.engine,
            fuelType: vehicle.fuelType,
            currentMileage: vehicle.currentMileage,
            configurationId: vehicle.configurationId ?? null,
            technicalSpecs: vehicle.technicalSpecs ?? {},
          },
          requestId
        );
      }

      // WORKSHOP VEHICLE CONFIGURATION BINDING
      const workshopConfigBindMatch = pathname.match(/^\/api\/v1\/vehicles\/([^/]+)\/configuration$/);
      if (workshopConfigBindMatch && method === 'POST') {
        const vehicleId = workshopConfigBindMatch[1]!;
        const vehicle = await this.vehicleRepo.findById(vehicleId);
        if (!vehicle) {
          return this.sendJson(res, 404, { error: 'Vehículo no encontrado.' }, requestId);
        }
        if (vehicle.ownerId) {
          return this.sendJson(
            res,
            403,
            { error: 'Access forbidden: private owner vehicle has not shared access with this workshop.' },
            requestId
          );
        }
        const body = await this.parseBody(req);
        if (!body.configurationId) {
          return this.sendJson(res, 400, { error: 'configurationId is required.' }, requestId);
        }
        const config = await this.kbRepo.findConfigurationById(body.configurationId);
        if (!config) {
          return this.sendJson(res, 404, { error: 'Configuración técnica no encontrada.' }, requestId);
        }

        vehicle.setConfigurationId(config.id);
        const currentSpecs = (vehicle.technicalSpecs ?? {}) as Record<string, unknown>;
        vehicle.updateTechnicalSpecs({
          ...currentSpecs,
          configurationId: config.id,
          commercialName: config.commercialName,
          transmission: config.transmission,
          distributionType: config.powertrain?.timingMechanism ?? 'DESCONOCIDO',
          exactEngineCode: config.powertrain?.engineCode ?? 'PENDIENTE_CONFIRMACION',
        });
        await this.vehicleRepo.save(vehicle);
        return this.sendJson(res, 200, {
          id: vehicle.id,
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.year,
          configurationId: vehicle.configurationId,
          technicalSpecs: vehicle.technicalSpecs,
        }, requestId);
      }


      // CUSTOMERS: LIST
      if (pathname === '/api/v1/customers' && method === 'GET') {
        const customers = await this.customerRepo.listByTenant(tenantId);
        return this.sendJson(
          res,
          200,
          customers.map((c) => ({
            id: c.id,
            fullName: c.fullName,
            phone: c.phone,
            email: c.email,
            taxId: c.taxId,
          })),
          requestId
        );
      }

      // CUSTOMERS: CREATE
      if (pathname === '/api/v1/customers' && method === 'POST') {
        const body = await this.parseBody(req);
        const { Customer } = await import('../../modules/customer/domain/customer.ts');
        const cResult = Customer.create({
          tenantId,
          fullName: body.fullName,
          phone: body.phone,
          email: body.email,
          taxId: body.taxId,
        });
        if (cResult.isFailure) {
          return this.sendJson(res, 400, { error: cResult.getError() }, requestId);
        }
        const customer = cResult.getValue();
        await this.customerRepo.save(customer);
        return this.sendJson(res, 201, { id: customer.id, fullName: customer.fullName }, requestId);
      }

      // WORK ORDERS: LIST
      if (pathname === '/api/v1/work-orders' && method === 'GET') {
        const statusFilter = parsedUrl.searchParams.get('status') ?? undefined;
        const vehicleId = parsedUrl.searchParams.get('vehicleId') ?? undefined;
        const orders = await this.workOrderRepo.search({
          tenantId,
          status: statusFilter as any,
          vehicleId,
        });
        return this.sendJson(
          res,
          200,
          orders.map((o) => ({
            id: o.id,
            workshopName: o.workshopName,
            vehicleId: o.vehicleId,
            customerId: o.customerId,
            reportedMileage: o.reportedMileage,
            status: o.status,
            reportedIssue: o.reportedIssue,
            diagnosis: o.diagnosis,
            interventions: o.interventions,
            closedAt: o.closedAt,
            createdAt: o.entryDate,
          })),
          requestId
        );
      }

      // WORK ORDERS: CREATE
      if (pathname === '/api/v1/work-orders' && method === 'POST') {
        const body = await this.parseBody(req);
        if (body.vehicleId) {
          const targetVehicle = await this.vehicleRepo.findById(body.vehicleId);
          if (targetVehicle?.ownerId) {
            return this.sendJson(
              res,
              403,
              { error: 'Access forbidden: private owner vehicle has not shared access with this workshop.' },
              requestId
            );
          }
        }
        const result = await this.createWorkOrderUseCase.execute({
          tenantId,
          workshopName: 'Alpha Motors Garage',
          vehicleId: body.vehicleId,
          customerId: body.customerId,
          reportedMileage: body.reportedMileage,
          reportedIssue: body.reportedIssue,
          initialCondition: body.initialCondition,
          diagnosis: body.diagnosis,
          interventions: body.interventions,
        });
        if (result.isFailure) {
          return this.sendJson(res, 400, { error: result.getError() }, requestId);
        }
        return this.sendJson(res, 201, result.getValue(), requestId);
      }

      // WORK ORDERS: QUICK SERVICE (STAR FEATURE)
      if (pathname === '/api/v1/work-orders/quick-service' && method === 'POST') {
        const body = await this.parseBody(req);
        if (body.vehicleId) {
          const targetVehicle = await this.vehicleRepo.findById(body.vehicleId);
          if (targetVehicle?.ownerId) {
            return this.sendJson(
              res,
              403,
              { error: 'Access forbidden: private owner vehicle has not shared access with this workshop.' },
              requestId
            );
          }
        }
        const result = await this.quickServiceUseCase.execute({
          tenantId,
          workshopName: 'Alpha Motors Garage',
          actorId: reqContext.principal?.id ?? 'mechanic-1',
          vehicleId: body.vehicleId,
          odometerKm: Number(body.odometerKm),
          interventions: Array.isArray(body.interventions) ? body.interventions : [body.interventions],
          observations: body.observations,
          idempotencyKey: body.idempotencyKey,
        });

        if (result.isFailure) {
          return this.sendJson(res, 400, { error: result.getError() }, requestId);
        }
        return this.sendJson(res, 200, result.getValue(), requestId);
      }

      // WORK ORDERS: CLOSE
      const closeMatch = pathname.match(/^\/api\/v1\/work-orders\/([^/]+)\/close$/);
      if (closeMatch && method === 'POST') {
        const workOrderId = closeMatch[1]!;
        const body = await this.parseBody(req);
        const result = await this.closeWorkOrderUseCase.execute({
          workOrderId,
          tenantId,
          actorId: reqContext.principal?.id ?? 'actor-mechanic',
          idempotencyKey: body.idempotencyKey,
          internalNotes: body.internalNotes,
          partsCost: body.partsCost ? Number(body.partsCost) : undefined,
          laborCost: body.laborCost ? Number(body.laborCost) : undefined,
          diagnosis: body.diagnosis,
          interventions: body.interventions,
        });
        if (result.isFailure) {
          return this.sendJson(res, 400, { error: result.getError() }, requestId);
        }
        return this.sendJson(res, 200, result.getValue(), requestId);
      }

      // MAINTENANCE: PREVENTIVE DUE
      if (pathname === '/api/v1/maintenance/calculate-preventive' && method === 'POST') {
        if (!currentMembership?.permissions.includes('CALCULATE_PREVENTIVE')) {
          return this.sendJson(res, 403, { error: 'Access forbidden.' }, requestId);
        }
        const body = await this.parseBody(req);
        let vehicle = body.vehicle;
        if (!vehicle && body.vehicleId) {
          if ((await this.historyRepo.findByVehicleIdForWorkshop(body.vehicleId, tenantId)).length === 0) {
            return this.sendJson(res, 404, { error: 'Resource not found.' }, requestId);
          }
          const v = await this.vehicleRepo.findById(body.vehicleId);
          vehicle = {
            id: body.vehicleId,
            make: v?.make ?? 'Volkswagen',
            model: v?.model ?? 'Golf',
            year: v?.year ?? 2021,
            currentMileage: body.currentMileage ?? v?.currentMileage ?? 0,
          };
        }

        const rawRules = body.rules ?? body.intervals ?? [];
        const rules = rawRules.map((r: any) => ({
          category: r.category ?? 'OIL_AND_FILTER',
          intervalKm: Number(r.intervalKm ?? 15000),
          intervalMonths: Number(r.intervalMonths ?? 12),
          sourceCitation: r.sourceCitation ?? 'Manual OEM',
        }));

        const previousServices = (body.previousServices ?? body.history ?? []).map((h: any) => ({
          serviceDate: new Date(h.date ?? h.serviceDate ?? Date.now()),
          recordedMileage: Number(h.mileage ?? h.recordedMileage ?? 0),
          category: h.category ?? 'OIL_AND_FILTER',
        }));

        const result = this.calcPreventiveUseCase.execute({
          vehicle,
          rules,
          previousServices,
          currentDate: body.currentDate ? new Date(body.currentDate) : undefined,
        });

        if (result.isFailure) {
          return this.sendJson(res, 400, { error: result.getError() }, requestId);
        }
        const calculations = result.getValue();
        const primary = calculations[0] ?? {};
        return this.sendJson(res, 200, { ...primary, results: calculations }, requestId);
      }

      // WORKSHOP VEHICLE HISTORY SUMMARY
      const workshopSummaryMatch = pathname.match(/^\/api\/v1\/vehicles\/([^/]+)\/history\/summary$/);
      if (workshopSummaryMatch && method === 'POST') {
        if (!currentMembership?.permissions.includes('READ')) {
          return this.sendJson(res, 403, { error: 'Access forbidden.' }, requestId);
        }
        const vehicleId = workshopSummaryMatch[1]!;
        if (!WORKSHOP_VEHICLE_UUID.test(vehicleId)) {
          return this.sendJson(res, 404, { error: 'Resource not found.' }, requestId);
        }
        const records = await this.historyRepo.findByVehicleIdForWorkshop(vehicleId, tenantId);
        if (records.length === 0) {
          return this.sendJson(res, 404, { error: 'Resource not found.' }, requestId);
        }
        const vehicle = await this.vehicleRepo.findById(vehicleId);
        if (!vehicle) {
          return this.sendJson(res, 404, { error: 'Resource not found.' }, requestId);
        }

        const mappedRecords = records.map((r) => ({
          id: r.id,
          serviceDate: r.serviceDate,
          mileage: r.recordedMileage,
          title: r.interventions[0]?.title ?? 'Mantenimiento',
          description: r.interventions.map((i) => i.title).join(', '),
          performedInterventions: r.interventions.map((i) => i.title),
          isVerified: r.isCertified,
          verificationLevel: r.verificationLevel,
          observations: r.internalNotes,
        }));

        const summaryResult = await this.summarizeHistoryUseCase.execute({
          vehicleId: vehicle.id,
          vehicleMake: vehicle.make,
          vehicleModel: vehicle.model,
          vehicleYear: vehicle.year,
          currentMileageKm: vehicle.currentMileage,
          records: mappedRecords,
          workshopId: tenantId,
        });

        if (summaryResult.isFailure) {
          return this.sendJson(res, 400, { error: summaryResult.getError() }, requestId);
        }

        return this.sendJson(res, 200, summaryResult.getValue(), requestId);
      }

      // WORKSHOP PREDICTION EXPLAIN
      const workshopExplainMatch = pathname.match(/^\/api\/v1\/vehicles\/([^/]+)\/predictions\/([^/]+)\/explain$/);
      if (workshopExplainMatch && method === 'POST') {
        if (!currentMembership?.permissions.includes('CALCULATE_PREVENTIVE')) {
          return this.sendJson(res, 403, { error: 'Access forbidden.' }, requestId);
        }
        const vehicleId = workshopExplainMatch[1]!;
        const categoryParam = workshopExplainMatch[2]!;
        if (!WORKSHOP_VEHICLE_UUID.test(vehicleId)) {
          return this.sendJson(res, 404, { error: 'Resource not found.' }, requestId);
        }
        const records = await this.historyRepo.findByVehicleIdForWorkshop(vehicleId, tenantId);
        if (records.length === 0) {
          return this.sendJson(res, 404, { error: 'Resource not found.' }, requestId);
        }
        const vehicle = await this.vehicleRepo.findById(vehicleId);
        if (!vehicle) {
          return this.sendJson(res, 404, { error: 'Resource not found.' }, requestId);
        }

        const normalizedCat = VehicleKnowledgeBase.normalizeCategory(categoryParam);
        const kbProfile = VehicleKnowledgeBase.findProfile({ make: vehicle.make, model: vehicle.model, year: vehicle.year });
        let rule = kbProfile?.intervals.find((r) => r.category === normalizedCat) ?? null;

        if (vehicle.configurationId) {
          const kbRules = await this.kbRepo.listRulesByConfiguration(vehicle.configurationId, {
            onlyActive: true,
            onlyVerified: true,
          });
          const matchedKbRule = kbRules.find((r) => VehicleKnowledgeBase.normalizeCategory(r.category) === normalizedCat);
          if (matchedKbRule && matchedKbRule.intervalKm && matchedKbRule.intervalMonths) {
            rule = {
              id: matchedKbRule.id,
              category: normalizedCat,
              title: matchedKbRule.title,
              intervalKm: matchedKbRule.intervalKm,
              intervalMonths: matchedKbRule.intervalMonths,
              source: (matchedKbRule.sourceTitle as any) ?? IntervalSource.OEM_MANUAL,
              sourceCitation: matchedKbRule.sourceReference ?? matchedKbRule.sourceTitle ?? 'Manual Oficial OEM',
            };
          }
        }

        if (!rule) {
          const dbIntervalRows = await this.db
            .select()
            .from(maintenanceIntervals)
            .where(
              and(
                ilike(maintenanceIntervals.make, vehicle.make),
                ilike(maintenanceIntervals.model, vehicle.model)
              )
            );
          const foundRow = dbIntervalRows.find((r) => VehicleKnowledgeBase.normalizeCategory(r.category) === normalizedCat);
          if (foundRow && foundRow.intervalKm && foundRow.intervalMonths) {
            rule = {
              id: foundRow.id,
              category: normalizedCat,
              title: `Mantenimiento Preventivo (${normalizedCat})`,
              intervalKm: Number(foundRow.intervalKm),
              intervalMonths: Number(foundRow.intervalMonths),
              source: IntervalSource.OEM_MANUAL,
              sourceCitation: foundRow.sourceCitation,
            };
          }
        }

        const previousServices: PreviousServiceEntry[] = [];
        for (const rec of records) {
          for (const intv of rec.interventions) {
            if (VehicleKnowledgeBase.normalizeCategory(intv.category || intv.title) === normalizedCat) {
              previousServices.push({
                serviceDate: rec.serviceDate,
                recordedMileage: rec.recordedMileage,
                category: normalizedCat,
              });
            }
          }
        }

        const engine = new DeterministicMaintenanceEngine();
        const calcResult = engine.calculate({
          vehicle: {
            id: vehicle.id,
            make: vehicle.make,
            model: vehicle.model,
            year: vehicle.year,
            currentMileage: vehicle.currentMileage,
          },
          rule,
          previousServices,
        });

        const explainResult = await this.explainMaintenanceUseCase.execute({
          vehicleSummary: `${vehicle.make} ${vehicle.model} (${vehicle.year}), Odómetro: ${vehicle.currentMileage} km`,
          deterministicCalculation: calcResult,
          customerLanguage: 'Spanish',
          workshopId: tenantId,
        });

        if (explainResult.isFailure) {
          return this.sendJson(res, 400, { error: explainResult.getError() }, requestId);
        }

        return this.sendJson(res, 200, explainResult.getValue(), requestId);
      }

      // AI: OBD2 INTERPRETATION
      if (pathname === '/api/v1/ai/obd2/interpret' && method === 'POST') {
        const body = await this.parseBody(req);
        const result = await this.obd2UseCase.execute(body as any);
        if (result.isFailure) {
          return this.sendJson(res, 400, { error: result.getError() }, requestId);
        }
        return this.sendJson(res, 200, result.getValue(), requestId);
      }

      // DIAGNOSTICS: ENUMERATE USB SERIAL PORTS
      if (pathname === '/api/v1/diagnostics/ports' && method === 'GET') {
        const ports = await this.obdService.getAvailablePorts();
        return this.sendJson(res, 200, { ports }, requestId);
      }

      // DIAGNOSTICS: START SESSION
      if (pathname === '/api/v1/diagnostics/session/start' && method === 'POST') {
        const body = await this.parseBody(req);
        if (!body.vehicleId) {
          return this.sendJson(res, 400, { error: 'vehicleId is required' }, requestId);
        }

        // Validate vehicle existence
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(body.vehicleId)) {
          return this.sendJson(res, 404, { error: `Vehicle '${body.vehicleId}' not found.` }, requestId);
        }

        const vehicle = await this.vehicleRepo.findById(body.vehicleId);
        if (!vehicle) {
          return this.sendJson(res, 404, { error: `Vehicle '${body.vehicleId}' not found.` }, requestId);
        }
        if (vehicle.ownerId) {
          return this.sendJson(
            res,
            403,
            { error: 'Access forbidden: private owner vehicle has not shared access with this workshop.' },
            requestId
          );
        }

        // Validate COM port safety if hardware transport is requested
        if (body.transportType === 'USB_SERIAL' || body.transportType === 'WINDOWS_USB_SERIAL') {
          if (!body.comPort || typeof body.comPort !== 'string') {
            return this.sendJson(res, 400, { error: 'comPort path is required for USB serial transport.' }, requestId);
          }
          const comRegex = /^COM[0-9]{1,2}$/i;
          if (!comRegex.test(body.comPort.trim())) {
            return this.sendJson(res, 400, { error: `Invalid COM port format '${body.comPort}'. Must match COM[1-99].` }, requestId);
          }
        }

        const session = await this.obdService.startSession({
          vehicleId: body.vehicleId,
          workshopId: tenantId,
          userId: reqContext.principal?.id,
          transportType: body.transportType === 'WINDOWS_USB_SERIAL' ? 'USB_SERIAL' : (body.transportType || 'SIMULATED'),
          comPort: body.comPort ? body.comPort.trim().toUpperCase() : undefined,
          simulatorConfig: body.simulatorConfig,
        });

        return this.sendJson(
          res,
          200,
          {
            status: 'CONNECTED',
            transportId: session.transport.transportId,
            isSimulated: session.transport.isSimulated,
          },
          requestId
        );
      }

      // DIAGNOSTICS: POLL LIVE SNAPSHOT
      if (pathname === '/api/v1/diagnostics/session/live' && method === 'GET') {
        const vehicleId = parsedUrl.searchParams.get('vehicleId');
        if (!vehicleId) {
          return this.sendJson(res, 400, { error: 'vehicleId query parameter is required' }, requestId);
        }
        const telemetry = await this.obdService.getLiveTelemetry(tenantId, vehicleId);
        return this.sendJson(res, 200, telemetry, requestId);
      }

      // DIAGNOSTICS: STOP SESSION
      if (pathname === '/api/v1/diagnostics/session/stop' && method === 'POST') {
        const body = await this.parseBody(req);
        if (!body.vehicleId) {
          return this.sendJson(res, 400, { error: 'vehicleId is required' }, requestId);
        }
        await this.obdService.stopSession(tenantId, body.vehicleId);
        return this.sendJson(res, 200, { status: 'DISCONNECTED' }, requestId);
      }

      // DIAGNOSTICS: SAVE SNAPSHOT TO VEHICLE HISTORY
      if (pathname === '/api/v1/diagnostics/session/snapshot' && method === 'POST') {
        const body = await this.parseBody(req);
        if (!body.vehicleId || !body.telemetry) {
          return this.sendJson(res, 400, { error: 'vehicleId and telemetry snapshot are required' }, requestId);
        }

        // Validate vehicle existence
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(body.vehicleId)) {
          return this.sendJson(res, 404, { error: `Vehicle '${body.vehicleId}' not found.` }, requestId);
        }

        const vehicle = await this.vehicleRepo.findById(body.vehicleId);
        if (!vehicle) {
          return this.sendJson(res, 404, { error: `Vehicle '${body.vehicleId}' not found.` }, requestId);
        }
        if (vehicle.ownerId) {
          return this.sendJson(
            res,
            403,
            { error: 'Access forbidden: private owner vehicle has not shared access with this workshop.' },
            requestId
          );
        }

        const record = this.obdService.createDiagnosticRecord(
          body.telemetry,
          body.vehicleId,
          tenantId,
          body.technicianNotes,
          reqContext.principal?.id
        );
        return this.sendJson(res, 201, { record }, requestId);
      }

      // Route Not Found
      return this.sendJson(res, 404, { error: `Route '${method} ${pathname}' not found.` }, requestId);
    } catch (err: unknown) {
      if (err instanceof AuthenticationRequiredError || err instanceof TokenExpiredOrInvalidError) {
        return this.sendJson(res, 401, { error: 'Authentication required. Missing or invalid token.' }, requestId);
      }
      if (err instanceof SessionRevokedError) {
        return this.sendJson(res, 401, { error: 'Session has expired or has been revoked.' }, requestId);
      }
      if (err instanceof CrossTenantViolationError) {
        return this.sendJson(res, 403, { error: 'Access forbidden: cross-tenant access prohibited.' }, requestId);
      }
      if (err instanceof PrivilegeEscalationError) {
        return this.sendJson(res, 403, { error: err.message }, requestId);
      }
      if (err instanceof ObdSecurityError) {
        return this.sendJson(res, 403, { error: err.message }, requestId);
      }
      if (err instanceof ObdError) {
        return this.sendJson(res, 400, { error: err.message }, requestId);
      }

      this.log('ERROR', 'Unhandled internal server error', {
        error: err instanceof Error ? err.message : String(err),
        requestId,
      });

      // Internal Server Error (Never leak stack trace to client)
      return this.sendJson(res, 500, { error: 'Internal server error.' }, requestId);
    } finally {
      this.log('INFO', 'HTTP Request Handled', {
        method,
        path: pathname,
        statusCode: res.statusCode,
        durationMs: Date.now() - startMs,
        requestId,
      });
    }
  }

  public createServer() {
    return createServer((req, res) => this.handleRequest(req, res));
  }
}
