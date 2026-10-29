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
  SecurityHeadersService,
  PasswordService,
} from '@automotors/security-foundation';
import type { DatabaseInstance } from '@automotors/database';
import { DatabaseFactory, PostgresSessionRepository } from '@automotors/database';
import { PostgresVehicleRepository } from '../database/postgres-vehicle.repository.ts';
import { PostgresWorkOrderRepository } from '../database/postgres-work-order.repository.ts';
import { PostgresCustomerRepository } from '../database/postgres-customer.repository.ts';
import { PostgresMaintenanceHistoryRepository } from '../database/postgres-maintenance-history.repository.ts';
import { PostgresUserRepository } from '../database/postgres-user.repository.ts';
import { PostgresUnitOfWork } from '../database/postgres-unit-of-work.ts';
import { CreateVehicleUseCase } from '../../modules/vehicle/application/create-vehicle.usecase.ts';
import { CreateWorkOrderUseCase } from '../../modules/work-order/application/create-work-order.usecase.ts';
import { CloseWorkOrderUseCase } from '../../modules/work-order/application/close-work-order.usecase.ts';
import { QuickServiceUseCase } from '../../modules/work-order/application/quick-service.usecase.ts';
import { GetVehiclePassportUseCase } from '../../modules/maintenance-history/application/get-vehicle-passport.usecase.ts';
import { CalculatePreventiveDueUseCase } from '../../modules/maintenance-intelligence/application/calculate-preventive-due.usecase.ts';
import { ProcessVoiceNoteUseCase } from '../../modules/maintenance-intelligence/application/process-voice-note.usecase.ts';
import { InterpretObd2UseCase } from '../../modules/maintenance-intelligence/application/interpret-obd2.usecase.ts';
import { MockAIProvider, MockTranscriptionProvider } from '../../modules/maintenance-intelligence/adapters/mock-ai.adapter.ts';
import { DemoSeeder } from '../database/demo-seed.ts';
import { getDemoDashboardHtml } from './demo-web-ui.ts';
import { ObdDiagnosticsService, ObdError, ObdSecurityError } from '@automotors/obd-core';

export interface HttpAppDependencies {
  db: DatabaseInstance;
  jwtSecret?: string;
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

  // Use cases
  private readonly createVehicleUseCase: CreateVehicleUseCase;
  private readonly createWorkOrderUseCase: CreateWorkOrderUseCase;
  private readonly closeWorkOrderUseCase: CloseWorkOrderUseCase;
  private readonly quickServiceUseCase: QuickServiceUseCase;
  private readonly getPassportUseCase: GetVehiclePassportUseCase;
  private readonly calcPreventiveUseCase: CalculatePreventiveDueUseCase;
  private readonly voiceNoteUseCase: ProcessVoiceNoteUseCase;
  private readonly obd2UseCase: InterpretObd2UseCase;
  private readonly obdService: ObdDiagnosticsService;

  constructor(deps: HttpAppDependencies) {
    this.db = deps.db;
    const jwtSecret = deps.jwtSecret ?? 'production-grade-super-secret-key-automotors-32-chars';
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
    this.routeRegistry.registerPublicRoute('/api/v1/auth/login', 'POST');
    this.routeRegistry.registerPublicRoute('/api/v1/demo/seed', 'POST');
    this.routeRegistry.registerPublicRoute('/api/v1/vehicles/:id/passport', 'GET'); // Public view sanitized

    this.authGuard = new AuthenticationGuard(this.tokenService, this.sessionService, this.routeRegistry);
    this.tenantGuard = new TenantGuard();

    this.vehicleRepo = new PostgresVehicleRepository(this.db);
    this.workOrderRepo = new PostgresWorkOrderRepository(this.db);
    this.customerRepo = new PostgresCustomerRepository(this.db);
    this.historyRepo = new PostgresMaintenanceHistoryRepository(this.db);
    this.userRepo = new PostgresUserRepository(this.db);
    this.unitOfWork = new PostgresUnitOfWork(this.db);

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
    this.voiceNoteUseCase = new ProcessVoiceNoteUseCase(
      new MockTranscriptionProvider(),
      new MockAIProvider()
    );
    this.obd2UseCase = new InterpretObd2UseCase(new MockAIProvider());
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

      // 3. Authentication Guard
      this.authGuard.canActivate(reqContext);

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
        const targetWorkshop = workshopId
          ? memberships.find((m) => m.workshopId === workshopId)
          : memberships[0];

        const activeTenantId = targetWorkshop?.workshopId ?? 'a0000000-0000-4000-8000-000000000001';
        const role = targetWorkshop?.role ?? 'MECHANIC';
        const permissions = targetWorkshop?.permissions ?? ['READ', 'UPDATE', 'CREATE', 'CLOSE_ORDER'];

        const session = await this.sessionService.createSession(
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

        this.log('INFO', 'User authenticated successfully', { userId: user.id, activeTenantId, requestId });

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
              role,
              workshops: memberships.map((m) => ({ id: m.workshopId, name: m.workshopName, role: m.role })),
            },
          },
          requestId
        );
      }

      // 5. AUTH: CURRENT USER & MEMBERSHIPS (ME)
      if (pathname === '/api/v1/auth/me' && method === 'GET') {
        const principal = reqContext.principal;
        const memberships = await this.userRepo.getUserMemberships(principal.id);
        return this.sendJson(
          res,
          200,
          {
            user: { id: principal.id, email: principal.email },
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
        const sessionId = pathname.split('/').pop()!;
        await this.sessionService.revokeSession(sessionId);
        this.log('INFO', 'Session revoked', { sessionId, requestId });
        return this.sendJson(res, 200, { message: `Session '${sessionId}' revoked successfully.` }, requestId);
      }

      // VEHICLES: PASSPORT (Public or Authenticated View)
      const passportMatch = pathname.match(/^\/api\/v1\/vehicles\/([^/]+)\/passport$/);
      if (passportMatch && method === 'GET') {
        const vehicleId = passportMatch[1]!;
        const isPublic = parsedUrl.searchParams.get('public') === 'true';
        const result = await this.getPassportUseCase.execute({ vehicleId, isPublicView: isPublic });
        if (result.isFailure) {
          return this.sendJson(res, 404, { error: result.getError() }, requestId);
        }
        return this.sendJson(res, 200, result.getValue(), requestId);
      }

      // 8. Tenant Guard for tenant-scoped operations
      this.tenantGuard.canActivate(reqContext);
      const tenantId = reqContext.principal?.activeTenantId ?? 'a0000000-0000-4000-8000-000000000001';

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

        let vehicles = await this.vehicleRepo.search({ plate, vin });
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
          },
          requestId
        );
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
        const body = await this.parseBody(req);
        let vehicle = body.vehicle;
        if (!vehicle && body.vehicleId) {
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

      // AI: VOICE NOTES INTAKE
      if (pathname === '/api/v1/ai/voice-notes/process' && method === 'POST') {
        const body = await this.parseBody(req);
        const result = await this.voiceNoteUseCase.execute({
          audioBuffer: Buffer.from(body.audioBase64 ?? '', 'base64'),
          mimeType: body.mimeType ?? 'audio/wav',
          workshopId: tenantId,
          vehicleId: body.vehicleId ?? 'v-default',
          mechanicId: reqContext.principal?.id ?? 'mechanic-1',
        });
        if (result.isFailure) {
          return this.sendJson(res, 400, { error: result.getError() }, requestId);
        }
        return this.sendJson(res, 200, result.getValue(), requestId);
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
