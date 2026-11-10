# Full Stack Local Development Environment

## Overview & Architecture

Automotors Garage provides an integrated local development environment for Windows. It orchestrates the **Node.js backend API** (with embedded PGlite persistence in development) on port `4000` and the **Next.js 15 frontend** on port `3000`, with same-origin API proxying and per-installation process tracking. The database must be prepared explicitly before the first launch; startup must not apply migrations.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        DEVELOPER / BROWSER CLIENT                       │
│          http://localhost:3000 (Desktop) or http://<LAN_IP>:3000 (Mobile)       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Same-Origin Requests
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    NEXT.JS 15 FRONTEND (PORT 3000)                     │
│  - App Router, Tailwind CSS, Lucide React Iconography, Dark Theme     │
│  - Same-origin API rewrites: /api/v1/:path* -> http://127.0.0.1:4000    │
│  - No client-side storage of refresh tokens or secrets                 │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Proxied /api/v1 & /health HTTP calls
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      BACKEND REST API (PORT 4000)                      │
│  - Modular Monolith, JWT Session Validation, Tenant Isolation Guard    │
│  - Embedded PostgreSQL PGlite (.data/postgres_dev or .data/postgres_demo)│
│  - Legacy Demo UI preserved at http://localhost:4000/demo              │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Quick Launchers & Commands

### Windows One-Click Double-Click Launchers (`Scripts de ejecucion automatica/`)

| Batch File | Target Service | Script Executed | Description |
| :--- | :--- | :--- | :--- |
| `INICIAR_COMPLETO.bat` | Full Stack | `powershell/automotors.ps1 -Action START` | Validates environment, launches backend (4000), checks `/health/ready`, launches Next.js (3000), and opens browser. |
| `INICIAR_COMPLETO_MODO_LAN.bat` | Full Stack (LAN) | `powershell/automotors.ps1 -Action START-LAN` | Launches full stack bound to local Wi-Fi IP for testing on phones/tablets via same-origin Next.js proxy. |
| `DETENER_AUTOMOTORS.bat` | Full Stack Stop | `powershell/automotors.ps1 -Action STOP` | Stops both frontend and backend processes cleanly and releases ports 3000 and 4000. |
| `COMPROBAR_ENTORNO.bat` | Environment Diagnostic | `powershell/automotors.ps1 -Action CHECK` | Non-destructive validation of Windows, Node.js, npm, dependencies, ports, and LAN connectivity. |

### PowerShell CLI Commands

```powershell
# Check environment requirements
powershell -ExecutionPolicy Bypass -File "Scripts de ejecucion automatica/powershell/automotors.ps1" -Action CHECK

# Launch Full Stack (Default: Backend 4000 + Frontend 3000)
powershell -ExecutionPolicy Bypass -File "Scripts de ejecucion automatica/powershell/automotors.ps1" -Action START

# Launch Full Stack in LAN Mode (for mobile / tablet testing over Wi-Fi)
powershell -ExecutionPolicy Bypass -File "Scripts de ejecucion automatica/powershell/automotors.ps1" -Action START-LAN

# Stop Full Stack
powershell -ExecutionPolicy Bypass -File "Scripts de ejecucion automatica/powershell/automotors.ps1" -Action STOP

# Check Health & Readiness
powershell -ExecutionPolicy Bypass -File "Scripts de ejecucion automatica/utilities/check-health.ps1" -Port 4000
```

---

## 2. Ports & Network URLs

| Component | Default Port | Local URL | LAN URL (with `-LAN`) |
| :--- | :--- | :--- | :--- |
| **Frontend SaaS Dashboard** | `3000` | `http://localhost:3000/` | `http://<LAN_IP>:3000/` |
| **Backend REST API** | `4000` | `http://localhost:4000/api/v1` | `http://<LAN_IP>:4000/api/v1` |
| **Legacy Embedded Demo UI** | `4000` | `http://localhost:4000/demo` | `http://<LAN_IP>:4000/demo` |
| **Backend Health Live** | `4000` | `http://localhost:4000/health/live` | `http://<LAN_IP>:4000/health/live` |
| **Backend Health Ready** | `4000` | `http://localhost:4000/health/ready` | `http://<LAN_IP>:4000/health/ready` |

---

## 3. Same-Origin Proxying & Networking Architecture

To avoid Cross-Origin Resource Sharing (CORS) complications and maintain cookie/header security, Next.js implements internal rewrites in [`apps/frontend/next.config.mjs`](../../apps/frontend/next.config.mjs):

- Browser requests to `/api/v1/:path*` are rewritten on the server side to `http://127.0.0.1:4000/api/v1/:path*`.
- Browser requests to `/health/:path*` are rewritten to `http://127.0.0.1:4000/health/:path*`.
- Client sessions transmit JWT authentication and `x-tenant-id` securely across same-origin requests.
- Refresh tokens are never stored in `localStorage`; session state is managed via secure, bounded token lifecycles.

---

## 4. Process Tracking & Log Diagnostics

The managed Windows launcher records each process in `.run/`:
- Backend identity: `.run/backend.process.json`
- Frontend identity: `.run/frontend.process.json`

These records include the installation root and process creation time; a PID alone is **not** proof of ownership. Local shutdown controls live in `.run/*.control.json`; keep this directory private. If an identity cannot be verified, the launcher must leave the process alone rather than using a port number as permission to stop it.

Log streams are output to `.logs/`:
- `server_dev.log` / `server_dev.err.log`: Backend console output, route logs, and PGlite initialization.
- `frontend_dev.log` / `frontend_dev.err.log`: Next.js development server output, page compilation, and static route traces.

To tail logs in real time from PowerShell:
```powershell
Get-Content .logs/frontend_dev.log -Wait
Get-Content .logs/server_dev.log -Wait
```

---

## 5. Mobile & LAN Access

When invoking `INICIAR_COMPLETO_MODO_LAN.bat`:
1. The script identifies the host machine's private IPv4 address on the active network adapter (e.g., `192.168.1.50`).
2. Both backend and frontend bind to `0.0.0.0`.
3. Open mobile Safari / Chrome on any phone connected to the same Wi-Fi network and navigate to:
   `http://192.168.1.50:3000/`
4. The mobile layout adapts immediately with bottom navigation bar, safe-area inset padding (`env(safe-area-inset-bottom)`), and touch targets of >= 44px.

---

## 6. Troubleshooting & Common Issues

| Issue | Root Cause | Solution |
| :--- | :--- | :--- |
| **Port 3000 or 4000 already occupied** | This instance or another application is using the port. | Inspect the process owner before changing ports; never stop another installation to free a port. |
| **Next.js returns 500 when calling `/api/v1`** | The backend on port 4000 is not running. | Verify backend health at `http://127.0.0.1:4000/health/ready`. |
| **PGlite database lock** | Another process may be using this installation's data directory. | Do not delete lock files or data; inspect the owning process and use this installation's shutdown script only after verifying its identity. |
| **Mobile device cannot connect via Wi-Fi** | Windows Firewall is blocking incoming connections on port 3000 or 4000. | Allow inbound TCP traffic for Node.js in Windows Defender Firewall for Private Networks. |
