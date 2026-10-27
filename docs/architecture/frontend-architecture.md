# Frontend Architecture & Design System

## 1. Design Philosophy & Visual Identity
The frontend of **Automotors Garage** is engineered as a modern, high-performance, dark-mode-first B2B/B2C SaaS platform.

### Visual Foundations:
- **Palette**: Deep slate background (`bg-slate-950`), elevated surfaces (`bg-slate-900`), border accents (`border-slate-800`), and automotive green highlights (`emerald-500` / `emerald-400`).
- **Typography**: Clean sans-serif hierarchy for interface copy combined with monospaced accents (`font-mono`) for vehicle license plates, VINs, odometer readings, and SHA-256 evidence hashes.
- **Microinteractions**: Fast, tactile feedback on button presses (`active:scale-95`), pulsating recording timers, and non-blocking background transitions.
- **Accessibility & Mobile-First**: Touch targets >= 44px, full responsive reflow across phone, tablet, and desktop viewports, WCAG AA contrast compliance.

---

## 2. Views Map (13 Key Views)

| View | Purpose & Audience | Key Components |
| :--- | :--- | :--- |
| **1. Dashboard** | Central operational cockpit (B2B) | KPI counters, active order tables, Quick Service CTA |
| **2. Vehículos** | Fleet & registered vehicle registry | Search by plate/VIN, `VehicleCard` grid |
| **3. Detalle del Vehículo** | In-depth mechanical specifications | Specifications grid, certified service count |
| **4. Clientes** | Customer profiles & contact info | Customer history, owned vehicles list |
| **5. Órdenes de Trabajo** | Active repair orders pipeline | Status badges, mechanic assignment |
| **6. Nueva Orden** | Detailed repair order intake form | `WorkOrderForm` with validation |
| **7. Historial Vehicular** | Verifiable timeline of interventions | `MaintenanceTimeline` with verification tiers |
| **8. Quick Service Entry** | **Star Feature**: &lt;60s service registration | `ServiceQuickEntry`, `VoiceRecorder`, `AIConfirmationPanel` |
| **9. Asistente de IA** | AI diagnostic notes & voice speech-to-text | AI voice transcription, OBD2 DTC interpreter |
| **10. Próximos Mantenimientos**| Deterministic service due forecasts | `MaintenancePredictionCard` with confidence & sources |
| **11. Portal del Propietario**| Public / B2C digital vehicle passport | QR-code view with confidential cost redactions |
| **12. Configuración Taller** | Organization settings & branches | `WorkshopSelector`, working hours |
| **13. Usuarios y Permisos** | Staff RBAC authorization management | `PermissionGate`, role assignment hierarchy |

---

## 3. Star Feature: Quick Service Entry (<60s Flow)

The **Quick Service Entry** flow is designed to maximize technician speed and eliminate friction on high-frequency routine services:

```
[ 1. Buscar Patente ] ---> [ 2. Seleccionar Vehículo ] ---> [ 3. Confirmar Km ]
                                                                   |
[ 5. Guardar en Libro ] <--- [ 4. Dictar por Voz o Clic en Chips ] <---+
```

### Steps:
1. **Search**: Instant plate lookup (`AF123CD`).
2. **Select**: Single-tap vehicle card selection.
3. **Mileage**: Pre-filled with latest odometer reading; quick stepper shortcuts (`+5k`, `+10k`).
4. **Work Items**: One-tap quick chips (Oil & filter, Brake pads, Air filter, Rotation).
5. **Voice Recording (Optional)**: Technician dictates notes (e.g., *"Cambié aceite y filtro a los 112 mil..."*).
6. **AI Review**: `AIConfirmationPanel` presents parsed values. Technician reviews and checks confirmation box (`requiresConfirmation: true`).
7. **Finalize**: Atomic save completed in less than 60 seconds.

---

## 4. Architectural Rules for API Integration

1. **Centralized Client**: All data fetching flows through `ApiClient` (`apps/frontend/src/api/client.ts`). Components never make arbitrary `fetch()` calls.
2. **Offline Mock Fallback Policy**:
   - In offline local preview or unit testing, the client falls back to `mock-backend.ts`.
   - All mock responses are explicitly annotated with `[OFFLINE_DEVELOPMENT_MOCK]`.
3. **Session Interception**:
   - If a backend call returns `401 Unauthorized` (revoked session or expired JWT), the client triggers the `onUnauthorized` handler, invalidates the local state, and redirects to login.
4. **Zero Frontend Secrets**:
   - Private keys, database credentials, and signing secrets are never bundled into client-side Next.js artifacts.
