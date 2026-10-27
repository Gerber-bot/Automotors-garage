# Automotors Garage — Roadmap & Next Milestones

## Engineering Roadmap: From Core Domain to Production

Following the completion of **Milestone 06 (Architecture Audit & Project Consolidation)**, the business logic, security foundation, deterministic calculations, and frontend experience have been proven with 40 automated tests and zero TypeScript errors.

The next phases transition the system from in-memory prototyping to high-performance, distributed, enterprise-grade production readiness.

---

## Milestone 07: Persistent Database & ACID Transactions (P0)

**Target**: Implement `packages/database` with PostgreSQL and Drizzle ORM.

### Key Objectives:
1. **Drizzle ORM Schemas**:
   - `tenants`, `users`, `user_tenants` (multi-tenant IAM).
   - `vehicles` (UUID primary key, indexed VIN, plate, current mileage).
   - `work_orders`, `work_order_interventions`, `work_order_corrections`.
   - `maintenance_records`, `maintenance_criteria_met` (immutable audit ledger).
   - `audit_logs` (tamper-evident security audit).
2. **Reversible Migrations**:
   - Set up Drizzle Kit with up/down migration scripts.
3. **Drizzle Repository Adapters**:
   - Implement `DrizzleVehicleRepository`, `DrizzleWorkOrderRepository`, `DrizzleMaintenanceHistoryRepository`.
   - Implement PostgreSQL atomic transactions (`db.transaction(async (tx) => { ... })`) for `CloseWorkOrderUseCase`.
4. **Integration Tests with Testcontainers**:
   - Spin up ephemeral PostgreSQL containers to verify constraints, unique indexes, and rollback behavior.

---

## Milestone 08: Distributed Session Store & Shared Rate Limiting (P1)

**Target**: Production-grade Redis integration.

### Key Objectives:
1. **Redis Session Store**:
   - Transition `SessionService` from in-memory Maps to Redis with automatic TTL expiration.
   - Implement cluster-wide token blacklisting for instant cross-pod session revocation.
2. **Distributed Sliding-Window Rate Limiter**:
   - Replace in-memory `RateLimiter` with Redis sorted sets to protect public endpoints and login attempts across multiple containers.
3. **Pub/Sub Event Bus**:
   - Dispatch domain events (`WorkOrderClosedEvent`, `MaintenanceDueWarningEvent`) across decoupled worker microservices.

---

## Milestone 09: DevOps, Containerization & CI/CD Pipeline (P1)

**Target**: Automated delivery pipeline and reproducible development environment.

### Key Objectives:
1. **Local Multi-Service Docker Compose**:
   - Services: PostgreSQL 16 (Alpine), Redis 7 (Alpine), LocalStack / MinIO, Backend API, Frontend Web.
2. **Multi-Stage Dockerfiles**:
   - Unprivileged `node` user, minimal distroless/alpine images, optimized layer caching for pnpm monorepo.
3. **GitHub Actions CI Workflow**:
   - Automated typechecking (`npm run typecheck`), linting, and test execution (`npm test`) on every PR.
   - Enforce zero build regressions and zero security vulnerabilities.

---

## Milestone 10: Evidence Vault & Multi-Tenant S3 Storage (P2)

**Target**: Secure photographic and documentary evidence pipeline.

### Key Objectives:
1. **S3 / Cloudflare R2 / MinIO Storage Adapter**:
   - Implement multipart presigned upload URLs generated on the server with short lifespans (5 minutes).
2. **Client-side Direct Upload**:
   - Connect frontend `EvidenceUploader` to upload directly to object storage via presigned URLs.
3. **Antivirus & Malware Scanning**:
   - Asynchronous file validation before marking evidence as `CERTIFIED`.
