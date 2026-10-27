# Threat Model (STRIDE Methodology): Automotors Garage

This document provides a systematic threat analysis using the **STRIDE** methodology (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege).

---

## Threat Matrix

| Threat Category | Potential Attack Vector | Impact | Mitigation Strategy | Severity |
| :--- | :--- | :--- | :--- | :--- |
| **Spoofing** | Adversary attempts to forge user or mechanic identity via stolen JWT or session hijack. | High | Short-lived JWTs (15 min), Argon2id hashing, secure HttpOnly cookies, refresh token rotation with family revocation. | Critical |
| **Spoofing** | Attacker spoofs `tenant_id` in request body or header to access another workshop's records. | Critical | Enforce tenant resolution exclusively from signed JWT claims in server middleware. Ignore/reject client overrides. | Critical |
| **Tampering** | Rogue user modifies work order price, parts list, or inspection status after client approval. | High | Domain state machine guards; immutable audit log entries; cryptographic hash on approved work order revisions. | High |
| **Tampering** | Manipulated mileage data or altered vehicle repair history submitted to falsify digital vehicle passport. | High | Cryptographic signing of inspection reports, technician identity binding, evidence photos checksummed. | High |
| **Repudiation** | Workshop claims customer authorized an expensive repair without proof, or owner claims shop damaged vehicle. | Medium | Mandatory pre-work digital authorization signature; pre-repair photographic evidence vault with SHA-256 timestamps. | High |
| **Information Disclosure** | IDOR/BOLA: Tenant A requests `/api/v1/work-orders/{id}` belonging to Tenant B by guessing UUID. | Critical | Multi-tenant repository queries scoped by `(id, tenant_id)`. Negative integration tests run on every pull request. | Critical |
| **Information Disclosure** | Stack traces or SQL errors leaked to API consumers exposing internal database schema. | Medium | Global exception filter mapping technical errors to standardized RFC 7807 problem details; raw error details hidden in production. | Medium |
| **Denial of Service** | Flooding authentication endpoints or voice upload endpoints with large audio payloads. | High | IP and account-based rate limiting via Redis/throttler; maximum audio file size enforced at gateway (e.g., 25MB limit). | High |
| **Elevation of Privilege** | Mechanic modifies user profile payload to grant themselves `WORKSHOP_OWNER` or `SUPER_ADMIN` role. | Critical | Strict RBAC guards; role assignments permitted only by authorized admin endpoints with dedicated permission checks. | Critical |

---

## Negative Security Verification Plan
Automated tests in `tests/security/` must continuously verify:
1. Attempting to query another tenant's resource returns `404 Not Found` or `403 Forbidden`.
2. Accessing protected endpoints without an `Authorization` header returns `401 Unauthorized`.
3. Malformed JSON payloads or fields exceeding size limits are rejected with `400 Bad Request`.
4. Rapid-fire requests trigger `429 Too Many Requests`.
