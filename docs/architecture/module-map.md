# Automotors Garage — Modular Monolith Architecture & Module Map

## 1. Monorepo Structural Map

Automotors Garage is organized as a modular monorepo governed by **Clean Architecture** and **Ports & Adapters (Hexagonal)** principles:

```text
AutomotorsGarage/
├── packages/
│   ├── tsconfig/                  # Shared compiler configurations
│   ├── security-foundation/       # Multi-tenant security kernel & policies
│   ├── contracts/                 # [Planned] Shared Zod schemas & DTOs
│   └── database/                  # [Planned] PostgreSQL + Drizzle ORM schemas
├── apps/
│   ├── backend/                   # NestJS Modular Monolith API
│   │   ├── src/
│   │   │   ├── shared/            # Shared Kernel (Entity, Result, Value Objects)
│   │   │   └── modules/
│   │   │       ├── vehicle/       # Vehicle registration, VIN validation & duplicate checks
│   │   │       ├── work-orders/   # Work order state machine & closure workflows
│   │   │       ├── maintenance-history/      # Immutable passport projections & criteria
│   │   │       └── maintenance-intelligence/ # Deterministic engine & AI assistance
│   │   └── test/                  # Module unit & integration test suites
│   └── frontend/                  # Next.js App Router Web Application
│       ├── src/
│       │   ├── api/               # Centralized HTTP client, contracts, and mock backend
│       │   ├── app/               # App router pages and layouts (Dashboard, Passport)
│       │   └── components/        # UI component library (Domain & Layout)
│       └── test/                  # Frontend component & contract tests
└── docs/                          # Architecture Decision Records, security & audit specs
```

---

## 2. Bounded Contexts & Module Boundaries

### Module 1: Security Foundation (`@automotors/security-foundation`)
- **Responsibility**: Multi-tenancy isolation, authentication, session tokens, RBAC hierarchy, resource ownership evaluation, and audit logging.
- **Strict Invariants**:
  - No database dependencies. Operates as an independent security kernel.
  - Deny-by-default routing: any route not explicitly declared public requires an active authenticated session.
  - Cross-tenant boundaries strictly enforced: `principal.tenantId === resource.tenantId`.

### Module 2: Vehicle Management (`apps/backend/src/modules/vehicle`)
- **Responsibility**: Vehicle catalog, technical identity, VIN decoding, and duplicate prevention.
- **Key Entities**: `Vehicle` (UUID identity), `LicensePlate` (Value Object), `VIN` (Value Object).
- **Invariants**:
  - Internal identity NEVER relies solely on the license plate.
  - License plate is unique only when actively registered to a vehicle.
  - Odometer can never decrease (mileage monotonicity invariant).

### Module 3: Work Orders (`apps/backend/src/modules/work-orders`)
- **Responsibility**: Workshop service execution, mechanic assignments, diagnosis records, and state transitions.
- **Key Entities**: `WorkOrder`, `Intervention`, `SparePart`.
- **States**: `DRAFT -> OPEN -> IN_PROGRESS -> WAITING_APPROVAL -> COMPLETED / CANCELLED`.
- **Invariants**:
  - Closed work orders are strictly immutable.
  - Post-closure amendments require explicit `AppendWorkOrderCorrectionUseCase` preserving the original audit trail.

### Module 4: Maintenance History (`apps/backend/src/modules/maintenance-history`)
- **Responsibility**: Immutable public and private maintenance records, digital vehicle passport, and verification level scoring.
- **Key Entities**: `MaintenanceRecord`, `VerificationLevelEvaluator`.
- **Verification Levels**:
  - `DECLARED`: Unverified self-report or basic shop record.
  - `WORKSHOP_VERIFIED`: Registered garage with certified mechanic.
  - `CERTIFIED_NETWORK`: Authorized network with invoice and cryptographic evidence ticket.
- **Privacy Rule**: Public passport projections MUST sanitize all customer PII, labor rates, and internal mechanic notes.

### Module 5: Maintenance Intelligence (`apps/backend/src/modules/maintenance-intelligence`)
- **Responsibility**: Deterministic preventive schedule calculation, voice-to-text intake, OBD2 interpretation, and AI proposal extraction.
- **Sub-engines**:
  1. *Deterministic Engine*: Zero hallucinations. Strict mathematical and interval table calculations.
  2. *AI Engine*: Structured suggestion and voice processing with **mandatory human confirmation**.

---

## 3. Clean Architecture Naming Conventions

All modules follow standardized layer separation and naming conventions:

| Layer | File Pattern | Examples |
| :--- | :--- | :--- |
| **Domain Entities** | `*.entity.ts` or `*.ts` in `domain/` | `vehicle.ts`, `work-order.ts`, `maintenance-record.ts` |
| **Value Objects** | `*.vo.ts` or in `domain/` | `license-plate.ts`, `vin.ts` |
| **Domain Repositories (Ports)**| `*-repository.interface.ts` | `vehicle-repository.interface.ts`, `work-order-repository.interface.ts` |
| **Use Cases (Application)** | `*.use-case.ts` in `use-cases/` | `create-vehicle.use-case.ts`, `close-work-order.use-case.ts` |
| **Infrastructure Adapters** | `*.adapter.ts` or `in-memory-*.repository.ts` | `openai-ai.adapter.ts`, `in-memory-vehicle.repository.ts` |
| **HTTP Controllers** | `*.controller.ts` in `infrastructure/http/` | `vehicles.controller.ts`, `work-orders.controller.ts` |
| **DTOs & Contracts** | `*.dto.ts` or `contracts.ts` | `create-vehicle.dto.ts`, `quick-service-entry.schema.ts` |
