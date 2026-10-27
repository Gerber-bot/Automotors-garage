import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import {
  TokenService,
  SessionService,
  RoutePrivacyRegistry,
  AuthenticationGuard,
  TenantGuard,
  AuthenticationRequiredError,
  SessionRevokedError,
  CrossTenantViolationError,
  SecurityHeadersService,
} from '@automotors/security-foundation';
import type { DatabaseInstance } from '@automotors/database';
import { PostgresSessionRepository } from '@automotors/database';
import { PostgresVehicleRepository } from '../database/postgres-vehicle.repository.ts';
import { PostgresWorkOrderRepository } from '../database/postgres-work-order.repository.ts';
import { PostgresCustomerRepository } from '../database/postgres-customer.repository.ts';
import { PostgresMaintenanceHistoryRepository } from '../database/postgres-maintenance-history.repository.ts';
import { PostgresUnitOfWork } from '../database/postgres-unit-of-work.ts';
import { CreateVehicleUseCase } from '../../modules/vehicle/application/create-vehicle.usecase.ts';
import { CreateWorkOrderUseCase } from '../../modules/work-order/application/create-work-order.usecase.ts';
import { CloseWorkOrderUseCase } from '../../modules/work-order/application/close-work-order.usecase.ts';
import { GetVehiclePassportUseCase } from '../../modules/maintenance-history/application/get-vehicle-passport.usecase.ts';
import { CalculatePreventiveDueUseCase } from '../../modules/maintenance-intelligence/application/calculate-preventive-due.usecase.ts';
import { ProcessVoiceNoteUseCase } from '../../modules/maintenance-intelligence/application/process-voice-note.usecase.ts';
import { InterpretObd2UseCase } from '../../modules/maintenance-intelligence/application/interpret-obd2.usecase.ts';
import { MockAIProvider, MockTranscriptionProvider } from '../../modules/maintenance-intelligence/adapters/mock-ai.adapter.ts';

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

  // Repositories
  private readonly vehicleRepo: PostgresVehicleRepository;
  private readonly workOrderRepo: PostgresWorkOrderRepository;
  private readonly customerRepo: PostgresCustomerRepository;
  private readonly historyRepo: PostgresMaintenanceHistoryRepository;
  private readonly unitOfWork: PostgresUnitOfWork;

  // Use cases
  private readonly createVehicleUseCase: CreateVehicleUseCase;
  private readonly createWorkOrderUseCase: CreateWorkOrderUseCase;
  private readonly closeWorkOrderUseCase: CloseWorkOrderUseCase;
  private readonly getPassportUseCase: GetVehiclePassportUseCase;
  private readonly calcPreventiveUseCase: CalculatePreventiveDueUseCase;
  private readonly voiceNoteUseCase: ProcessVoiceNoteUseCase;
  private readonly obd2UseCase: InterpretObd2UseCase;

  constructor(deps: HttpAppDependencies) {
    this.db = deps.db;
    const jwtSecret = deps.jwtSecret ?? 'production-grade-super-secret-key-automotors-32-chars';
    this.tokenService = new TokenService(jwtSecret, 3600);

    const sessionRepo = new PostgresSessionRepository(this.db);
    this.sessionService = new SessionService(sessionRepo);

    this.routeRegistry = new RoutePrivacyRegistry();
    // Register Public Routes
    this.routeRegistry.registerPublicRoute('/health/live', 'GET');
    this.routeRegistry.registerPublicRoute('/health/ready', 'GET');
    this.routeRegistry.registerPublicRoute('/api/v1/auth/login', 'POST');
    this.routeRegistry.registerPublicRoute('/api/v1/vehicles/:id/passport', 'GET'); // Public view sanitized

    this.authGuard = new AuthenticationGuard(this.tokenService, this.sessionService, this.routeRegistry);
    this.tenantGuard = new TenantGuard();

    this.vehicleRepo = new PostgresVehicleRepository(this.db);
    this.workOrderRepo = new PostgresWorkOrderRepository(this.db);
    this.customerRepo = new PostgresCustomerRepository(this.db);
    this.historyRepo = new PostgresMaintenanceHistoryRepository(this.db);
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
    this.getPassportUseCase = new GetVehiclePassportUseCase(this.vehicleRepo, this.historyRepo);
    this.calcPreventiveUseCase = new CalculatePreventiveDueUseCase();
    this.voiceNoteUseCase = new ProcessVoiceNoteUseCase(
      new MockTranscriptionProvider(),
      new MockAIProvider()
    );
    this.obd2UseCase = new InterpretObd2UseCase(new MockAIProvider());
  }

  private sendJson(res: ServerResponse, statusCode: number, data: unknown): void {
    const securityHeadersService = new SecurityHeadersService({ isProduction: false, allowedOrigins: ['*'] });
    const headers = securityHeadersService.getSecurityHeaders();
    for (const [k, v] of Object.entries(headers)) {
      res.setHeader(k, v);
    }
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-tenant-id');
    res.statusCode = statusCode;
    res.end(JSON.stringify(data));
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

  public async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const method = req.method?.toUpperCase() ?? 'GET';
    const parsedUrl = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    const pathname = parsedUrl.pathname;

    if (method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-tenant-id');
      res.statusCode = 204;
      res.end();
      return;
    }

    try {
      // 1. Healthcheck
      if (pathname === '/health/live' || pathname === '/health/ready') {
        return this.sendJson(res, 200, { status: 'UP', timestamp: new Date().toISOString() });
      }

      // Convert Node headers to record
      const headersRecord: Record<string, string> = {};
      for (const [k, v] of Object.entries(req.headers)) {
        if (typeof v === 'string') headersRecord[k.toLowerCase()] = v;
      }

      const reqContext: any = {
        path: pathname,
        method,
        headers: headersRecord,
        query: Object.fromEntries(parsedUrl.searchParams),
      };

      // 2. Authentication Guard
      this.authGuard.canActivate(reqContext);

      // 3. Routing
      // AUTH: LOGIN
      if (pathname === '/api/v1/auth/login' && method === 'POST') {
        const body = await this.parseBody(req);
        const { email, password, workshopId } = body;

        if (!email || !password) {
          return this.sendJson(res, 400, { error: 'Email and password are required.' });
        }

        const session = await this.sessionService.createSession(
          'user-mechanic-1',
          workshopId ?? 'w-alpha',
          60 * 24,
          { ipAddress: req.socket.remoteAddress, userAgent: req.headers['user-agent'] }
        );

        const token = this.tokenService.generateAccessToken({
          sub: 'user-mechanic-1',
          email,
          tenantId: workshopId ?? 'w-alpha',
          role: 'MECHANIC',
          permissions: ['READ', 'UPDATE', 'CREATE'],
          sessionId: session.id,
        });

        return this.sendJson(res, 200, {
          token,
          session: {
            id: session.id,
            expiresAt: session.expiresAt,
            activeTenantId: session.activeTenantId,
          },
          user: { id: 'user-mechanic-1', email, fullName: 'Mechanic Test' },
        });
      }

      // AUTH: REVOKE SESSION
      if (pathname.startsWith('/api/v1/auth/sessions/') && method === 'DELETE') {
        const sessionId = pathname.split('/').pop()!;
        await this.sessionService.revokeSession(sessionId);
        return this.sendJson(res, 200, { message: `Session '${sessionId}' revoked successfully.` });
      }

      // 4. Tenant Guard for tenant-scoped operations
      this.tenantGuard.canActivate(reqContext);
      const tenantId = reqContext.principal?.activeTenantId ?? 'w-alpha';

      // VEHICLES: CREATE
      if (pathname === '/api/v1/vehicles' && method === 'POST') {
        const body = await this.parseBody(req);
        const result = await this.createVehicleUseCase.execute(body as any);
        if (result.isFailure) {
          return this.sendJson(res, 400, { error: result.getError() });
        }
        return this.sendJson(res, 201, result.getValue());
      }

      // VEHICLES: SEARCH OR LIST
      if (pathname === '/api/v1/vehicles' && method === 'GET') {
        const plate = parsedUrl.searchParams.get('plate') ?? undefined;
        const vin = parsedUrl.searchParams.get('vin') ?? undefined;
        const vehicles = await this.vehicleRepo.search({ plate, vin });
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
            currentMileage: v.currentMileage,
          }))
        );
      }

      // VEHICLES: PASSPORT
      const passportMatch = pathname.match(/^\/api\/v1\/vehicles\/([^/]+)\/passport$/);
      if (passportMatch && method === 'GET') {
        const vehicleId = passportMatch[1]!;
        const isPublic = parsedUrl.searchParams.get('public') === 'true';
        const result = await this.getPassportUseCase.execute({ vehicleId, isPublicView: isPublic });
        if (result.isFailure) {
          return this.sendJson(res, 404, { error: result.getError() });
        }
        return this.sendJson(res, 200, result.getValue());
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
          return this.sendJson(res, 400, { error: cResult.getError() });
        }
        const customer = cResult.getValue();
        await this.customerRepo.save(customer);
        return this.sendJson(res, 201, { id: customer.id, fullName: customer.fullName });
      }

      // WORK ORDERS: CREATE
      if (pathname === '/api/v1/work-orders' && method === 'POST') {
        const body = await this.parseBody(req);
        const result = await this.createWorkOrderUseCase.execute({
          tenantId,
          workshopName: 'Workshop Alpha',
          vehicleId: body.vehicleId,
          customerId: body.customerId,
          reportedMileage: body.reportedMileage,
          reportedIssue: body.reportedIssue,
          initialCondition: body.initialCondition,
        });
        if (result.isFailure) {
          return this.sendJson(res, 400, { error: result.getError() });
        }
        return this.sendJson(res, 201, result.getValue());
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
          partsCost: body.partsCost,
          laborCost: body.laborCost,
        });
        if (result.isFailure) {
          return this.sendJson(res, 400, { error: result.getError() });
        }
        return this.sendJson(res, 200, result.getValue());
      }

      // MAINTENANCE: PREVENTIVE DUE
      if (pathname === '/api/v1/maintenance/calculate-preventive' && method === 'POST') {
        const body = await this.parseBody(req);
        const result = this.calcPreventiveUseCase.execute(body as any);
        if (result.isFailure) {
          return this.sendJson(res, 400, { error: result.getError() });
        }
        return this.sendJson(res, 200, result.getValue());
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
          return this.sendJson(res, 400, { error: result.getError() });
        }
        return this.sendJson(res, 200, result.getValue());
      }

      // AI: OBD2 INTERPRETATION
      if (pathname === '/api/v1/ai/obd2/interpret' && method === 'POST') {
        const body = await this.parseBody(req);
        const result = await this.obd2UseCase.execute(body as any);
        if (result.isFailure) {
          return this.sendJson(res, 400, { error: result.getError() });
        }
        return this.sendJson(res, 200, result.getValue());
      }

      // Route Not Found
      return this.sendJson(res, 404, { error: `Route '${method} ${pathname}' not found.` });
    } catch (err: unknown) {
      if (err instanceof AuthenticationRequiredError) {
        return this.sendJson(res, 401, { error: 'Authentication required. Missing or invalid token.' });
      }
      if (err instanceof SessionRevokedError) {
        return this.sendJson(res, 401, { error: 'Session has expired or has been revoked.' });
      }
      if (err instanceof CrossTenantViolationError) {
        return this.sendJson(res, 403, { error: 'Access forbidden: cross-tenant access prohibited.' });
      }

      // Internal Server Error (Never leak stack trace)
      return this.sendJson(res, 500, { error: 'Internal server error.' });
    }
  }

  public createServer() {
    return createServer((req, res) => this.handleRequest(req, res));
  }
}
