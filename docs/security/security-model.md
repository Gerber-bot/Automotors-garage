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
