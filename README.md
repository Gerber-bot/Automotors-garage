# Automotors Garage

> Enterprise-grade B2B/B2C SaaS platform for mechanical repair shops, vehicle fleet operators, and verifiable vehicle history passports.

Part of the **Automotors** ecosystem.

---

## Experiences & Key Features

### 1. Automotors Pro — Talleres y Operación
- **Multi-Tenant Workshop Management**: Multiple branches, mechanic allocation, work stations, and operational metrics.
- **Work Order Lifecycle**: Deterministic state machine (`PENDING_DIAGNOSIS` -> `DIAGNOSED` -> `APPROVED` -> `IN_PROGRESS` -> `QUALITY_CHECK` -> `READY_FOR_PICKUP` -> `DELIVERED`).
- **Quick Service Express**: Rapid service logging with mandatory human-in-the-loop confirmation.
- **OBD-II Diagnostics**: Integration with standard OBD-II diagnostic fault codes (`P0300`, `P0171`, `P0420`), freeze-frame inspection, and guided repair steps.
- **Audit Trails & Security**: Strict RBAC/ABAC authorization, Argon2id password hashing, and zero cross-tenant leakage.

### 2. Mi Automotors — Propietarios y Flotas
- **Digital Vehicle Passport**: Comprehensive service history, VIN inspection, odometer tracking, and certified provenance.
- **Multi-Level Provenance**: Visual distinction between `CERTIFICADO POR TALLER` (workshop-verified records) and `DECLARADO POR PROPIETARIO` (owner-declared maintenance).
- **Public Interactive Demos**: Fully functional zero-auth demonstrations available at `/demo/propietario` and `/demo/taller`.

---

## Architectural Stack

- **Monorepo**: npm workspaces architecture
- **Backend**: NestJS Modular Monolith, Clean Architecture, TypeScript Strict
- **Database Engine**: Dual-Engine Architecture
  - **PGlite (Embedded WASM)**: Zero-configuration default for rapid local development and isolated testing.
  - **PostgreSQL 16 (Native)**: Production-ready engine with connection pooling and reversible Drizzle migrations.
- **Security Foundation**: Argon2id password hashing, short-lived JWTs, multi-tenant isolation, tamper-evident audit trails.
- **Frontend**: Next.js 15 (App Router), React 19, Tailwind CSS, Lucide React icons, dark-slate visual identity.
- **Testing**: Vitest (Unit and Integration), Playwright (E2E acceptance).

---

## Documentation Quick Links

- [Architecture Overview](docs/architecture/overview.md)
- [Module Map & Bounded Contexts](docs/architecture/modules.md)
- [Database Strategy (Dual Engine)](docs/architecture/database-strategy.md)
- [Demo Experience Architecture](docs/architecture/demo-experience-architecture.md)
- [Security Model](docs/security/security-model.md)
- [Threat Model (STRIDE)](docs/security/threat-model.md)
- [Verified Features Matrix](docs/product/verified-features.md)
- [Landing Content Policy](docs/product/landing-content-policy.md)
- [Manual Acceptance Checklist](docs/testing/manual-acceptance-checklist.md)
- [Multi-Agent Protocol](AGENTS.md)

---

## Getting Started

### Prerequisites
- Node.js >= 20.x
- npm >= 10.x
- PowerShell 7+ (Windows development)

### 1. Setup Environment
```bash
# Clone the repository
git clone https://github.com/Gerber-bot/Automotors-garage.git
cd Automotors-garage

# Copy environment template
cp .env.example .env

# Install dependencies across all workspaces
npm install
```

### 2. Run Quality Checks
```bash
# Typecheck all packages and applications
npm run typecheck

# Code quality and style linting
npm run lint

# Automated test suites
npm test
```

### 3. Launch Development Server
```bash
# Start backend (port 4000) and frontend (port 3000)
npm run dev
```

Alternatively, use the Windows launcher batch scripts in the repository root:
- `INICIAR_AUTOMOTORS.bat`: Boots the system with environment and health checks.
- `INICIAR_DEMO.bat`: Boots in isolated demonstration mode.
- `DETENER_AUTOMOTORS.bat`: Safely releases processes and ports.
- `EJECUTAR_TESTS.bat`: Runs full test suites sequentially.
