# ADR-001: Modular Monolith with Clean Architecture and pnpm Workspaces

## Status
Accepted

## Context
Automotors Garage is a complex SaaS domain covering workshop operations, vehicle passports, work orders, multimedia evidence, and AI assistance. We need high developer velocity, clear domain boundaries, and strong maintainability without premature distributed systems overhead (microservices latency, distributed transactions, complex network topologies).

## Decision
1. **Monorepo Structure**: Use `pnpm workspaces` to manage backend (`apps/backend`), frontend (`apps/frontend`), and shared libraries (`packages/*`).
2. **Architecture**: Implement a **Modular Monolith** using **Clean Architecture** (Ports & Adapters).
   - Core domain logic is encapsulated inside bounded context modules (`apps/backend/src/modules/*`).
   - Domain layers are pure TypeScript, decoupled from NestJS, Express, or Drizzle ORM.
   - Application use cases expose Ports; infrastructure adapters implement them.
3. **Inter-Module Communication**:
   - In-process module façades for read operations.
   - In-process domain events for asynchronous decoupling.

## Consequences
### Positive:
- Single deployment pipeline and atomic commits across backend, frontend, and contracts.
- Clear module boundaries prevent spaghetti code and facilitate future extraction to microservices if scale requires it.
- Independent testability of core business logic without booting database or web servers.

### Negative / Trade-offs:
- Requires strict discipline and linter enforcement to prevent cross-module coupling.
- Initial project scaffolding requires more boilerplate than a simple MVC architecture.
