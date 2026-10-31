# Milestone 10 — Professional Frontend Rebuild Architecture

**Document Version:** 1.0.0  
**Status:** Certified / Production Ready  
**Milestone:** 10 — Professional Frontend Rebuild  
**Role:** Principal Frontend Architect, Senior Product Designer & Mobile Experience Engineer  

---

## 1. Executive Summary

Milestone 10 transitions **Automotors Garage** from a single-file demonstration template (`demo-web-ui.ts`) to a commercial-grade, multi-device **Next.js 15 App Router** frontend (`apps/frontend/`). The new frontend delivers a sophisticated automotive dark theme, replaces all emojis with structured **Lucide React** iconography, provides an adaptive dual App Shell (Desktop compact sidebar vs Mobile fixed bottom navigation with elevated Quick Service action), and integrates directly with the backend REST API (`port 4000`) while preserving strict multi-tenant authorization (`x-tenant-id`) and Clean Architecture contracts.

---

## 2. Design System & Visual Identity

### Color Tokens
* **Base Background**: Deep Slate 950 (`#020617` / `rgb(2, 6, 23)`).
* **Card & Panel Surfaces**: Slate 900 (`#0f172a`), Slate 900/80 with backdrop blur.
* **Borders & Dividers**: Slate 800 (`#1e293b`), Slate 700 on hover.
* **Brand Primary Accent**: Emerald 500 (`#10b981`), Emerald 400 (`#34d399`), Emerald 950/40 glow.
* **Semantic Status**:
  * *Active / In Progress*: Amber 400 (`#fbbf24`), Amber 950/40.
  * *Completed / Certified*: Emerald 400 (`#34d399`), Emerald 950/40.
  * *Alert / Critical*: Rose 400 (`#fb7185`), Rose 950/40.
  * *OEM Preventive / Info*: Sky 400 (`#38bdf8`), Sky 950/40.

### Typography & Iconography
* **Primary Sans**: `Inter` (`wght 300..900`) for high-legibility UI labels, buttons, and headers.
* **Monospace**: `JetBrains Mono` (`wght 400..700`) for license plates, VIN chassis numbers, odometer numbers, and technical identifiers.
* **Iconography**: **100% Lucide React icons** (`Gauge`, `Zap`, `Wrench`, `Car`, `ShieldCheck`, `Clock`, `Sparkles`, `Plus`, `Search`, `Building2`, `User`, `LogOut`, `CheckCircle2`, `AlertTriangle`, `Menu`, `X`, `RefreshCw`, `ChevronRight`, `Info`, `Eye`, `Lock`, `Settings`). **Zero emojis** in production UI.

---

## 3. App Shell Architecture

The user interface automatically adapts between desktop and mobile viewport contexts:

### Desktop Experience (`≥ 1024 px`)
* **Left Sidebar Navigation** (`w-64`, fixed width, blurred translucent background):
  * Automotive Brand header with status pulse.
  * Direct navigation links with active state pill styling.
  * Live order and fleet count badges (`workOrders.length`, `vehicles.length`).
  * Bottom operator selector card (`Mario Rossi` vs `Lucas Gómez`).
  * Active workshop card (`Alpha Motors Garage` / `Beta Service`) with one-click switcher.
  * Logout icon button.

### Mobile Experience (`< 1024 px`)
* **Top Header**:
  * Compact brand pill (`AUTOMOTORS SaaS`).
  * Truncated workshop name (`Alpha Motors Garage`).
  * Active operator badge and drawer menu button.
* **Fixed Mobile Bottom Navigation Bar**:
  * Fixed at `bottom: 0`, styled with `bg-slate-900/95 backdrop-blur-lg border-t border-slate-800`.
  * Incorporates safe area padding: `pb-[max(0.5rem,env(safe-area-inset-bottom))]`.
  * Elevated center Action Button: Floating Quick Service FAB (`⚡ Zap`, `-mt-6`, emerald gradient, 48×48 px).
  * Main container includes `pb-28` to ensure zero content clipping behind the navigation bar.
* **"Más" Bottom Sheet Drawer**:
  * Mobile slide-up drawer for secondary flows: Digital Passport, OEM Preventive, AI Voice Dictation & OBD-2, Settings & PostgreSQL Demo Re-seeding.

---

