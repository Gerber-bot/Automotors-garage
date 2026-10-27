# Development Automation Scripts Reference

Automotors Garage provides a suite of PowerShell automation scripts located in `scripts/`. These scripts handle the local development lifecycle, environment diagnostics, testing, and demo seeding without external dependencies.

---

## 1. Scripts Catalog

| Script | Purpose | Key Parameters | Example Usage |
| :--- | :--- | :--- | :--- |
| `check-env.ps1` | Diagnoses runtime prerequisites and reports environment readiness. | `-Port <int>`, `-Silent` | `.\scripts\check-env.ps1 -Port 4000` |
| `setup-dev.ps1` | Creates `.data/`, `.run/`, `.logs/` and generates `.env` from template. | `-Force` | `.\scripts\setup-dev.ps1 -Force` |
| `start-dev.ps1` | Launches backend server in background (or foreground) with health verification. | `-Port <int>`, `-Foreground`, `-TimeoutSec <int>` | `.\scripts\start-dev.ps1 -Port 4000` |
| `stop-dev.ps1` | Safely terminates running server via PID file or listening port. | `-Port <int>`, `-Force` | `.\scripts\stop-dev.ps1 -Port 4000` |
| `restart-dev.ps1` | Stops running server, releases resources, and starts a fresh instance. | `-Port <int>`, `-Foreground` | `.\scripts\restart-dev.ps1 -Port 4000` |
| `check-health.ps1` | Probes `/health/live` and `/health/ready`, checking status codes and DB latency. | `-Port <int>`, `-Silent` | `.\scripts\check-health.ps1 -Port 4000` |
| `seed-demo.ps1` | Seeds realistic multi-tenant data into the specified database. | `-DataDir <path>`, `-Environment <string>` | `.\scripts\seed-demo.ps1 -DataDir ./.data/postgres_demo` |
| `start-demo.ps1` | Prepares demo database, runs seed, starts server, and shows demo guide. | `-Port <int>`, `-NoBrowser`, `-Foreground` | `.\scripts\start-demo.ps1 -Port 4000 -NoBrowser` |
| `run-tests.ps1` | Executes unit, integration, persistence, and E2E test suites sequentially. | `-Suite <all\|unit\|persistence\|e2e>` | `.\scripts\run-tests.ps1 -Suite all` |

---

## 2. npm Lifecycle Shortcuts

For convenience, the root `package.json` maps standard npm commands to the PowerShell scripts:

```json
{
  "scripts": {
    "dev": "powershell -ExecutionPolicy Bypass -File scripts/start-dev.ps1",
    "dev:demo": "powershell -ExecutionPolicy Bypass -File scripts/start-demo.ps1",
    "dev:stop": "powershell -ExecutionPolicy Bypass -File scripts/stop-dev.ps1",
    "dev:check": "powershell -ExecutionPolicy Bypass -File scripts/check-env.ps1",
    "test": "powershell -ExecutionPolicy Bypass -File scripts/run-tests.ps1",
    "typecheck": "tsc --noEmit"
  }
}
```

---

## 3. Detailed Script Descriptions

### `scripts/check-env.ps1`
- Validates that Node.js version is `>= 20.18.0`.
- Validates npm version.
- Validates PowerShell version (`5.1` or `7+`).
- Inspects monorepo workspaces (`apps/backend`, `apps/frontend`, `packages/database`, etc.).
- Verifies that TCP port (default: 4000) is unoccupied.
- Emits structured console output with color-coded tags (`[OK]`, `[WARN]`, `[FAIL]`).

### `scripts/start-dev.ps1`
- Checks for an already active server via `.run/server.pid` or port usage to prevent duplicate instances.
- Sets `NODE_ENV=development` and configures default storage to `./.data/postgres_dev`.
- Spawns background process using `Start-Process node` with separated stdout (`.logs/server_dev.log`) and stderr (`.logs/server_dev.err.log`).
- Actively polls `/health/live` up to `TimeoutSec` (default: 15s) before returning control.
- If server fails to boot, displays recent error logs immediately.

### `scripts/stop-dev.ps1`
- Reads `.run/server.pid` and confirms target process is indeed a `node` instance.
- Falls back to `Get-NetTCPConnection` if PID file is missing.
- Attempts graceful shutdown (`$process.CloseMainWindow()`), waits up to 4 seconds, and escalates to `Stop-Process -Force` if unresponsive.
- Removes `.run/server.pid` upon completion.

### `scripts/start-demo.ps1`
- Checks environment requirements via `check-env.ps1`.
- Populates `./.data/postgres_demo` with realistic sample workshops, mechanics, customers, vehicles, and certified work orders.
- Starts backend server with `NODE_ENV=demo`.
- Prints preconfigured workshop credentials (e.g., `mario@alphamotors.com / Password123!`) and guided demonstration steps.
- Optionally opens default web browser to `http://localhost:4000/demo`.

### `scripts/run-tests.ps1`
- Executes all 7 test suites sequentially with individual process isolation.
- Prevents resource starvation or lock collisions in PGlite.
- Measures individual suite runtimes and displays a consolidated summary table.
