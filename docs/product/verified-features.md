# Matriz de Funcionalidades Verificadas — Automotors Garage

> **Fecha de Auditoría**: 31 de Octubre de 2026  
> **Milestone Auditado**: Milestone 15.1 — Auditoría Funcional Integral  
> **Commit Base**: fc8fe3f (Milestone 14.1) con base PostgreSQL nativa 14.2.1  
> **Estado de Pruebas Automatizadas**: 154 / 154 aprobadas (19 suites)  
> **Estado de Compilación**: Next.js 15.5.28 (`next build .`) y TypeScript 5.7.3 (`typecheck` 0 errores)  

---

## 1. Convenciones de Estado

Para garantizar que la comunicación pública y comercial del software sea 100% veraz y trazable, cada funcionalidad se clasifica bajo uno de los siguientes estados:

- **`IMPLEMENTADA Y VERIFICADA`**: Código completo, probado con tests unitarios/de integración automatizados y verificable en UI/API. Apta para comunicación pública.
- **`IMPLEMENTADA SIN VALIDACIÓN COMPLETA`**: Funcionalidad presente en el código pero carente de pruebas E2E visuales o dependiente de configuraciones no activas en todos los entornos. Apta con aclaración técnica.
- **`PARCIAL`**: Módulo con subconjunto de funciones implementadas (ej. parser offline pero sin conexión de hardware).
- **`PENDIENTE`**: En roadmap; sin código funcional en la base actual. No comunicable como funcionalidad existente.
- **`CON ERRORES`**: Funcionalidad con defectos identificados o regresiones activas. No comunicable.

---

## 2. Mi Automotors — Experiencia Propietario Particular

| Funcionalidad | Descripción para el Usuario | Estado | Evidencia de Verificación | Limitaciones y Condiciones | Aptitud para Landing |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Registro de Propietario** | Creación de cuenta personal como titular de vehículos sin requerir un taller. | `IMPLEMENTADA Y VERIFICADA` | `milestone-12-mi-automotors.spec.ts` (Test 1), `POST /api/v1/auth/register`, `AuthContext.tsx`. | Asigna rol exclusivo `VEHICLE_OWNER` con `activeTenantId: null`. Contraseña hasheada con Argon2id/bcrypt. | **Apta** |
| **Inicio de Sesión y Sesión Segura** | Acceso seguro con cookies HttpOnly y protección contra secuestro de sesión. | `IMPLEMENTADA Y VERIFICADA` | `milestone-12-mi-automotors.spec.ts` (Test 1-2), `POST /api/v1/auth/login`, `GET /api/v1/auth/me`. | Sesión unificada multi-perfil. No expone tokens ni secretos en localStorage. | **Apta** |
| **Alta de Vehículos Particulares** | Registro de vehículos con validación de patente Mercosur / tradicional y VIN opcional con unicidad. | `IMPLEMENTADA Y VERIFICADA` | `milestone-12-mi-automotors.spec.ts` (Test 3), `POST /api/v1/owner/vehicles`, `MiAutomotorsView.tsx`. | Si se informa VIN, se exige formato estándar de 17 caracteres y unicidad. Si no, queda en null. | **Apta** |
| **Listado y Gestión de Flota Personal** | Visualización centralizada de los vehículos propios del usuario autenticado. | `IMPLEMENTADA Y VERIFICADA` | `milestone-12-mi-automotors.spec.ts` (Test 3), `GET /api/v1/owner/vehicles`. | Aislamiento estricto por titular (`owner_user_id === principal.id`). Filtro a nivel base de datos. | **Apta** |
| **Historial Cronológico de Mantenimiento** | Línea de tiempo inmutable con servicios realizados, distinguiendo origen del registro. | `IMPLEMENTADA Y VERIFICADA` | `milestone-12-mi-automotors.spec.ts` (Test 4), `GET /api/v1/owner/vehicles/:id/history`. | Etiqueta claramente servicios certificados por taller (`WORKSHOP_CERTIFIED`) y declarados por dueño (`OWNER_DECLARED`). | **Apta** |
| **Carga de Mantenimiento por Propietario** | Registro autónomo de servicios realizados por cuenta propia o en lubricentros. | `IMPLEMENTADA Y VERIFICADA` | `milestone-12-mi-automotors.spec.ts` (Test 4), `POST /api/v1/owner/vehicles/:id/maintenance`. | Valida odómetro no decreciente y fecha no futura. Registra `performing_workshop_id: null`. | **Apta** |
| **Corrección Auditable de Historial** | Enmienda de datos erróneos mediante adición de eventos auditados sin mutación destructiva. | `IMPLEMENTADA Y VERIFICADA` | `milestone-12-mi-automotors.spec.ts` (Test 5), `POST /api/v1/owner/maintenance/:recordId/corrections`. | No permite borrar el pasado; agrega registro a `maintenance_corrections` con motivo y autor. | **Apta con aclaración técnica** |
| **Proyecciones y Alertas Preventivas** | Cálculo determinístico de próximos servicios por tiempo o kilometraje. | `IMPLEMENTADA Y VERIFICADA` | `milestone-12-mi-automotors.spec.ts` (Test 6), `GET /api/v1/owner/vehicles/:id/predictions`. | Si el vehículo carece de historial suficiente o manual verificado, devuelve `INSUFFICIENT_DATA` y disclaimer. | **Apta con aclaración de base de datos** |
| **Explicación Asistida por IA** | Explicaciones en lenguaje natural sobre el plan de mantenimiento vehicular. | `IMPLEMENTADA Y VERIFICADA` | `milestone-13-ai-optimization.spec.ts`, `apps/backend/src/modules/ai`. | Asistencia opcional (OpenAI). Sanitiza datos personales (PII). Incluye descargo obligatorio de inspección física. Si no hay API key, utiliza fallback determinístico. | **Apta indicando que es asistencia consultiva** |
| **Agendamiento y Turnos con Talleres** | Solicitud y reserva de turnos en red de talleres mecánicos asociados. | `PENDIENTE` | No existe entidad ni endpoint en esquema relacional (26 tablas auditadas). | Requiere desarrollo de módulo de reservas y disponibilidad de talleres en futuros hitos. | **NO APTO (No anunciar)** |
| **Conexión Directa a Dongle OBD (Bluetooth/WiFi)** | Conexión directa en tiempo real desde el celular al conector del auto sin escáner físico externo. | `PARCIAL` | `packages/obd-core` analiza DTCs y freeze frames, pero no hay capa de Web Bluetooth nativa en browser. | Requiere hardware ELM327 físico y soporte de Web Bluetooth API no desplegado para el usuario final. | **NO APTO como lectura directa sin escáner** |