## 4. Implemented Screens & Workflows

1. **Dashboard (`DASHBOARD`)**:
   * Operational greeting with active operator and workshop.
   * 4 KPI summary cards (Active Orders, Completed Orders, Fleet in Workshop, OEM Preventive Services).
   * Star Feature Quick Service banner.
   * Featured vehicle inspection card (VW Golf VII AE123CD) with real-time mileage.
   * Recent work orders list with direct transactional close button.
2. **Quick Service Entry (`QUICK_SERVICE`)**:
   * Frictionless tactile flow designed for under 60-second completion.
   * Vehicle selector with instant odometer preview.
   * Large odometer input (`inputmode="numeric"`, `pattern="[0-9]*"`) with `+100`, `+500`, `+1,000` km touch helpers.
   * Common service pills with active toggle state (`:has(:checked)`).
   * AI Voice Dictation simulator with mandatory human review checkbox (`requiresConfirmation: true`).
   * Idempotent atomic submission to backend `/api/v1/work-orders/quick-service`.
3. **Work Orders (`WORK_ORDERS`)**:
   * Status filter tabs (All, Open, In Progress, Completed).
   * Multi-column grid with plate badge, reported issue, diagnosis, reported mileage, and transactional close trigger.
4. **Vehicles & Fleet (`VEHICLES`)**:
   * Search by plate, make, model, or VIN.
   * "Registrar Nuevo Vehículo" modal supporting Make, Model, Plate, Year, Initial Mileage, and VIN.
   * Visual vehicle cards with one-click navigation to Digital Passport.
5. **Digital Passport (`PASSPORT`)**:
   * Detailed vehicle specs grid with `break-all` on VIN to prevent mobile overflow.
   * Certified timeline of past interventions.
   * Toggle between "Modo Taller (Completo)" and "Modo Público B2C (PII y Costos Sanitizados)".
6. **Preventive Services (`PREVENTIVE`)**:
   * Deterministic interval rules documented from manufacturer maintenance manuals (VW Golf 60.000 km, Toyota Corolla 40.000 km, Ford Ranger 90.000 km).
7. **AI Assistant & OBD-2 (`AI_ASSISTANT`)**:
   * Scanner DTC code analysis with mandatory legal disclaimer.
8. **Settings & Demo Tools (`SETTINGS`)**:
   * Operator switcher (Mario Rossi / Lucas Gómez).
   * Workshop switcher (Alpha Motors / Beta Service).
   * PostgreSQL demo re-seed trigger (`/api/v1/demo/seed`).

---

## 5. API Integration & Multi-Tenant Security

* **Next.js Reverse Proxy**:
  Configured in [`apps/frontend/next.config.mjs`](../../apps/frontend/next.config.mjs):
  ```javascript
  async rewrites() {
    return [
      { source: '/api/v1/:path*', destination: 'http://127.0.0.1:4000/api/v1/:path*' },
      { source: '/health/:path*', destination: 'http://127.0.0.1:4000/health/:path*' }
    ];
  }
  ```
* **Authentication & Credentials**:
  * Handled via [`apps/frontend/src/api/client.ts`](../../apps/frontend/src/api/client.ts).
  * Automatically injects `Authorization: Bearer <jwt>` and `x-tenant-id: <workshopId>` on every API request.
  * No secrets or credentials hardcoded into static bundles.
  * No silent mock fallback in production mode.

---

## 6. Build & Quality Verification

* **Next.js 15 Production Build**:
  `npm --prefix apps/frontend run build` -> **Compiled successfully in 4.2s** (0 errors, 4 static pages generated).
* **Monorepo TypeScript Typecheck**:
  `npm run typecheck` -> **0 errors** across all 4 monorepo packages.
* **Monorepo Test Suite**:
  `npm test` -> **70/70 PASS** across 7 test suites (0 failures).

---

## 7. Migration & Execution Protocol

During the transition period:
* **Backend API Server**: Runs on port `4000` (`.\scripts\start-demo.ps1` or `INICIAR_DEMO.bat`).
* **Legacy Embedded UI**: Remains accessible at `http://localhost:4000/demo`.
* **New Next.js 15 Frontend**: Runs on port `3000` (`.\scripts\start-frontend.ps1` or `INICIAR_FRONTEND_NEXTJS.bat`).
