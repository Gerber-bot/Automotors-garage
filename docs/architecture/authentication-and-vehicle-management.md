# Authentication & Vehicle Management Architecture (Milestone 10.3)

## 1. System Overview

Milestone 10.3 transitions Automotors Garage from design prototypes to a fully connected enterprise experience in Next.js 15. The frontend now communicates directly with the modular HTTP backend and relational PostgreSQL/PGlite persistence engine, enforcing zero mock fallback in production, multi-tenant isolation, and resilient session management.

```
┌────────────────────────────────────────────────────────┐
│               Next.js 15 App Router                   │
│                                                        │
│  ┌────────────────────┐      ┌──────────────────────┐  │
│  │     LoginView      │      │     VehiclesView     │  │
│  └─────────┬──────────┘      └──────────┬───────────┘  │
│            │                            │              │
│  ┌─────────▼──────────┐      ┌──────────▼───────────┐  │
│  │    AuthContext     │      │      ApiClient       │  │
│  └─────────┬──────────┘      └──────────┬───────────┘  │
│            │                            │              │
│  ┌─────────▼──────────┐                 │              │
│  │   BFF Route        │                 │              │
│  │   Handlers         │                 │              │
│  │ (/api/auth/*)      │                 │              │
└────────────┬────────────────────────────┼──────────────┘
             │ (HttpOnly Session)         │ (Bearer JWT + Tenant)
             ▼                            ▼
┌────────────────────────────────────────────────────────┐
│           Automotors Modular Monolith Backend          │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │   AuthenticationGuard & TenantGuard (Security)   │  │
│  └──────────────────────────┬───────────────────────┘  │
│                             │                          │
│  ┌──────────────────────────▼───────────────────────┐  │
│  │   HTTP Application Router & Domain Use Cases     │  │
│  │   - Auth: login, me, select-workshop, sessions   │  │
│  │   - Vehicles: search, create, passport           │  │
│  │   - Work Orders: search, quick-service, close    │  │
│  └──────────────────────────┬───────────────────────┘  │
│                             │                          │
│  ┌──────────────────────────▼───────────────────────┐  │
│  │   PostgreSQL / PGlite Persistence Layer          │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

---

## 2. Authentication Flow & BFF Architecture

### 2.1 Backend-for-Frontend (BFF) Pattern
To prevent tokens and sensitive state from leaking into browser `localStorage` or `sessionStorage` (mitigating XSS and script-injection risks), authentication is mediated via Next.js Route Handlers:

1. **`POST /api/auth/login`**:
   - Forwards credentials (`email`, `password`, optional `workshopId`) to the backend at `/api/v1/auth/login`.
   - On verification, backend issues a short-lived, cryptographically signed JWT and persists a session record.
   - The BFF Route Handler attaches this token as an `httpOnly`, `sameSite: 'lax'`, `path: '/'`, `secure` (in production) cookie (`automotors_session`).
   - Returns sanitized user and membership profiles to the browser.
2. **`GET /api/auth/me`**:
   - Reads the `automotors_session` cookie from the incoming request.
   - Validates the token against the backend `/api/v1/auth/me`.
   - Returns active tenant context and authorized workshop memberships.
   - If the token is invalid or revoked, clears the cookie and emits HTTP 401.
3. **`POST /api/auth/select-workshop`**:
   - Takes the selected `workshopId` and forwards to `/api/v1/auth/select-workshop`.
   - Backend verifies that the authenticated user is an active member of the requested workshop before issuing a newly signed token.
   - Updates the `automotors_session` cookie with the new tenant token.
4. **`POST /api/auth/logout`**:
   - Revokes the session in the database via `DELETE /api/v1/auth/sessions/:id`.
   - Invalidates the `automotors_session` cookie (`maxAge: 0`).
   - Clears in-memory client state.

---

## 3. Multi-Tenancy & Authorization

### 3.1 Hard Invariants
- **Never Trust Client Tenant Context**: The frontend cannot dictate `x-tenant-id` unilaterally without cryptographic proof.
- **Backend Derivation**: The backend derives the active `tenantId` from the verified JWT payload. The `TenantGuard` verifies that any explicit `x-tenant-id` header matches the active tenant signed into the token.
- **Tenant Switching**: A user belonging to multiple workshops (e.g. Mario Rossi in Alpha Motors Garage and Beta Service) switches workshops via `selectWorkshop()`. The backend explicitly verifies the membership row in `workshop_members` before producing a newly signed token with updated tenant claims and permissions.

---

## 4. Vehicle Management Module (`VehiclesView`)

The Vehicle Management screen provides an operational interface adhering to the Design System tokens:

1. **Catalog Search**:
   - Debounced search query querying `GET /api/v1/vehicles?q=<term>`.
   - Supports search by license plate (Argentine / Mercosur format), 17-character VIN, make, and model.
2. **Vehicle Registration**:
   - Modal dialog with client-side validation using `CreateVehicleDtoSchema` (Zod).
   - Validates year constraints ($1950 \le \text{year} \le 2030$), non-negative current mileage, and required make/model fields.
   - Submits to `POST /api/v1/vehicles`. Backend executes duplicate detection (rejecting exact VIN conflicts with HTTP 400).
   - On completion, refreshes the local dataset without page reload.
3. **Technical Sheet (Ficha Técnica)**:
   - Slide-over `Sheet` presenting vehicle specifications, registered odometer, engine, and certified timeline entries retrieved via `GET /api/v1/vehicles/:id/passport`.
   - One-click trigger to initiate a Quick Service flow for the inspected vehicle.
4. **State Machine**:
   - `LoadingState`: skeleton feedback during network requests.
   - `EmptyState`: contextual action prompting to register the workshop's first vehicle.
   - `ErrorState`: graceful error display with retry capabilities.

---

## 5. API Client Centralization (`ApiClient`)

The frontend `ApiClient` enforces strict enterprise contracts:
- **No Silent Fallback to Mocks**: Explicit `ApiError` is thrown when API responses return non-2xx status codes. Mocks are only used when explicitly enabled in offline test suites.
- **Request Cancellation**: Methods accept optional `AbortSignal` for debounced searches and unmounting components.
- **Expiration Interception**: Handles HTTP 401 via `onUnauthorized` callback, safely invalidating state and routing the user to login.
- **Same-Origin Credentials**: Automatically attaches `credentials: 'same-origin'` so browser cookies flow seamlessly.

---

## 6. Verification & Test Coverage

Automated testing validates the complete stack:
- **Linting**: 0 errors across monorepo with ESLint.
- **Type Checking**: 0 errors across `@automotors/security-foundation`, `@automotors/database`, `apps/backend`, and `apps/frontend`.
- **Integration & E2E Suite**: 85 passing tests across 9 test suites in Vitest / Node test runner.
- **Production Build**: Next.js 15 static page generation and dynamic route handlers compiled in 13.4s without warnings or errors.
