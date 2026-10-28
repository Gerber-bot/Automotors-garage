# Full Stack Local Development Environment

## Overview & Architecture

Automotors Garage provides an integrated local Full Stack development environment for Windows. It orchestrates the **NestJS modular backend** (with embedded PostgreSQL PGlite persistence) on port `4000` and the **Next.js 15 commercial SaaS frontend** on port `3000` simultaneously, maintaining strict multi-tenant isolation, same-origin API proxying, and PID tracking.

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

### Windows One-Click Double-Click Launchers (Project Root)

| Batch File | Target Service | Script Executed | Description |
| :--- | :--- | :--- | :--- |
| `INICIAR_STACK_COMPLETO.bat` | Full Stack | `scripts/start-stack.ps1` | Validates environment, launches backend (4000), checks `/health/ready`, launches Next.js (3000), and opens browser. |
| `DETENER_STACK_COMPLETO.bat` | Full Stack | `scripts/stop-stack.ps1` | Stops both frontend and backend processes cleanly and releases ports 3000 and 4000. |
| `INICIAR_FRONTEND.bat` | Frontend Only | `scripts/start-frontend.ps1` | Starts Next.js 15 on port 3000 in background, writes PID, opens browser. |
| `DETENER_FRONTEND.bat` | Frontend Only | `scripts/stop-frontend.ps1` | Stops only the Next.js process associated with port 3000. |
| `INICIAR_AUTOMOTORS.bat` | Backend Only | `scripts/start-dev.ps1` | Starts backend on port 4000 in background with PGlite dev persistence. |
| `DETENER_AUTOMOTORS.bat` | Backend Only | `scripts/stop-dev.ps1` | Stops only the backend process on port 4000. |

### PowerShell CLI Commands

```powershell
# Launch Full Stack (Default: Backend 4000 + Frontend 3000)
powershell -ExecutionPolicy Bypass -File scripts/start-stack.ps1

# Launch Full Stack with Demo Seeds
powershell -ExecutionPolicy Bypass -File scripts/start-stack.ps1 -Demo

# Launch Full Stack in LAN Mode (for mobile / tablet testing over Wi-Fi)
powershell -ExecutionPolicy Bypass -File scripts/start-stack.ps1 -LAN

# Stop Full Stack
powershell -ExecutionPolicy Bypass -File scripts/stop-stack.ps1

# Check Health & Readiness
powershell -ExecutionPolicy Bypass -File scripts/check-health.ps1 -Port 4000
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

To avoid Cross-Origin Resource Sharing (CORS) complications and maintain cookie/header security, Next.js implements internal rewrites in [`apps/frontend/next.config.mjs`](file:///c:/Users/feder/OneDrive/Escritorio/proyecto/AutomotorsGarage/apps/frontend/next.config.mjs):

- Browser requests to `/api/v1/:path*` are rewritten on the server side to `http://127.0.0.1:4000/api/v1/:path*`.
- Browser requests to `/health/:path*` are rewritten to `http://127.0.0.1:4000/health/:path*`.
- Client sessions transmit JWT authentication and `x-tenant-id` securely across same-origin requests.
- Refresh tokens are never stored in `localStorage`; session state is managed via secure, bounded token lifecycles.

---

## 4. Process Tracking & Log Diagnostics

Every service registers its operating system process ID inside the `.run/` directory:
- Backend: `.run/server.pid`
- Frontend: `.run/frontend.pid`

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

When invoking `start-stack.ps1 -LAN`:
1. The script identifies the host machine's private IPv4 address on the active network adapter (e.g., `192.168.1.50`).
2. Both backend and frontend bind to `0.0.0.0`.
3. Open mobile Safari / Chrome on any phone connected to the same Wi-Fi network and navigate to:
   `http://192.168.1.50:3000/`
4. The mobile layout adapts immediately with bottom navigation bar, safe-area inset padding (`env(safe-area-inset-bottom)`), and touch targets of >= 44px.

---

## 6. Troubleshooting & Common Issues

| Issue | Root Cause | Solution |
| :--- | :--- | :--- |
| **Port 3000 or 4000 already occupied** | A previous Node instance is lingering or another application is using the port. | Run `DETENER_STACK_COMPLETO.bat` or `powershell -File scripts/stop-stack.ps1 -Force`. |
| **Next.js returns 500 when calling `/api/v1`** | The backend on port 4000 is not running. | Verify backend health at `http://127.0.0.1:4000/health/ready`. |
| **PostgreSQL PGlite database lock** | Dirty shutdown left unreleased lock in `.data/postgres_dev`. | Check for running node processes using `scripts/stop-dev.ps1`. The engine features fail-safe recovery. |
| **Mobile device cannot connect via Wi-Fi** | Windows Firewall is blocking incoming connections on port 3000 or 4000. | Allow inbound TCP traffic for Node.js in Windows Defender Firewall for Private Networks. |