---

## 3. Automotors Pro — Experiencia Taller Mecánico

| Funcionalidad | Descripción para el Usuario | Estado | Evidencia de Verificación | Limitaciones y Condiciones | Aptitud para Landing |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Autenticación Multi-Tenant y Selección de Taller** | Acceso de administradores, técnicos y observadores con sesión vinculada a su taller. | `IMPLEMENTADA Y VERIFICADA` | `security-foundation.spec.ts`, `POST /api/v1/auth/login`, `POST /api/v1/auth/select-workshop`. | Token JWT con claim `tenantId`. Aislamiento absoluto entre talleres distintos (HTTP 403 en cruces). | **Apta** |
| **Gestión de Clientes del Taller** | Directorio de clientes con DNI/CUIT, razón social, teléfonos y direcciones. | `IMPLEMENTADA Y VERIFICADA` | `milestone-08-e2e.spec.ts`, `POST /api/v1/customers`, `GET /api/v1/customers`, `CustomersView.tsx`. | Aislado por `tenant_id`. Búsqueda por documento y nombre. | **Apta** |
| **Gestión de Vehículos de Clientes** | Ficha técnica vehicular con kilometraje actual, motorización y vinculación a cliente. | `IMPLEMENTADA Y VERIFICADA` | `milestone-08-e2e.spec.ts`, `POST /api/v1/vehicles`, `GET /api/v1/vehicles`, `VehiclesView.tsx`. | Búsqueda por patente y modelo. Odómetro actualizado por órdenes de trabajo. | **Apta** |
| **Ciclo de Vida de Órdenes de Trabajo** | Creación, diagnóstico, presupuesto, avance y cierre formal de órdenes de reparación. | `IMPLEMENTADA Y VERIFICADA` | `milestone-08-e2e.spec.ts`, `milestone-10-3-e2e.spec.ts`, `WorkOrdersView.tsx`, `WorkOrderDetailModal.tsx`. | Máquina de estados: `DRAFT`, `IN_PROGRESS`, `WAITING_APPROVAL`, `READY_FOR_DELIVERY`, `CLOSED`, `CANCELLED`. | **Apta** |
| **Cierre Transaccional Atómico** | Certificación de servicio que actualiza odómetro, inserta historial y notifica outbox en una transacción única. | `IMPLEMENTADA Y VERIFICADA` | `milestone-07` en `persistence-foundation.spec.ts` (Tests 9-12), `PATCH /api/v1/work-orders/:id/close`. | Si falla cualquier paso, se produce rollback atómico en PostgreSQL sin datos huérfanos. Marca `record_origin: 'WORKSHOP_CERTIFIED'`. | **Apta** |
| **Quick Service Entry (<60s)** | Entrada ultra-rápida de servicios rutinarios (aceite, filtros, pastillas) diseñada para boxes. | `IMPLEMENTADA Y VERIFICADA` | `frontend-components.spec.ts` (Test 1), `QuickServiceEntry.tsx`. | Exige confirmación explícita del técnico (`humanConfirmed: true`). Esquema Zod rechaza intentos automatizados no confirmados. | **Apta destacando agilidad con validación humana** |
| **Diagnóstico OBD-II y Lectura de Fallas** | Interpretación de códigos DTC estándar SAE J2012, freeze frames y sugerencias mecánicas. | `IMPLEMENTADA Y VERIFICADA` | `obd-core.spec.ts`, `milestone-11-obd.spec.ts`, `DiagnosticsView.tsx`. | Cubre códigos universales (P0xxx, C0xxx, B0xxx, U0xxx). Códigos propietarios de fabricante (P1xxx) se procesan con aclaración. Descargo técnico obligatorio. | **Apta aclarando compatibilidad con estándares SAE** |
| **Telemetría IoT en Tiempo Real** | Streaming continuo de sensores en vivo (RPM, temperatura, presión) vía sockets o red celular. | `PARCIAL` | Parsing estático y por lotes probado en `obd-core`. No hay servidor WebSocket/MQTT para streaming de sensores. | No existe conexión de telemetría en streaming continuo en el entorno actual. | **NO APTO (No promocionar como telemetría en vivo)** |
| **Facturación Electrónica AFIP / Pagos** | Emisión directa de facturas fiscales electrónicas (A/B/C) y cobro con tarjeta. | `PENDIENTE` | Ninguna tabla ni integración en backend (sin SDK de AFIP / MercadoPago). | En roadmap futuro. El taller emite su facturación mediante sus sistemas fiscales habituales. | **NO APTO (No anunciar)** |

