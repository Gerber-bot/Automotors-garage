# Development Automation Scripts Reference

Automotors Garage consolidates its automation scripts into the folder `Scripts de ejecucion automatica/`. This architecture provides unified full-stack startup, LAN/mobile access, safe shutdown, and database utilities without external dependencies or Docker.

---

## 1. Unified Architecture Overview

```text
Scripts de ejecucion automatica/
├── INICIAR_COMPLETO.bat           # One-click full-stack launcher (Backend + Frontend Next.js)
├── INICIAR_COMPLETO_MODO_LAN.bat  # Full-stack launcher bound to private LAN IPv4 for mobile testing
├── DETENER_AUTOMOTORS.bat         # Clean shutdown of both Next.js (3000) and API Backend (4000)
├── COMPROBAR_ENTORNO.bat          # Non-destructive environment and dependencies diagnostic tool
├── powershell/
│   └── automotors.ps1             # Central PowerShell controller (Actions: START, START-LAN, STOP, CHECK)
├── database/
│   ├── seed-demo.ps1              # PowerShell wrapper for seed generation
│   ├── seed-demo.ts               # Demo data seeder for local development
│   └── verify-postgresql-native.ps1 # Verification script for native Windows PostgreSQL 16
└── utilities/
    ├── check-env.ps1              # Pre-flight environment check (Node, npm, PowerShell, ports)
    ├── check-health.ps1           # Readiness probe for backend (/health/ready) and persistence
    ├── process-utils.ps1          # Centralized process verification, LAN IP detection & safe PID cleanup
    ├── run-tests.ps1              # Sequential test runner with per-suite process isolation
    └── setup-dev.ps1              # Workspace initialization (.env, .data, .run, .logs)
```

---

## 2. Windows Batch Launchers

Located inside `Scripts de ejecucion automatica/`:

| Launcher | Mode | Function |
| :--- | :--- | :--- |
| `COMPROBAR_ENTORNO.bat` | Environment Diagnostic | Inspects OS, Node.js, npm, Git, directory structure, dependencies, ports, and LAN connectivity without making any changes. |
| `INICIAR_COMPLETO.bat` | Standard Local | Validates Node.js & dependencies, checks environment, boots Backend (4000) with PGlite, waits for `/health/ready`, boots Next.js (3000) on `127.0.0.1`, and opens browser to `http://localhost:3000/`. |
| `INICIAR_COMPLETO_MODO_LAN.bat` | LAN / Mobile | Identifies the physical active Wi-Fi/LAN IPv4, binds Next.js to `0.0.0.0`, forwards API calls via Next.js BFF proxy to `127.0.0.1:4000`, and displays mobile URLs (`http://<LAN_IP>:3000/demo/propietario`). |
| `DETENER_AUTOMOTORS.bat` | Service Shutdown | Identifies running Frontend (3000) and Backend (4000) processes using PID files and TCP verification, safely terminates processes, removes stale PID files, and preserves `.data/` and `.logs/`. |

---

## 3. npm Lifecycle Commands

The root `package.json` maps developer commands to `Scripts de ejecucion automatica/`:

```json
{
  "scripts": {
    "dev": "powershell -ExecutionPolicy Bypass -File \"Scripts de ejecucion automatica/powershell/automotors.ps1\" -Action START",
    "dev:lan": "powershell -ExecutionPolicy Bypass -File \"Scripts de ejecucion automatica/powershell/automotors.ps1\" -Action START-LAN",
    "dev:stop": "powershell -ExecutionPolicy Bypass -File \"Scripts de ejecucion automatica/powershell/automotors.ps1\" -Action STOP",
    "dev:check": "powershell -ExecutionPolicy Bypass -File \"Scripts de ejecucion automatica/powershell/automotors.ps1\" -Action CHECK",
    "dev:health": "powershell -ExecutionPolicy Bypass -File \"Scripts de ejecucion automatica/utilities/check-health.ps1\"",
    "seed:demo": "node --experimental-strip-types \"Scripts de ejecucion automatica/database/seed-demo.ts\"",
    "test": "node --experimental-strip-types --test ...",
    "lint": "eslint . --ext .ts,.tsx",
    "typecheck": "tsc --project ... --noEmit"
  }
}
```

---

## 4. Key Subroutines & Utilities

### `automotors.ps1`
- **Action `START`**: Boots backend on port 4000, awaits readiness, boots Next.js 15 on port 3000, and opens browser.
- **Action `START-LAN`**: Detects private network IP (`192.168.x.x`), boots services with `HOST=0.0.0.0`, and outputs LAN URLs for smartphones/tablets.
- **Action `STOP`**: Gracefully stops both Node processes without data loss.

### `utilities/check-env.ps1`
- Validates Node.js (`>= 20.18.0`), npm (`>= 10.0.0`), PowerShell version, required workspace paths, and available TCP ports.

### `utilities/check-health.ps1`
- Probes `/health/ready`, checking status codes, database response, and latencies.

### `database/seed-demo.ts`
- Seeds realistic workshops, technicians, vehicle knowledge base items, and certified service history into local PGlite or native PostgreSQL.
