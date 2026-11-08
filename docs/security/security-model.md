# Security Model: Automotors Garage

## Core Security Philosophy
Automotors Garage implements **Defense in Depth**, **Least Privilege**, and **Deny-by-Default**. The system processes commercial workshop records, customer contact details, vehicle ownership proofs, and financial invoices. Security is treated as a first-class architectural concern.

---

## 1. Authentication & Session Management

- **Password Hashing**:
  - Hashing algorithm: **Argon2id** (RFC 9106 recommended).
  - Defaults: Memory Cost = 64 MB (65536 KiB), Time Cost = 3 iterations, Parallelism = 4 threads.
  - Plaintext passwords never touch logs or error messages.
- **Token Architecture**:
  - Stateless **Access Tokens (JWT)**: Short lifespan (15 minutes). Contains `sub` (User ID), `tenant_id`, `roles`, and `permissions`.
  - Stateful **Refresh Tokens**: Long lifespan (7 days). Stored hashed in PostgreSQL with device fingerprinting and family revocation (anti-replay attack protection).
  - Web clients: Tokens transmitted via `HttpOnly`, `Secure`, `SameSite=Lax` cookies to prevent XSS leakage.

---

## 2. Multi-Tenant Isolation Strategy

Multi-tenancy isolation is enforced at multiple defense rings:

1. **Ring 1: Gateway / Middleware**:
   - Extract `tenant_id` exclusively from the authenticated and cryptographically signed JWT.
   - Any client-submitted `tenant_id` in query parameters or request bodies that mismatches the token context is immediately rejected with `403 Forbidden`.
2. **Ring 2: Application Layer**:
   - Every use case command accepts a verified `TenantContext` object passed from the controller via dependency injection.
3. **Ring 3: Database & Repository Layer**:
   - All tenant-scoped entities include `tenant_id NOT NULL`.
   - Repositories automatically apply `WHERE tenant_id = :tenant_id` clauses to all SELECT, UPDATE, and DELETE queries.
   - Automated integration tests assert that Tenant A can never retrieve or mutate Tenant B records (IDOR/BOLA prevention).

---

## 3. Authorization (RBAC & ABAC)

Granular permissions follow the format: `<resource>:<action>` (e.g., `workorder:create`, `workorder:approve`, `invoice:read`).

### Default Roles:
- **SUPER_ADMIN**: Platform operator (tenant management, audit oversight).
- **WORKSHOP_OWNER**: Administrative lead for a tenant shop (billing, staff, settings).
- **WORKSHOP_MANAGER**: Service advisor, work order management, customer estimates.
- **MECHANIC**: Diagnostic notes, checklist completion, voice recordings.
- **VEHICLE_OWNER**: Customer portal read access to vehicle passports and approved service records.

---

## 4. Cryptographic Integrity & Evidence Vault

- Inspection photos, pre/post repair media, and audio recordings are stored in S3/MinIO.
- When an asset is uploaded:
  1. A SHA-256 cryptographic digest is computed on the server.
  2. The digest, timestamp, tenant ID, and creator ID are recorded immutably in `evidence_assets`.
  3. Pre-signed upload/download URLs are ephemeral (max 15-minute validity).
- This guarantees verifiable audit trails in case of insurance claims or customer disputes.

---

## 5. Defense Mechanisms

- **SQL Injection Prevention**: Parameterized queries enforced via Drizzle ORM query builder. Raw string concatenation is prohibited by linter rules.
- **XSS & Content Security**: Strict input validation using Zod; HTML entity escaping; strict Content Security Policy (CSP) headers enabled via Helmet.
- **Rate Limiting**: Redis-backed token bucket rate limiters protecting authentication endpoints (`/auth/login`, `/auth/refresh`, `/auth/forgot-password`).
- **Audit Logging**: Sensitive operations (role changes, price modifications, record deletions, passport sharing) emit structured audit records with IP and user metadata.

## 6. HTTP Input and Database Configuration Limits

- JSON request bodies are limited to **1 MiB** while streaming. Larger requests receive `413 Payload Too Large` with `Connection: close`; reads are paused, the response is flushed, and the rejected socket is closed. A 1-second teardown deadline handles clients that do not read the response. Rejected bodies are not drained indefinitely or reused for another request.
- Body reading has a **5-second idle timeout** and a **30-second absolute deadline**, returning `408 Request Timeout` and closing the connection. Body timers/listeners are removed on completion, error, abort, or rejection. Valid requests retain normal keep-alive behavior. These limits begin when JSON parsing starts; they are not a replacement for edge header/rate/connection limits.
- Invalid JSON receives `400 Bad Request`. Complete legitimate bodies, including exactly 1 MiB, remain accepted; clients must finish uploads within the documented deadlines.
- Production PostgreSQL must be configured with `DATABASE_URL` or explicit host, user, password, and database settings. The legacy `postgres`/`postgres` defaults are retained only for non-production local development.
- Production URLs require `postgres:`/`postgresql:`, a valid DNS/IP host, and nonblank explicit user, password, and database. Malformed percent escapes and URL query overrides of connection identity are rejected. Errors do not include URLs or credentials. Local URLs without credentials remain supported outside production.