---

## 4. Base de Conocimiento Vehicular (Knowledge Base)

| Funcionalidad | Descripción para el Usuario | Estado | Evidencia de Verificación | Limitaciones y Condiciones | Aptitud para Landing |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Catálogo de Modelos y Especificaciones Oficiales** | Especificaciones de fábrica para fluidos, capacidades y frecuencias de servicio. | `IMPLEMENTADA Y VERIFICADA` | `milestone-14-vehicle-knowledge-base.spec.ts` (16 tests), tablas `kb_models`, `kb_specifications`, `kb_maintenance_rules`. | Solo se consideran válidas aquellas con trazabilidad documental verificada (`OEM_MANUAL`). | **Apta** |
| **Invariante Antialucinación y Regla de Exclusión** | Protección estricta que impide inventar especificaciones o tolerar datos no respaldados. | `IMPLEMENTADA Y VERIFICADA` | `milestone-14-vehicle-knowledge-base.spec.ts` (Tests 1-5). | Especificaciones sin manual oficial fehaciente (ej. Renault Logan 2020 L52) permanecen en `PENDING_VERIFICATION` y son excluidas de las recomendaciones automáticas (`INSUFFICIENT_DATA`). | **Apta destacando rigor de ingeniería y seguridad** |

---

## 5. Seguridad y Plataforma Tecnológica

| Capacidad | Detalle Técnico | Estado | Evidencia |
| :--- | :--- | :--- | :--- |
| **Aislamiento Multi-Tenant Absoluto** | Datos de un taller invisibles para cualquier otro. Contexto extraído únicamente del JWT emitido por el servidor. | `IMPLEMENTADA Y VERIFICADA` | `security-foundation.spec.ts` (pruebas 2, 3 y 8), `milestone-14-vehicle-knowledge-base.spec.ts` (prueba 12); accesos entre talleres rechazados. |
| **Prevención de Escalamiento Global (SUPER_ADMIN)** | Prohibido registrar o asociar el rol SUPER_ADMIN con talleres (`activeTenantId`). Registro público bloqueado a `VEHICLE_OWNER`. | `IMPLEMENTADA Y VERIFICADA` | `security-foundation.spec.ts`, `milestone-14.spec.ts` (Test 15), `nest-guards.ts`, `http-app.ts`. |
| **Integridad de Base de Datos Relacional** | 26 tablas normalizadas con claves foráneas, restricciones de unicidad, auditoría y migraciones reversibles (0001, 0002, 0003). | `IMPLEMENTADA Y VERIFICADA` | `packages/database/test/database.spec.ts` (8 tests) y `milestone-14.spec.ts` (Test 16). |
| **Soporte de Motor Dual (PGlite / PostgreSQL 16)** | Motor PGlite WASM embebido para tests y desarrollo rápido; conector PostgreSQL nativo para despliegue de alta concurrencia. | `IMPLEMENTADA Y VERIFICADA` | `apps/backend/src/main.ts`, `packages/database/src/client.ts`. En producción (`DB_PROVIDER=postgres`), falla inmediatamente si la conexión no está disponible (sin fallback silencioso). |
