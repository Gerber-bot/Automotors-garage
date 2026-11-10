# Local Development Setup Guide

This guide describes how to configure and run **Automotors Garage** on a local development workstation running Windows with PowerShell.

Before the first launch, follow [Windows development without containers](environment-setup.md) to explicitly prepare the database. The regular start scripts verify the migration state; they must not apply pending migrations.

---

## 1. Prerequisites

Before starting, ensure your system meets the following requirements:

| Tool | Minimum Version | Recommended Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Node.js** | `24.x` | `24.x` | JavaScript runtime with `--experimental-strip-types` and optional `.env` loading |
| **npm** | `>= 10.0.0` | `11.x` | Monorepo package management |
| **PowerShell** | `5.1` (Desktop) | `7.x` (Core) | Execution environment for development automation scripts |
| **Git** | `2.30+` | Latest | Version control |

> **Note on PostgreSQL:**  
> A dedicated external PostgreSQL instance is **not** required for local development or demonstrations. The system automatically initializes an embedded WebAssembly-based PostgreSQL engine (**PGlite**) backed by isolated directories on disk (`.data/postgres_dev` and `.data/postgres_demo`).

---

## 2. Automated Diagnostic & Initialization

Automotors Garage provides two scripts to prepare your environment in seconds:

### Step 1: Diagnose Environment
Run the environment verification script to check Node.js, npm, PowerShell, port availability, and directory structures:

```powershell
powershell -ExecutionPolicy Bypass -File "Scripts de ejecucion automatica/utilities/check-env.ps1" -Port 4000
```

Alternatively, use npm:
```bash
npm run dev:check
```

### Step 2: Initialize Runtime Folders & Environment Files
Run the setup script to create local runtime folders (`.data/`, `.run/`, `.logs/`) and generate `.env` from `.env.example`:

```powershell
powershell -ExecutionPolicy Bypass -File "Scripts de ejecucion automatica/utilities/setup-dev.ps1" -Force
```

---

## 3. Environment Separation

Automotors Garage isolates data storage by environment:

| Environment | Variable `NODE_ENV` | Storage Path | Usage |
| :--- | :--- | :--- | :--- |
| **Development** | `development` | `./.data/postgres_dev` | Day-to-day feature development with persistent schema |
| **Demo** | `demo` | `./.data/postgres_demo` | Interactive showroom with idempotent multi-tenant seed data |
| **Test** | `test` | In-memory / Isolated temp dirs | Automated test suites (`npm test`) without cross-contamination |
| **Production** | `production` | External PostgreSQL pool | Strict connection pool with production safeguards |

---

## 4. Starting the Application

Automotors Garage boots **Full Stack** (Backend API on 4000 + Next.js SaaS on 3000):

### Option A: One-Click Windows Launchers
Double-click inside `Scripts de ejecucion automatica/`:
- `INICIAR_COMPLETO.bat`: Standard local development.
- `INICIAR_COMPLETO_MODO_LAN.bat`: LAN development for testing on mobile devices.

### Option B: npm CLI
```bash
# Standard local start
npm run dev

# Local Area Network (LAN) start
npm run dev:lan
```

---

## 5. Stopping the Application

To cleanly terminate active instances, release ports, and safely flush database write-ahead logs:

Double-click `Scripts de ejecucion automatica/DETENER_AUTOMOTORS.bat` or run:
```bash
npm run dev:stop
```
Or via npm:
```bash
npm run dev:stop
```

---

## 6. Accessing Endpoints

Once the server is running:

- **Web Dashboard / Demo UI**: [http://localhost:4000/demo](http://localhost:4000/demo)
- **API Base**: [http://localhost:4000/api/v1](http://localhost:4000/api/v1)
- **Liveness Probe**: [http://localhost:4000/health/live](http://localhost:4000/health/live)
- **Readiness Probe**: [http://localhost:4000/health/ready](http://localhost:4000/health/ready)
