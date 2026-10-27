# Architecture Overview: Automotors Garage

## Executive Summary
**Automotors Garage** is an enterprise-grade B2B/B2C SaaS platform serving mechanical repair shops, fleet operators, and vehicle owners. It provides multi-tenant shop management, work orders, repair histories with cryptographic or verifiable evidence, predictive maintenance scheduling, AI-assisted voice-to-ticket transcription, and a verifiable public/permissioned vehicle history passport.

---

## Architectural Principles & Paradigm

The platform is designed following **Clean Architecture**, **Hexagonal (Ports & Adapters)** principles, and **Domain-Driven Design (DDD)** packaged as a **Modular Monolith** inside a pnpm monorepo.

```
       +-------------------------------------------------------+
       |               Interface Adapters                      |
       |  (REST Controllers, CLI, GraphQL/gRPC, Web UI)        |
       |                                                       |
       |     +-------------------------------------------+     |
       |     |          Application Services             |     |
       |     |     (Use Cases, Commands, Queries)        |     |
       |     |                                           |     |
       |     |     +-------------------------------+     |     |
       |     |     |       Domain Core             |     |     |
       |     |     |  (Entities, Value Objects,    |     |     |
       |     |     |   Domain Events, Contracts)   |     |     |
       |     |     +-------------------------------+     |     |
       |     |                                           |     |
       |     +-------------------------------------------+     |
       |                           ^                           |
       |                           |                           |
       |                 Dependency Inversion                  |
       |                           |                           |
       |     +-------------------------------------------+     |
       |     |         Infrastructure Adapters           |     |
       |     |  (PostgreSQL/Drizzle, S3, OpenAI, Redis)  |     |
       |     +-------------------------------------------+     |
       +-------------------------------------------------------+
```

### Core Invariants:
1. **Framework Independence**: The core business domain does not depend on NestJS, Express, Next.js, or Drizzle ORM.
2. **Dependency Inversion**: Application use cases depend on abstract ports (interfaces); infrastructure adapters implement those ports.
3. **Bounded Contexts**: Distinct modules (e.g., Workshops, Vehicles, WorkOrders, Invoices) communicate via strict public interfaces or asynchronous in-process domain events.
4. **Multi-Tenancy Isolation**: Strict tenant scoping at the repository level; tenant IDs are derived exclusively from verified server session tokens.

---

## High-Level Monorepo Topology

```
automotors-garage/
├── apps/
│   ├── backend/             # NestJS Modular Monolith API
│   │   ├── src/
│   │   │   ├── modules/     # Domain bounded contexts
│   │   │   ├── shared/      # Cross-cutting concerns (logging, security)
│   │   │   └── main.ts
│   │   └── test/
│   └── frontend/            # Next.js App Router (Shop Dashboard & Owner Portal)
│       ├── src/
│       │   ├── app/
│       │   ├── components/  # shadcn/ui & atomic components
│       │   └── hooks/
├── packages/
│   ├── shared-kernel/       # Core primitives, Result monad, base entities
│   ├── contracts/           # Shared Zod schemas, DTOs, OpenAPI types
│   ├── database/            # Drizzle schemas, migrations, seeders
│   ├── ui/                  # Shared design system components
│   └── tsconfig/            # Shared compiler configurations
├── docs/                    # Architectural, security, and developer docs
├── .agents/                 # Multi-agent definitions and protocols
├── docker-compose.yml       # Local development backing services
└── pnpm-workspace.yaml      # Monorepo workspaces definition
```

---

## Target Technology Matrix

| Layer | Technology | Selection Rationale |
| :--- | :--- | :--- |
| **Language** | TypeScript (Strict) | End-to-end type safety, unified language across backend & frontend |
| **Backend Framework**| NestJS | Robust modular structure, dependency injection, OpenAPI decorators |
| **Frontend Framework**| Next.js (App Router)| Server-side rendering, performant layouts, optimized asset delivery |
| **UI Components** | Tailwind CSS + shadcn/ui | Accessible, headless, customizable UI primitives |
| **Persistence** | PostgreSQL + Drizzle ORM | High reliability, relational integrity, lightweight SQL-first type safety |
| **Data Validation** | Zod | Runtime schema validation matching compile-time TypeScript types |
| **Testing** | Vitest & Playwright | Ultra-fast unit testing, reliable cross-browser E2E testing |
| **Containerization** | Docker | Deterministic local and production runtime environments |
