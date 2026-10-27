import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';

import {
  Role,
  Permission,
  AuthenticatedPrincipal,
  TenantContext,
  ResourceType,
  Action,
  ResourceAccessEvaluator,
  AuditService,
  PasswordService,
  TokenService,
  SessionService,
  PasswordResetService,
  RateLimiter,
  FileSecurityService,
  VehicleHistoryPrivacyService,
  RoutePrivacyRegistry,
  AuthenticationGuard,
  AuthenticationRequiredError,
  SessionRevokedError,
  CrossTenantViolationError,
} from '../index.ts';
import type {
  ServiceRecord,
  PrivateFileMetadata,
  HttpRequestContext,
} from '../index.ts';

describe('Security Foundation Test Suite', () => {
  const JWT_SECRET = 'super-secret-crypto-key-at-least-32-chars-long-123456';
  const FILE_SECRET = 'file-encryption-secret-min-32-characters-super-secure';

  // ============================================================================
  // Test 1: Usuario sin sesión recibe acceso denegado.
  // ============================================================================
  it('1. Usuario sin sesión recibe acceso denegado (Authentication required)', () => {
    const evaluator = new ResourceAccessEvaluator();
    const result = evaluator.evaluate(null, Action.READ, ResourceType.CUSTOMER, {
      id: 'cust-1',
      tenantId: 'tenant-a',
    });

    assert.equal(result.allowed, false);
    assert.match(result.reason ?? '', /Authentication required/i);
  });

  // ============================================================================
  // Test 2: Mecánico del taller A no accede a clientes del taller B.
  // ============================================================================
  it('2. Mecánico del taller A no accede a clientes del taller B (Cross-tenant read)', () => {
    const evaluator = new ResourceAccessEvaluator();
    const mechanicWorkshopA = new AuthenticatedPrincipal({
      id: 'mech-1',
      email: 'mechanic@workshops-a.com',
      activeTenantId: 'tenant-a',
      sessionId: 'sess-1',
      memberships: [{ tenantId: 'tenant-a', role: Role.MECHANIC, status: 'active' }],
    });

    const customerWorkshopB = {
      id: 'cust-b-100',
      tenantId: 'tenant-b',
    };

    const result = evaluator.evaluate(mechanicWorkshopA, Action.READ, ResourceType.CUSTOMER, customerWorkshopB);

    assert.equal(result.allowed, false);
    assert.match(result.reason ?? '', /Cross-tenant violation/i);
  });

  // ============================================================================
  // Test 3: Mecánico del taller A no modifica órdenes del taller B.
  // ============================================================================
  it('3. Mecánico del taller A no modifica órdenes del taller B (Cross-tenant mutation)', () => {
    const evaluator = new ResourceAccessEvaluator();
    const mechanicWorkshopA = new AuthenticatedPrincipal({
      id: 'mech-1',
      email: 'mechanic@workshops-a.com',
      activeTenantId: 'tenant-a',
      sessionId: 'sess-1',
      memberships: [{ tenantId: 'tenant-a', role: Role.MECHANIC, status: 'active' }],
    });

    const workOrderWorkshopB = {
      id: 'wo-b-999',
      tenantId: 'tenant-b',
      status: 'IN_PROGRESS',
    };

    const result = evaluator.evaluate(mechanicWorkshopA, Action.UPDATE, ResourceType.WORK_ORDER, workOrderWorkshopB);

    assert.equal(result.allowed, false);
    assert.match(result.reason ?? '', /Cross-tenant violation/i);
  });

  // ============================================================================
  // Test 4: Usuario no puede elevar su propio rol.
  // ============================================================================
  it('4. Usuario no puede elevar su propio rol ni asignar roles iguales o superiores', () => {
    const evaluator = new ResourceAccessEvaluator();
    const owner = new AuthenticatedPrincipal({
      id: 'owner-1',
      email: 'owner@workshop.com',
      activeTenantId: 'tenant-a',
      sessionId: 'sess-owner',
      memberships: [{ tenantId: 'tenant-a', role: Role.WORKSHOP_OWNER, status: 'active' }],
    });

    // Owner attempts to assign SUPER_ADMIN (higher role) -> Blocked
    const resultSuperAdmin = evaluator.evaluate(owner, Action.ASSIGN_ROLE, ResourceType.USER_MEMBERSHIP, {
      id: 'membership-1',
      tenantId: 'tenant-a',
      targetRole: Role.SUPER_ADMIN,
    });
    assert.equal(resultSuperAdmin.allowed, false);
    assert.match(resultSuperAdmin.reason ?? '', /Privilege escalation blocked/i);

    // Owner attempts to assign another WORKSHOP_OWNER (equal role) -> Blocked
    const resultEqual = evaluator.evaluate(owner, Action.ASSIGN_ROLE, ResourceType.USER_MEMBERSHIP, {
      id: 'membership-2',
      tenantId: 'tenant-a',
      targetRole: Role.WORKSHOP_OWNER,
    });
    assert.equal(resultEqual.allowed, false);
    assert.match(resultEqual.reason ?? '', /Privilege escalation blocked/i);

    // Owner assigns WORKSHOP_MANAGER (lower role) -> Allowed
    const resultManager = evaluator.evaluate(owner, Action.ASSIGN_ROLE, ResourceType.USER_MEMBERSHIP, {
      id: 'membership-3',
      tenantId: 'tenant-a',
      targetRole: Role.WORKSHOP_MANAGER,
    });
    assert.equal(resultManager.allowed, true);

    // Owner assigns MECHANIC (lower role) -> Allowed
    const resultMechanic = evaluator.evaluate(owner, Action.ASSIGN_ROLE, ResourceType.USER_MEMBERSHIP, {
      id: 'membership-4',
      tenantId: 'tenant-a',
      targetRole: Role.MECHANIC,
    });
    assert.equal(resultMechanic.allowed, true);
  });

  // ============================================================================
  // Test 5: Propietario no puede modificar una reparación cerrada.
  // ============================================================================
  it('5. Propietario o mecánico no puede modificar una reparación cerrada o completada', () => {
    const evaluator = new ResourceAccessEvaluator();
    const mechanic = new AuthenticatedPrincipal({
      id: 'mech-1',
      email: 'mechanic@workshop.com',
      activeTenantId: 'tenant-a',
      sessionId: 'sess-1',
      memberships: [{ tenantId: 'tenant-a', role: Role.MECHANIC, status: 'active' }],
    });

    const closedWorkOrder = {
      id: 'wo-closed-1',
      tenantId: 'tenant-a',
      status: 'CLOSED',
    };

    const result = evaluator.evaluate(mechanic, Action.UPDATE, ResourceType.WORK_ORDER, closedWorkOrder);
    assert.equal(result.allowed, false);
    assert.match(result.reason ?? '', /CLOSED and cannot be modified/i);

    const completedWorkOrder = {
      id: 'wo-completed-1',
      tenantId: 'tenant-a',
      status: 'COMPLETED',
    };

    const resultCompleted = evaluator.evaluate(mechanic, Action.UPDATE, ResourceType.WORK_ORDER, completedWorkOrder);
    assert.equal(resultCompleted.allowed, false);
    assert.match(resultCompleted.reason ?? '', /COMPLETED and cannot be modified/i);
  });

  // ============================================================================
  // Test 6: Un enlace público no expone datos privados.
  // ============================================================================
  it('6. Un enlace público no expone datos privados (Vehicle Passport Sanitization)', () => {
    const privacyService = new VehicleHistoryPrivacyService();

    const rawRecords: ServiceRecord[] = [
      {
        id: 'rec-1',
        vehicleVin: '1HGCR2F8XHA000000',
        performingTenantId: 'workshop-alpha',
        performingWorkshopName: 'Alpha Motors',
        serviceDate: '2026-05-10',
        recordedMileage: 45000,
        serviceType: 'Brake Disc & Pads Replacement',
        isVerified: true,
        internalMechanicNotes: 'Customer argued about pricing; used discounted aftermarket rotors.',
        partsCost: 120.0,
        laborCost: 80.0,
        internalProfitMargin: 45.5,
        customerName: 'Juan Perez',
        customerPhone: '+5491123456789',
      },
    ];

    // Public view for prospective buyer
    const publicView = privacyService.sanitizeForPublicView(rawRecords);

    assert.equal(publicView.length, 1);
    const entry = publicView[0]!;
    assert.equal(entry.serviceType, 'Brake Disc & Pads Replacement');
    assert.equal(entry.recordedMileage, 45000);
    assert.equal(entry.workshopName, 'Alpha Motors');
    assert.equal(entry.isVerified, true);

    // Private and sensitive fields must NOT exist in the public projection
    assert.equal((entry as any).internalMechanicNotes, undefined);
    assert.equal((entry as any).partsCost, undefined);
    assert.equal((entry as any).laborCost, undefined);
    assert.equal((entry as any).internalProfitMargin, undefined);
    assert.equal((entry as any).customerName, undefined);
    assert.equal((entry as any).customerPhone, undefined);

    // External workshop inspecting vehicle history
    const workshopBetaView = privacyService.sanitizeForWorkshopView(rawRecords, 'workshop-beta');
    const betaEntry = workshopBetaView[0]!;
    assert.equal(betaEntry.isOwnRecord, false);
    assert.equal(betaEntry.internalNotes, undefined);
    assert.equal(betaEntry.financialDetails, undefined);
  });

  // ============================================================================
  // Test 7: Un archivo privado no es accesible por ID o URL predecible.
  // ============================================================================
  it('7. Un archivo privado no es accesible por ID o URL predecible (Presigned Tickets)', () => {
    const fileService = new FileSecurityService(FILE_SECRET);

    const principalTenantA = new AuthenticatedPrincipal({
      id: 'user-1',
      email: 'user@tenant-a.com',
      activeTenantId: 'tenant-a',
      sessionId: 'sess-1',
      memberships: [{ tenantId: 'tenant-a', role: Role.MECHANIC, status: 'active' }],
    });

    const principalTenantB = new AuthenticatedPrincipal({
      id: 'user-2',
      email: 'user@tenant-b.com',
      activeTenantId: 'tenant-b',
      sessionId: 'sess-2',
      memberships: [{ tenantId: 'tenant-b', role: Role.MECHANIC, status: 'active' }],
    });

    const privateEvidenceFile: PrivateFileMetadata = {
      id: 'e9b28b7a-9a99-4c07-b087-0b19b7d5a5cf',
      tenantId: 'tenant-a',
      fileName: 'engine_cylinder_damage.jpg',
      mimeType: 'image/jpeg',
      isPrivate: true,
      storageKey: 'tenants/tenant-a/evidence/a8f5f167f44f4964e6c998dee827110c.jpg',
    };

    // User A from tenant A can generate ticket
    const ticket = fileService.generatePresignedTicket(principalTenantA, privateEvidenceFile, 60);
    assert.ok(ticket.length > 30);

    // Verifying ticket grants access
    const verified = fileService.verifyPresignedTicket(ticket);
    assert.equal(verified.fileId, privateEvidenceFile.id);
    assert.equal(verified.tenantId, 'tenant-a');

    // User B from tenant B cannot generate ticket for file belonging to tenant A
    assert.throws(
      () => fileService.generatePresignedTicket(principalTenantB, privateEvidenceFile, 60),
      /Cannot generate download ticket for a file belonging to another workshop/i
    );

    // Guessing or tampering with ticket signature throws AccessDeniedError
    const tamperedTicket = ticket.slice(0, -5) + 'xxxxx';
    assert.throws(
      () => fileService.verifyPresignedTicket(tamperedTicket),
      /Invalid or forged file ticket signature/i
    );
  });

  // ============================================================================
  // Test 8: Cambiar IDs de recursos no permite acceder a otros tenants.
  // ============================================================================
  it('8. Cambiar IDs de recursos no permite acceder a otros tenants (BOLA / IDOR Protection)', () => {
    const evaluator = new ResourceAccessEvaluator();
    const principalTenantA = new AuthenticatedPrincipal({
      id: 'owner-1',
      email: 'owner@tenant-a.com',
      activeTenantId: 'tenant-a',
      sessionId: 'sess-owner',
      memberships: [{ tenantId: 'tenant-a', role: Role.WORKSHOP_OWNER, status: 'active' }],
    });

    // Attacker modifies URL parameter from id 'wo-101' (theirs) to 'wo-202' (belonging to tenant B)
    const targetResourceTenantB = {
      id: 'wo-202',
      tenantId: 'tenant-b',
    };

    const evaluation = evaluator.evaluate(
      principalTenantA,
      Action.READ,
      ResourceType.WORK_ORDER,
      targetResourceTenantB
    );

    assert.equal(evaluation.allowed, false);
    assert.match(evaluation.reason ?? '', /Cross-tenant violation/i);

    // Direct assertion at domain TenantContext level
    const tenantContext = new TenantContext('tenant-a');
    assert.throws(
      () => tenantContext.assertMatches('tenant-b'),
      (err: unknown) => err instanceof CrossTenantViolationError
    );
  });

  // ============================================================================
  // Test 9: Una sesión revocada deja de funcionar.
  // ============================================================================
  it('9. Una sesión revocada deja de funcionar inmediatamente', () => {
    const sessionService = new SessionService();
    const tokenService = new TokenService(JWT_SECRET, 900);
    const registry = new RoutePrivacyRegistry();
    const guard = new AuthenticationGuard(tokenService, sessionService, registry);

    const session = sessionService.createSession('user-1', 'tenant-a', 60);

    const accessToken = tokenService.generateAccessToken({
      sub: 'user-1',
      email: 'user@test.com',
      tenantId: 'tenant-a',
      sessionId: session.id,
      role: Role.MECHANIC,
      permissions: [Permission.WORKORDER_READ],
    });

    const mockRequest: HttpRequestContext = {
      path: '/api/v1/work-orders',
      method: 'GET',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    };

    // 1. Works while session is active
    assert.equal(guard.canActivate(mockRequest), true);
    assert.ok(mockRequest.principal);

    // 2. Revoke session
    sessionService.revokeSession(session.id);

    // 3. Request must now be denied
    assert.throws(
      () => guard.canActivate(mockRequest),
      (err: unknown) => err instanceof SessionRevokedError
    );
  });

  // ============================================================================
  // Test 10: Las rutas nuevas son privadas por defecto.
  // ============================================================================
  it('10. Las rutas nuevas son privadas por defecto (Deny-by-default routing)', () => {
    const sessionService = new SessionService();
    const tokenService = new TokenService(JWT_SECRET, 900);
    const registry = new RoutePrivacyRegistry();

    // Explicitly register ONLY login as public
    registry.registerPublicRoute('/api/v1/auth/login', 'POST');

    const guard = new AuthenticationGuard(tokenService, sessionService, registry);

    // Public route allows unauthenticated access
    const publicRequest = {
      path: '/api/v1/auth/login',
      method: 'POST',
      headers: {},
    };
    assert.equal(guard.canActivate(publicRequest), true);

    // Any new or unregistered route defaults to PRIVATE
    const brandNewRouteRequest = {
      path: '/api/v1/future-feature/telemetry',
      method: 'GET',
      headers: {},
    };

    assert.throws(
      () => guard.canActivate(brandNewRouteRequest),
      (err: unknown) => err instanceof AuthenticationRequiredError
    );
  });

  // ============================================================================
  // Additional Security Verification: Argon2id Hashing & Password Reset
  // ============================================================================
  it('Password hashing uses Argon2id format with timing-safe verification', async () => {
    const passwordService = new PasswordService();
    const plaintext = 'S3cure!P@ssw0rd#2026';

    const hash = await passwordService.hash(plaintext);
    assert.ok(hash.startsWith('$argon2id$v=19$m=65536,t=3,p=4$'));

    const isValid = await passwordService.verify(plaintext, hash);
    assert.equal(isValid, true);

    const isInvalid = await passwordService.verify('WrongPassword', hash);
    assert.equal(isInvalid, false);
  });

  it('Single-use password recovery token is invalidated after first use', () => {
    const resetService = new PasswordResetService(15);
    const { plaintextToken } = resetService.generateResetToken('user-victim-1');

    // First consumption succeeds
    const consumed = resetService.consumeResetToken(plaintextToken);
    assert.equal(consumed.userId, 'user-victim-1');

    // Second consumption must fail (single-use guarantee)
    assert.throws(() => resetService.consumeResetToken(plaintextToken));
  });

  it('Rate limiter blocks rapid requests exceeding threshold', () => {
    const limiter = new RateLimiter({ limit: 3, windowMs: 10000 });
    const ip = '192.168.1.50';

    assert.equal(limiter.isAllowed(ip).allowed, true);
    assert.equal(limiter.isAllowed(ip).allowed, true);
    assert.equal(limiter.isAllowed(ip).allowed, true);

    // 4th request must be blocked
    const fourth = limiter.isAllowed(ip);
    assert.equal(fourth.allowed, false);
    assert.ok(fourth.retryAfterMs && fourth.retryAfterMs > 0);
  });

  it('Audit logger automatically masks sensitive credentials', () => {
    const auditService = new AuditService();

    auditService.log({
      id: 'audit-1',
      timestamp: new Date().toISOString(),
      eventType: 'AUTH_LOGIN_SUCCESS' as any,
      outcome: 'ALLOW',
      details: {
        username: 'mechanic1',
        password: 'PlainTextSuperSecretPassword123',
        token: 'eyJhbGciOi...',
      },
    });

    const records = auditService.getRecords();
    assert.equal(records.length, 1);
    const details = records[0]!.details!;
    assert.equal(details['password'], '[REDACTED]');
    assert.equal(details['token'], '[REDACTED]');
    assert.equal(details['username'], 'mechanic1');
  });
});
