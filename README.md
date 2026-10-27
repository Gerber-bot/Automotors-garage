# Automotors Garage

> Enterprise-grade B2B/B2C SaaS platform for mechanical repair shops, vehicle fleet owners, and verifiable vehicle history passports.

Part of the **Automotors** ecosystem.

---

## Key Features

- **Multi-Tenant Workshop Management**: Multiple branches, mechanic schedules, work stations.
- **Vehicle Registry & Digital Passport**: Verifiable service history, VIN inspection, QR code sharing.
- **Work Order Lifecycle**: Step-by-step state machine with mechanic checklists and audit trails.
- **Evidence Vault**: Pre/post repair photo and audio evidence secured with cryptographic SHA-256 hashes.
- **AI-Powered Diagnostics**: Voice-to-ticket speech transcription (Whisper) and predictive maintenance estimation.
- **Owner Portal**: Transparent repair tracking, digital quotes approval, and historical service passports.

---

## Architectural Stack

- **Monorepo**: `pnpm workspaces`
- **Backend**: NestJS Modular Monolith, Clean Architecture, TypeScript Strict
- **Database**: PostgreSQL with Drizzle ORM
- **Security**: Argon2id password hashing, stateless short-lived JWT, multi-tenant isolation, RBAC/ABAC
- **Frontend**: Next.js (App Router), React, Tailwind CSS, shadcn/ui
- **Validation & API**: Zod, OpenAPI 3.1
- **Testing**: Vitest (Unit/Integration), Playwright (E2E)

---

## Documentation Quick Links

- [Architecture Overview](docs/architecture/overview.md)
- [Module Map & Bounded Contexts](docs/architecture/modules.md)
- [Dependency & Inward Rules](docs/architecture/dependencies.md)
- [Security Model](docs/security/security-model.md)
- [Threat Model (STRIDE)](docs/security/threat-model.md)
- [Architecture Decisions (ADRs)](docs/decisions/)
- [OpenAPI & API Strategy](docs/api/openapi-strategy.md)
- [Development Guidelines](docs/development/guidelines.md)
- [Environment Setup & Onboarding](docs/development/environment-setup.md)
- [Multi-Agent Protocol](AGENTS.md)

---

## Getting Started

```bash
# 1. Clone & Setup environment
cp .env.example .env

# 2. Install dependencies
pnpm install

# 3. Start local backing services
docker compose up -d postgres

# 4. Run tests
pnpm test
```
