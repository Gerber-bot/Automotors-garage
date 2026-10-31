# Automotors Garage — Manual Acceptance Checklist

This checklist defines the manual validation procedure for verifying the stability, visual fidelity, security, and functional honesty of Automotors Garage prior to release or deployment.

---

## 1. Public Landing Page (`/`)

| # | Test Item | Verification Steps | Expected Result | Pass/Fail |
|---|---|---|---|---|
| 1.1 | **Visual Layout & Branding** | Access `http://localhost:3000/` in desktop and mobile viewports. | Dark slate canvas (`#020617`), emerald accents (`#10b981`), Lucide icons, responsive navigation without horizontal overflow. | [ ] |
| 1.2 | **Dual-Audience Value Proposition** | Verify presence of **Mi Automotors** (owners) and **Automotors Pro** (workshops) sections. | Clear distinction between private vehicle passport and professional shop management. | [ ] |
| 1.3 | **Commercial Copy Honesty** | Inspect all copy across features and disclaimers. | Zero exaggerated claims. Quick Service framed as "Registro ágil de servicios con confirmación humana". Auditability framed as "Historial digital con trazabilidad y correcciones auditables". | [ ] |
| 1.4 | **Interactive Navigation Links** | Click "Ver Demo Propietario" and "Ver Demo Taller" buttons. | Seamless client-side routing to `/demo/propietario` and `/demo/taller` without page refresh errors. | [ ] |
| 1.5 | **Access to Operator Login** | Click "Ingresar al Sistema" in the top navigation bar. | Smoothly switches to the authenticated login interface (`LoginView`). | [ ] |

---

## 2. Interactive Demo — Mi Automotors (`/demo/propietario`)

| # | Test Item | Verification Steps | Expected Result | Pass/Fail |
|---|---|---|---|---|
| 2.1 | **Zero-Auth Sandbox Access** | Navigate directly to `/demo/propietario` without active session cookies or JWT. | Demo loads immediately without 401/403 redirects or authentication prompts. | [ ] |
| 2.2 | **Vehicle Switcher** | Toggle between Toyota Corolla Hybrid (`AF123CD`) and Ford Ranger 4x4 (`AD456EF`). | Vehicle passport metrics, VIN, odometer, and maintenance records update dynamically. | [ ] |
| 2.3 | **Timeline Certification Levels** | Check the timeline entries for badges and provenance. | High-trust workshop repairs display `CERTIFICADO POR TALLER`; user declarations display `DECLARADO POR PROPIETARIO`. | [ ] |
| 2.4 | **Client-Side Maintenance Logging** | Fill in the maintenance form (Service, Workshop, Mileage, Date, Cost) and submit. | Entry prepends immediately to the timeline in local memory. | [ ] |
| 2.5 | **Synthetic Isolation & Disclaimers** | Verify absence of backend network calls and inspect footer disclaimer. | Disclaims sandbox environment; no `fetch` or `XMLHttpRequest` emitted to backend. | [ ] |

---

## 3. Interactive Demo — Automotors Pro (`/demo/taller`)

| # | Test Item | Verification Steps | Expected Result | Pass/Fail |
|---|---|---|---|---|
| 3.1 | **Workshop Dashboard Overview** | Navigate to `/demo/taller` and inspect metrics. | Displays simulated shop "Garage Pro Centro", operator "Mario Rossi", active bays, and 4 sample work orders. | [ ] |
| 3.2 | **Tab Navigation** | Switch between "Órdenes de Trabajo", "Quick Service Express", "Diagnóstico OBD-II", and "Directorio de Clientes". | Content transitions instantly with high-density automotive data cards. | [ ] |
| 3.3 | **Quick Service with Human Confirmation** | Open Quick Service tab, select a vehicle, enter mileage, select service items, and submit. | Requires mandatory human confirmation modal before committing simulated order. | [ ] |
| 3.4 | **OBD-II Diagnostic Simulator** | Select diagnostic code (`P0300`, `P0171`, or `P0420`) and trigger scan. | Displays severity badge, freeze-frame data, root cause hypothesis, and guided verification steps. | [ ] |
| 3.5 | **Zero Elevation / Security Invariant** | Inspect session storage and network console. | No `SUPER_ADMIN` elevation, no synthetic tokens stored, 100% in-memory state. | [ ] |

---

## 4. Authentication, Security & Multi-Tenancy

| # | Test Item | Verification Steps | Expected Result | Pass/Fail |
|---|---|---|---|---|
| 4.1 | **Form Validation** | Submit empty login form or invalid email format. | Displays clear inline validation errors; no unhandled exceptions. | [ ] |
| 4.2 | **Argon2id & JWT Authentication** | Authenticate with valid tenant credentials (`admin@alphamotors.com`). | Issues valid short-lived JWT, stores session token safely, and sets tenant context header. | [ ] |
| 4.3 | **Cross-Tenant Boundary Enforcement** | Attempt accessing resources of Tenant B while authenticated under Tenant A. | Backend responds with 403 Forbidden; tenant context strictly derived from JWT. | [ ] |
| 4.4 | **SUPER_ADMIN Protection** | Check user management interfaces and API routes. | `SUPER_ADMIN` role cannot be self-assigned or created via public registration. | [ ] |

---

## 5. Dual-Engine Database Architecture

| # | Test Item | Verification Steps | Expected Result | Pass/Fail |
|---|---|---|---|---|
| 5.1 | **Embedded PGlite Default** | Boot application with `DB_PROVIDER=pglite`. | Runs zero-config in WASM mode with local persistence under `.data/`. | [ ] |
| 5.2 | **Native PostgreSQL Compatibility** | Set `DB_PROVIDER=postgres` with valid `DATABASE_URL` in test environment. | Connects to PostgreSQL, executes reversible migrations, and verifies schema parity. | [ ] |
| 5.3 | **Migration Integrity** | Run `npm run db:migrate` or automated database test suite. | Migrations `0001`, `0002`, and `0003` apply sequentially without syntax errors. | [ ] |
