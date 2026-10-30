# Arquitectura de Mi Automotors — Portal de Propietarios (Milestone 12)

## 1. Visión Arquitectónica

**Mi Automotors** extiende el monolito modular de **Automotors Garage** para ofrecer una experiencia independiente orientada a propietarios particulares (`VEHICLE_OWNER`) sin duplicar el backend, sin duplicar las entidades de dominio vehicular y sin debilitar la seguridad multi-tenant de los talleres (`WORKSHOP_USER`).

### Principios Invariantes

1. **Un Único Backend Modular**:
   - No se crea un backend paralelo. Todos los endpoints de propietario viven bajo `/api/v1/owner/*` y `/api/v1/auth/register` dentro de `apps/backend/src/infrastructure/http/http-app.ts`.
2. **Entidades Compartidas con Trazabilidad de Origen**:
   - Se reutilizan las tablas `users`, `sessions`, `vehicles`, `maintenance_records`, `maintenance_corrections` y `maintenance_intervals`.
   - La migración `0002_owner_portal.sql` incorpora:
     - `vehicles.owner_user_id`: vinculación directa de titularidad al usuario propietario.
     - `vehicles.vin` anulable (`DROP NOT NULL`): permite registrar vehículos cuyo VIN es opcional inicialmente, manteniendo el índice único `vehicles_vin_uidx` para todos los VIN declarados.
     - `maintenance_records.performing_workshop_id` anulable (`DROP NOT NULL`), `recorded_by_user_id` y `record_origin` (`'WORKSHOP_CERTIFIED' | 'OWNER_DECLARED'`).
3. **Coexistencia Multi-Perfil (`WORKSHOP_USER` y `VEHICLE_OWNER`)**:
   - Un usuario sin membresías en `workshop_members` opera con `activeTenantId: null`, `role: 'VEHICLE_OWNER'` y `profiles: ['VEHICLE_OWNER']`.
   - Un usuario miembro de uno o más talleres posee `profiles: ['WORKSHOP_USER', 'VEHICLE_OWNER']` y puede alternar entre **Automotors Pro** y **Mi Automotors** sin perder aislamiento.

---

## 2. Seguridad, Autorización por Recurso y Prevención de Secuestro de Historial

### 2.1 Autorización Estricta por Recurso (`owner_user_id === principal.id`)
- Cada operación sobre `/api/v1/owner/vehicles/:id`, `/api/v1/owner/vehicles/:id/history`, `/api/v1/owner/vehicles/:id/maintenance`, `/api/v1/owner/vehicles/:id/predictions` y `/api/v1/owner/maintenance/:recordId/corrections` verifica explícitamente en base de datos que `vehicle.ownerId === principal.id`.
- Cambiar el UUID en la URL o en el payload hacia un vehículo perteneciente a otro propietario o a un taller devuelve inmediatamente `403 Forbidden`.

### 2.2 Prevención de Reclamo No Autorizado por VIN o Patente
- **Regla de Privacidad**: Conocer una patente o un código VIN jamás otorga acceso automático al historial privado de otra persona o taller.
- Si un propietario intenta registrar en `Mi Garaje` una patente o un VIN que ya existe en la tabla `vehicles`, el endpoint `POST /api/v1/owner/vehicles` rechaza la operación con `409 Conflict` sin filtrar datos ni enlazar el historial existente.

### 2.3 Aislamiento Bidireccional Propietario ↔ Taller
- Un usuario puramente `VEHICLE_OWNER` (`activeTenantId: null`) recibe `403 Forbidden` si intenta invocar endpoints operativos de taller (`/api/v1/work-orders`, `/api/v1/customers`, etc.).
- Un taller autenticado que consulta `GET /api/v1/vehicles` o `GET /api/v1/vehicles/:id` no puede listar ni inspeccionar vehículos privados de propietarios (`owner_user_id IS NOT NULL`) que no hayan otorgado autorización explícita.

---

## 3. Trazabilidad del Historial y Correcciones Auditadas

| Atributo | Mantenimiento de Taller (`Automotors Pro`) | Mantenimiento Personal (`Mi Automotors`) |
| :--- | :--- | :--- |
| `record_origin` | `WORKSHOP_CERTIFIED` | `OWNER_DECLARED` |
| `verification_level` | `IDENTIFIED_WORKSHOP` / `CORROBORATED` | `DECLARED` |
| `is_certified` | `true` | `false` (Invariante de dominio) |
| `performing_workshop_id` | UUID del taller ejecutante | `NULL` |
| `recorded_by_user_id` | Mecánico / Operador | UUID del propietario (`principal.id`) |

- **Inmutabilidad y Correcciones Auditadas**:
  - Ningún registro de mantenimiento se elimina.
  - Cuando el propietario corrige un dato mediante `POST /api/v1/owner/maintenance/:recordId/corrections`, el sistema persiste una fila en `maintenance_corrections` con `actor_id`, `actor_name`, `reason`, `previous_data` (estado original íntegro) y `corrected_data`.

---

## 4. Motor de Mantenimiento Inteligente y Base de Conocimiento Técnico

- `GET /api/v1/owner/vehicles/:id/predictions` reutiliza `DeterministicMaintenanceEngine` (`apps/backend/src/modules/maintenance-intelligence/domain/deterministic-engine.ts`) junto con `VehicleKnowledgeBase` (`vehicle-knowledge-base.ts`) y la tabla `maintenance_intervals`.
- No utiliza IA generativa como fuente de verdad para cálculos mecánicos ni inventa intervalos cuando faltan reglas verificadas.
- Cuando una categoría carece de regla documentada o de datos suficientes, devuelve `status: 'INSUFFICIENT_DATA'` y el mensaje exacto:
  > `"Necesitamos más información para estimar este mantenimiento"`

### Vehículo de Referencia Documentado: Renault Logan 1.6 2020
- **Marca / Modelo / Año**: Renault Logan 1.6 (2020)
- **Transmisión**: Manual (5 velocidades)
- **Tipo de Distribución**: `CADENA` (Distribución por cadena metálica bañada en aceite; no aplica intervalo de reemplazo de correa dentada de caucho)
- **Código de Motor**: `H4M / HR16 — pendiente de confirmación documental` (`exactEngineCodeStatus: 'PENDING_CONFIRMATION'`, `isProfileComplete: false`)
