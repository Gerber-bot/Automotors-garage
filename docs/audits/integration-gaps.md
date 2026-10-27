# Automotors Garage — Integration Gaps & Architectural Discrepancies

## Overview
This document analyzes the current discrepancies between the frontend user experience, backend domain use cases, and shared contract specifications, establishing a clear roadmap for end-to-end integration.

---

## 1. Identified Integration Discrepancies

### A. HTTP Controller Layer vs In-Memory Use Cases
- **Gap**: The backend application currently contains rich domain services and use cases (`CreateVehicleUseCase`, `CreateWorkOrderUseCase`, `CloseWorkOrderUseCase`, `ProcessVoiceNoteUseCase`), but lacks NestJS/Fastify HTTP controllers and route handlers.
- **Current Bridge**: Integration tests invoke use case classes directly in memory.
- **Target Architecture**: Create `@Controller()` routes in `apps/backend/src/infrastructure/http/` that parse request DTOs with Zod/Pipes, invoke the corresponding use cases, and translate domain `Result<T>` into standard HTTP status codes (`200 OK`, `201 Created`, `400 Bad Request`, `403 Forbidden`, `404 Not Found`).

### B. Frontend Mock Fallback vs Real Backend
- **Gap**: The frontend `ApiClient` (`apps/frontend/src/api/client.ts`) targets an optional `baseUrl` (defaulting to `/api/v1`). If the network request fails, it silently switches to synthetic data from `mock-backend.ts`.
- **Current Bridge**: This allows frontend UI prototyping and local usability testing without running the backend server.
- **Target Architecture**:
  1. Add an explicit environment switch: `NEXT_PUBLIC_ENABLE_MOCK_FALLBACK=false` for staging and production.
  2. Implement an HTTP reverse proxy or Next.js rewrite rules directing `/api/v1/*` to the NestJS backend port (e.g. `http://localhost:4000/api/v1`).

### C. Contract Synchronization (Backend Zod vs Frontend Zod)
- **Gap**: Contracts are currently defined in two places:
  - `apps/frontend/src/api/contracts.ts` (Zod schemas for quick service, proposals, vehicle creation).
  - Domain validation inside `apps/backend/src/modules/*/domain/`.
- **Target Architecture**: Extract canonical data contracts into a shared workspace package: `packages/contracts/`. Both `apps/backend` (for request validation pipes) and `apps/frontend` (for React Hook Form schemas) will import from `@automotors/contracts`.

### D. File Evidence Storage (S3 / MinIO vs Presigned HMAC)
- **Gap**: `FileSecurityService` generates presigned ticket tokens for evidence files, but there is no actual S3/MinIO bucket connection for binary uploads.
- **Current Bridge**: The frontend `EvidenceUploader` component simulates file selection and upload progress.
- **Target Architecture**: Integrate an AWS S3 / Cloudflare R2 / MinIO adapter implementing multipart presigned upload URLs.

---

## 2. Integration Gap Matrix

| Area | Current Implementation | Target Implementation | Priority |
| :--- | :--- | :--- | :--- |
| **HTTP Transport** | Direct class invocation in tests | NestJS Controllers with OpenAPI / Swagger | `P0` (Blocking E2E) |
| **Persistence** | In-memory `Map` repositories | PostgreSQL + Drizzle ORM Repositories | `P0` (Blocking E2E) |
| **Contracts** | Localized in `apps/frontend` and backend | Shared `packages/contracts` monorepo package | `P1` (Refactoring) |
| **Session State** | In-memory Map in `SessionService` | Redis session store with TTL | `P1` (High Security) |
| **Evidence Vault**| Local simulation | S3/MinIO signed upload/download URLs | `P2` (Next Stage) |

---

## 3. End-to-End Flow Readiness

The logic required for the core business flow (**Quick Service Entry -> Voice Dictation -> AI Extraction -> Human Confirmation -> Work Order Creation -> Work Order Closure -> Immutable Passport Entry**) is 100% verified in domain code.

Connecting these components requires:
1. Exporting HTTP controllers in NestJS for:
   - `POST /api/v1/auth/login`
   - `GET /api/v1/vehicles?query=...`
   - `POST /api/v1/ai/voice-intake`
   - `POST /api/v1/work-orders/quick-service`
   - `POST /api/v1/work-orders/:id/close`
   - `GET /api/v1/vehicles/:id/passport`
2. Replacing `InMemory*Repository` with `Drizzle*Repository` running against PostgreSQL.
