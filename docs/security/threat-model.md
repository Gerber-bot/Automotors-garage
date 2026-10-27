# Threat Model & OWASP Security Assessment: Automotors Garage

This document provides a comprehensive threat analysis aligned with **STRIDE**, **OWASP API Security Top 10 (2023)**, and **OWASP ASVS v4.0.3 (Level 2 Standards)**.

---

## 1. STRIDE Threat Analysis

| Threat | Description & Attack Vector | Impact | Implemented Countermeasure | Verification Test |
| :--- | :--- | :--- | :--- | :--- |
| **Spoofing** | Attacker steals or forges JWT tokens to impersonate workshop staff. | Critical | Short-lived access tokens (15m), cryptographic HMAC-SHA256 signatures, Argon2id passwords, and instant session revocation checking on every request. | Test 9 (`SessionRevokedError`), Password Test |
| **Spoofing** | Attacker spoofs `x-tenant-id` header or URL parameter to impersonate another workshop. | Critical | `TenantGuard` and `TenantContext` derive tenant identity strictly from verified server-side JWT claims. Discrepancies trigger `CrossTenantViolationError`. | Test 2, Test 3, Test 8 |
| **Tampering** | Rogue technician or customer mutates repair estimates after customer approval or shop closing. | High | `ResourceAccessEvaluator` rejects updates on resources with status `CLOSED` or `COMPLETED`. Immutable audit logging. | Test 5 |
| **Tampering** | Attacker tampers with download tickets or file IDs to access unowned inspection media. | High | Cryptographically signed, time-limited presigned tickets containing HMAC signatures over `fileId:tenantId:userId:exp`. | Test 7 |
| **Repudiation** | User denies performing destructive action or sensitive data view. | Medium | `AuditService` records immutable, structured audit records capturing actor, IP, timestamp, action, and resource. | Test 14 |
| **Information Disclosure** | BOLA / IDOR: Attacker changes resource ID from `wo-1` to `wo-2` across tenants. | Critical | Multi-tenant repository queries scoped to `WHERE tenant_id = :activeTenantId AND id = :id`. Evaluator asserts tenant equality. | Test 8 |
| **Information Disclosure** | Public vehicle passport QR exposes private workshop profit margins or customer phone numbers. | High | `VehicleHistoryPrivacyService` strips all private fields (costs, margin, mechanic notes, customer phone). | Test 6 |
| **Denial of Service** | Credential stuffing or brute-force requests targeting `/auth/login` or password reset. | High | Token-bucket `RateLimiter` enforces strict request limits per IP/account with exponential backoff headers. | Test 13 |
| **Elevation of Privilege**| Workshop Manager attempts to grant themselves `WORKSHOP_OWNER` or `SUPER_ADMIN`. | Critical | `ROLE_HIERARCHY_LEVEL` enforcement in `ResourceAccessEvaluator` blocks assigning roles equal or superior to caller. | Test 4 |

---

## 2. OWASP API Security Top 10 (2023) Mapping

| OWASP Vulnerability | Risk Scenario | Automotors Garage Defense Implementation |
| :--- | :--- | :--- |
| **API1:2023 Broken Object Level Authorization (BOLA)** | User accesses repair orders or invoices of another workshop by altering URL IDs. | Strict `TenantGuard` and repository-level multi-tenant predicate scoping (`(id, tenant_id)`). Verified in Test 8. |
| **API2:2023 Broken Authentication** | Weak password hashing, credential stuffing, unrevoked tokens. | Argon2id hashing, short-lived JWTs (15 min), instant session revocation via `SessionService`. Rate-limited endpoints. |
| **API3:2023 Broken Object Property Level Authorization** | Mass assignment of `role`, `status`, or private internal notes. | Strict Zod DTO contracts and field projection sanitization (`VehicleHistoryPrivacyService`). |
| **API4:2023 Unrestricted Resource Consumption** | Rapid API calls or large audio file floods exhausting server CPU/memory. | Token-bucket rate limiting (`RateLimiter`), file size limits, non-blocking asynchronous audio processing. |
| **API5:2023 Broken Function Level Authorization (BFLA)** | Mechanics invoking admin endpoints (billing, role assignment). | `RoutePrivacyRegistry` (private-by-default) + RBAC permission guards in controllers and application use cases. |
| **API6:2023 Unrestricted Access to Sensitive Business Flows** | Automated bulk creation of fake repair tickets or scraping public passports. | CAPTCHA/rate limits on public passport views and authenticated session requirements on write flows. |
| **API7:2023 Server-Side Request Forgery (SSRF)** | Exploitation of webhook callbacks or remote image fetching. | Whitelisted outbound domains; no user-supplied URLs fetched without validation. |
| **API8:2023 Security Misconfiguration** | Verbose error stack traces or permissive CORS headers. | Strict CORS whitelist (`SecurityHeadersService`), non-leaking domain errors, secure HTTP response headers (CSP, HSTS). |
| **API9:2023 Improper Inventory Management** | Zombie or undocumented endpoints exposed without auth. | All new endpoints default to **PRIVATE**; public access requires explicit registration in `RoutePrivacyRegistry`. |
| **API10:2023 Unsafe Consumption of APIs** | LLM hallucinations or poisoned speech-to-text outputs persisted blindly. | Strict Zod schema validation applied to all AI outputs before database persistence. |

---

## 3. OWASP ASVS v4.0.3 Verification Summary

- **V2 (Authentication)**: Argon2id password storage (V2.1.1), Session termination and revocation (V3.3.1), Single-use password reset tokens (V2.5.4).
- **V3 (Session Management)**: Stateless access tokens + stateful revoked session registry (V3.2.1), Secure cookies (`HttpOnly`, `Secure`, `SameSite=Lax`) (V3.4.1).
- **V4 (Access Control)**: Deny-by-default routing (V4.1.1), Multi-tenant isolation at domain and database layers (V4.1.3), Attribute-based state lifecycle checks (V4.2.1).
- **V7 (Error Handling and Logging)**: Structured audit logging with automatic masking of sensitive attributes (`password`, `token`, `secret`) (V7.1.1).
- **V14 (Configuration)**: Strict Content-Security-Policy, HSTS, frame protection (V14.4.1).
