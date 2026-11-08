# Permissions Matrix & Access Control Policy (RBAC / ABAC)

## Roles Overview

Automotors Garage defines five primary hierarchical roles with strict multi-tenant boundary isolation:

| Role Identifier | Title | Hierarchy Level | Primary Domain & Boundary |
| :--- | :--- | :--- | :--- |
| `SUPER_ADMIN` | Platform Super Administrator | 100 | Platform oversight, cross-tenant audit, tenant onboarding. |
| `WORKSHOP_OWNER` | Workshop Owner / Dealer Principal | 80 | Full administrative and financial authority over their own tenant. |
| `WORKSHOP_MANAGER`| Service Advisor / Shop Manager | 60 | Customer reception, work order orchestration, estimate dispatch. |
| `MECHANIC` | Repair Technician | 40 | Diagnostic checklists, work order execution, voice logs, media upload. |
| `VEHICLE_OWNER` | Vehicle Owner (B2C) | 20 | Digital vehicle passport inspection, estimate approval, own invoices. |

---

## Detailed Resource Permissions Matrix

| Permission Key | Description | `SUPER_ADMIN` | `WORKSHOP_OWNER` | `WORKSHOP_MANAGER` | `MECHANIC` | `VEHICLE_OWNER` |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| `tenant:manage` | Create, suspend, or configure workshops | Yes | No | No | No | No |
| `tenant:settings:update`| Configure shop working hours, brand, tax rates | Yes | Yes | No | No | No |
| `workshop:read` | Read workshop branches and technician list | Yes | Yes | Yes | Yes | No |
| `workshop:update` | Update shop bays, physical addresses | Yes | Yes | No | No | No |
| `member:manage` | Invite, deactivate, or remove shop staff | Yes | Yes | No | No | No |
| `role:assign` | Assign roles (strictly lower than caller's role) | Yes | Yes | No | No | No |
| `customer:read` | View customer profile and history in tenant | Yes | Yes | Yes | Yes* | No |
| `customer:create` | Onboard customer to tenant | Yes | Yes | Yes | No | No |
| `customer:update` | Edit customer phone, address, contact details | Yes | Yes | Yes | No | No |
| `customer:delete` | Soft delete customer record | Yes | Yes | No | No | No |
| `vehicle:read` | View vehicle registry records in tenant | Yes | Yes | Yes | Yes | No |
| `vehicle:create` | Register new VIN/Plate | Yes | Yes | Yes | No | No |
| `vehicle:update` | Update mileage, vehicle specs | Yes | Yes | Yes | No | No |
| `vehicle:passport:view_public` | View sanitized public passport (QR code) | Yes | Yes | Yes | Yes | Yes |
| `vehicle:passport:view_internal` | View full history including previous shops' public logs | Yes | Yes | Yes | Yes | No |
| `workorder:read` | Read repair orders (tenant-scoped or owned) | Yes | Yes | Yes | Yes | Yes* |
| `workorder:create` | Create repair orders | Yes | Yes | Yes | No | No |
| `workorder:update` | Modify parts, checklists, labor lines | Yes | Yes | Yes | Yes* | No |
| `workorder:assign_mechanic` | Assign job to specific mechanic | Yes | Yes | Yes | No | No |
| `workorder:diagnose` | Record diagnostic symptoms & voice logs | Yes | Yes | Yes | Yes | No |
| `workorder:approve` | Approve estimates (Owner authorizations) | Yes | Yes | Yes | No | Yes* |
| `workorder:close` | Transition order to CLOSED / COMPLETED | Yes | Yes | No | No | No |
| `evidence:upload` | Upload photos and audio recordings | Yes | Yes | Yes | Yes | No |
| `evidence:read_private`| Generate secure signed download ticket | Yes | Yes | Yes | Yes | No |
| `evidence:delete` | Delete erroneous evidence items | Yes | Yes | No | No | No |
| `invoice:read` | View billing details and payments | Yes | Yes | Yes | No | Yes* |
| `invoice:create` | Generate customer invoice from work order | Yes | Yes | Yes | No | No |
| `invoice:update` | Apply discounts, record payments | Yes | Yes | No | No | No |
| `audit:read` | Query structured security audit trails | Yes | Yes | No | No | No |

*\*Scoped rules applied via ResourceAccessEvaluator:*
- `customer:read` for `MECHANIC`: restricted to customers with work orders assigned to that mechanic.
- `workorder:read` for `VEHICLE_OWNER`: restricted to vehicles registered to their user ID.
- `workorder:update` for `MECHANIC`: allowed while status is open/in-progress; strictly rejected if `CLOSED` or `COMPLETED`.
- `workorder:approve` for `VEHICLE_OWNER`: allows approving or declining proposed estimates on their own vehicle.

## Enforced Workshop HTTP Permissions

The current HTTP adapter uses the persisted workshop permission keys `READ`, `CREATE`, `UPDATE`, `CLOSE_ORDER`, and `CALCULATE_PREVENTIVE`. Membership, role, and permission overrides are reloaded from the database for each request; an override can only reduce the permissions granted by the role.

| Route | Method | Operation | Required permission |
| :--- | :---: | :--- | :--- |
| `/api/v1/workshops` | GET | List memberships | `READ` |
| `/api/v1/vehicles` | GET | Search/list vehicles | `READ` |
| `/api/v1/vehicles/:id` | GET | Read workshop vehicle | `READ` |
| `/api/v1/vehicles` | POST | Create vehicle | `CREATE` |
| `/api/v1/vehicles/:id/configuration` | POST | Bind technical configuration | `UPDATE` |
| `/api/v1/customers` | GET | List customers | `READ` |
| `/api/v1/customers` | POST | Create customer | `CREATE` |
| `/api/v1/work-orders` | GET | List work orders | `READ` |
| `/api/v1/work-orders` | POST | Create work order | `CREATE` |
| `/api/v1/work-orders/quick-service` | POST | Create and close quick service | `CREATE` and `CLOSE_ORDER` |
| `/api/v1/work-orders/:id/close` | POST | Close work order | `CLOSE_ORDER` |
| `/api/v1/maintenance/calculate-preventive` | POST | Calculate due maintenance | `CALCULATE_PREVENTIVE` |
| `/api/v1/vehicles/:id/history/summary` | POST | Summarize workshop-scoped history | `READ` |
| `/api/v1/vehicles/:id/predictions/:category/explain` | POST | Explain deterministic prediction | `CALCULATE_PREVENTIVE` |
| `/api/v1/ai/obd2/interpret` | POST | Interpret OBD-II data | `CALCULATE_PREVENTIVE` |
| `/api/v1/diagnostics/ports` | GET | Enumerate diagnostic ports | `READ` |
| `/api/v1/diagnostics/session/live` | GET | Read live diagnostic data | `READ` |
| `/api/v1/diagnostics/session/start` | POST | Start workshop diagnostic session | `UPDATE` |
| `/api/v1/diagnostics/session/stop` | POST | Stop workshop diagnostic session | `UPDATE` |
| `/api/v1/diagnostics/session/snapshot` | POST | Save diagnostic snapshot | `CREATE` |

The `VIEWER`, `RECEPTIONIST`, and `MANAGER` role identifiers currently receive `READ` only from the HTTP permission mapping; role overrides cannot elevate them. Vehicle-owner routes remain separately scoped to the authenticated owner, and platform `SUPER_ADMIN` operations remain restricted to the existing explicit platform checks.

### Role vocabulary mismatch: expansion requires a product decision

| Identifier | Shared domain / frontend Role contract | Membership adapter today | Effective HTTP policy |
| :--- | :--- | :--- | :--- |
| `WORKSHOP_MANAGER` | Declared; resource-specific manager permissions in security-foundation | Not allowlisted; sanitized to `VIEWER` | `READ` only |
| `MANAGER` | Not declared | Allowlisted legacy identifier | `READ` only |
| `RECEPTIONIST` | Not declared | Allowlisted legacy identifier | `READ` only |
| `VIEWER` | Not declared | Allowlisted fallback | `READ` only |
| `ADMIN` | Not declared | Allowlisted legacy administrator | All six existing workshop permissions |
| `WORKSHOP_OWNER` | Declared | Allowlisted | All six existing workshop permissions |

The membership schema stores a free-form varchar, not an enum. Similar names are **not aliases**. The resource-specific `WORKSHOP_MANAGER` policy does not define how to map to the HTTP adapter's coarse keys (in particular `UPDATE`, `CLOSE_ORDER`, and `CALCULATE_PREVENTIVE`). No such mapping or privilege expansion is introduced here. Product approval must specify canonical role names, migration of legacy values, and allowed operations before widening access. The earlier general resource matrix describes security-foundation, not the effective HTTP adapter policy above.

`tests/integration/workshop-history-access.spec.ts` verifies read/write behavior for all six identifiers, including elevated override attempts and role changes using the same token. Existing tests continue to verify membership revocation and workshop isolation.

---

## Attribute-Based Access Control (ABAC) Invariants

1. **Multi-Tenant Boundary**: All actions (except `vehicle:passport:view_public` and `SUPER_ADMIN` operations) enforce `resource.tenant_id === principal.activeTenantId`.
2. **Terminal State Invariant**: No actor (including Owner or Mechanic) can mutate a work order once in `CLOSED` or `COMPLETED` state. A formal reopening workflow is required.
3. **Privilege Escalation Invariant**: A user with `role:assign` cannot grant any role equal to or higher than their current role (e.g. Workshop Owner cannot grant another Workshop Owner or Super Admin).
4. **Data Minimization in Vehicle Passport**:
   - Prospective buyers or external parties see only non-sensitive data (date, mileage, service type, verifying workshop).
   - Workshop internal costs, profit margins, parts markups, customer contact phone numbers, and mechanic notes are strictly redacted.
