# ADR-002: Multi-Tenancy Isolation and JWT Identity Strategy

## Status
Accepted

## Context
Automotors Garage is a multi-tenant platform where multiple independent repair shops store sensitive customer, pricing, and business information. Cross-tenant data leakage is an unacceptable risk. We need a performant, fail-safe multi-tenancy strategy.

## Decision
1. **Shared Database, Discriminator Column (`tenant_id`)**:
   - Every tenant-scoped table includes `tenant_id UUID NOT NULL REFERENCES tenants(id)`.
   - Compound indexes on `(tenant_id, id)` and critical lookup columns.
2. **Identity-Derived Tenant Context**:
   - `tenant_id` is extracted strictly from the validated JWT token signed by the backend.
   - Any client attempt to send a differing `tenant_id` header or body parameter is discarded or rejected.
3. **Repository Guard Rails**:
   - Repository base classes and query builders mandate a `tenant_id` predicate for all tenant-scoped operations.
4. **Security Testing**:
   - Automated IDOR/BOLA test suites execute in CI to continuously verify tenant isolation.

## Consequences
### Positive:
- Simplified database migrations and lower operational infrastructure cost compared to database-per-tenant.
- Strong defense-in-depth: authentication guarantees tenant identity; repositories guarantee data scoping.

### Negative / Trade-offs:
- Strict vigilance required in manual SQL queries to ensure `tenant_id` is never omitted.
