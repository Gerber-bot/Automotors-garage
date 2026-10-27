# Milestone 07 — Security Review & Audit Report

## Executive Summary
This security review evaluates the production-grade persistence foundation, transactional boundaries, and multi-tenant isolation implemented in Milestone 07 for **Automotors Garage**.

---

## 1. Critical Security Controls Audit

### A. Cross-Tenant Isolation
- **Mechanism**: All tenant-scoped entities (`customers`, `work_orders`, `maintenance_records`, `workshop_members`, `idempotency_keys`) contain a mandatory `workshop_id` foreign key.
- **Repository Filtering**: Repository adapters (`PostgresWorkOrderRepository`, `PostgresCustomerRepository`) enforce compound predicates: `WHERE id = :id AND workshop_id = :tenantId`.
- **Server-Side Token Derivation**: The tenant context is strictly derived from the verified JWT claims and session state. A request supplying an arbitrary `x-tenant-id` header is cross-checked against the authenticated user's active membership via `TenantGuard.canActivate()`.
- **Negative Testing Proof**: Integration test `14 & 15` proves that Workshop B cannot read or close an order owned by Workshop A, returning a clean domain failure without leaking record existence.

### B. Privilege Escalation Prevention
- **Role Hierarchy**: `SUPER_ADMIN (100) > WORKSHOP_OWNER (80) > WORKSHOP_MANAGER (60) > MECHANIC (40) > VEHICLE_OWNER (20)`.
- **Invariant**: Users cannot assign roles equal to or higher than their own level, nor can they promote their own membership.
- **Database Uniqueness**: The `workshop_members` table enforces a compound unique constraint: `UNIQUE(workshop_id, user_id)`, preventing privilege duplication or duplicate membership injection.

### C. Session Persistence & Token Revocation
- **Architecture**: In-memory session maps have been replaced with `PostgresSessionRepository`.
- **Persistence Across Restarts**: Active and revoked sessions are persisted in the PostgreSQL `sessions` table.
- **Revocation Propagation**: When a session is revoked, the database record is updated (`is_revoked = true, revoked_at = NOW()`). Any application instance or rebooted pod validating the session receives `SessionRevokedError` immediately.
- **Negative Testing Proof**: Integration test `18` verifies that instantiating a fresh service against the same database continues to reject revoked sessions.

### D. Credential Security & Password Hashing
- **Algorithm**: Passwords are saved with Argon2id parameters (Memory: 65536 KiB, Time: 3 iterations, Parallelism: 4) and timing-safe verification.
- **Reset Tokens**: Password reset tokens are generated with 256 bits of cryptographically secure entropy and stored strictly as SHA-256 hashes (`password_reset_tokens.token_hash`). Single-use consumption invalidates the token immediately.

---

## 2. High-Severity Safeguards Audit

### A. SQL Injection Immunity
- **ORM / Query Builder**: All queries use Drizzle ORM's parameterized AST (`eq()`, `and()`, `ilike()`).
- **Raw SQL Elimination**: Zero raw string interpolation (`$query = "SELECT ... $userInput"`) exists anywhere in the codebase.
- **DDL Isolation**: Schema migrations are versioned static SQL files validated prior to execution.

### B. Broken Object Level Authorization (BOLA / IDOR)
- **Primary Keys**: Entities use cryptographically random UUID v4 values (`gen_random_uuid()`), preventing sequential ID harvesting.
- **Resource Ownership**: Before mutation, the use case validates that the aggregate's `tenantId` matches the caller's active tenant ID.

### C. ACID Transactional Integrity
- **Atomicity**: `PostgresUnitOfWork` executes work order closures within a PostgreSQL transaction block (`BEGIN ... COMMIT / ROLLBACK`).
- **Guaranteed Consistency**:
  1. Work order status transitions to `COMPLETED`.
  2. Vehicle odometer is updated monotonically.
  3. Immutable `maintenance_records` row is created.
  4. `outbox_events` row is persisted for event-driven asynchronous propagation.
  5. `idempotency_keys` row is saved.
- **Rollback Verification**: If any invariant fails (e.g., odometer rollback or database failure), the entire unit of work aborts and rolls back cleanly without leaving orphan records.

---

## 3. Medium & Low Severity Safeguards

### A. Secure HTTP Transport & Headers
- **Security Headers**: All API responses emitted by `HttpApp` include:
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains`
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Content-Security-Policy: default-src 'self'`
  - `Referrer-Policy: strict-origin-when-cross-origin`
- **Error Obfuscation**: Internal database error details and stack traces are suppressed in HTTP 500 responses (`{ "error": "Internal server error." }`).

### B. Frontend Mock Fallback Isolation
- **Rule**: `ApiClient` has been hardened to prevent automatic silent fallbacks to `mock-backend.ts` in production.
- **Behavior**: When an API request fails, an explicit `Error` is thrown, allowing the UI to display controlled error states rather than fictitious vehicle data.
