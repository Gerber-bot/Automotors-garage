# Database Strategy, Relational Architecture & Knowledge Base Design

## 1. Environment Topology

Automotors Garage defines a tiered database topology ensuring identical PostgreSQL SQL dialect compatibility across development, testing, and production.

| Tier | Engine | Persistence | Isolation | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **DEV** | PGlite (WASM Postgres) | Local disk (`.data/dev/pglite`) | Single workstation | Rapid local iteration without background daemon dependencies |
| **TEST** | PGlite (WASM Postgres) | In-memory / Ephemeral directory | Per-suite sandbox | Deterministic test execution, zero cross-test interference |
| **CI / INTEGRATION** | PostgreSQL 16 (Docker) | Volume-backed | Isolated database per run | Automated regression testing with exact production PostgreSQL engine |
| **PRODUCTION** | Managed PostgreSQL (RDS/Neon/Supabase) | Managed multi-AZ storage | Strict multi-tenant row isolation | High availability, connection pooling, SSL/TLS enforcement |

---

## 2. Automotive Knowledge Base Relational Architecture

The vehicle database is structured around a strict separation of concerns:
1. **Physical Vehicle Instances (`vehicles`)**: Tangible assets owned by users or serviced by workshops (VIN, license plate, current odometer, owner identity).
2. **Technical Vehicle Taxonomy (`oem_*` / `kb_*`)**: Verified manufacturer specifications, powertrains, and maintenance rules that exist independently of specific user cars.

### Relational Schema Specification

```
┌─────────────────┐       ┌─────────────────┐       ┌──────────────────────┐
│    oem_makes    │◄──────┤ vehicle_models  │◄──────┤  model_generations   │
├─────────────────┤ 1   N ├─────────────────┤ 1   N ├──────────────────────┤
│ id (UUID, PK)   │       │ id (UUID, PK)   │       │ id (UUID, PK)        │
│ name (TEXT)     │       │ make_id (FK)    │       │ model_id (FK)        │
│ country (TEXT)  │       │ name (TEXT)     │       │ generation_code      │
└─────────────────┘       └─────────────────┘       │ start_year / end_year│
                                                    └──────────┬───────────┘
                                                               │ 1
                                                               │ N
┌───────────────────────────┐       ┌──────────────────────────▼───────────┐
│  service_interval_rules   │◄──────┤         powertrain_engines           │
├───────────────────────────┤ N   1 ├──────────────────────────────────────┤
│ id (UUID, PK)             │       │ id (UUID, PK)                        │
│ engine_id (FK)            │       │ generation_id (FK)                   │
│ category (VARCHAR)        │       │ engine_code (e.g. 'H4M', 'HR16DE')   │
│ interval_km (INT)         │       │ displacement_cc (e.g. 1598)          │
│ interval_months (INT)     │       │ fuel_type (GASOLINE, FLEX, DIESEL)   │
│ severe_interval_km (INT)  │       │ timing_mechanism (CHAIN, BELT)       │
│ citation_source (TEXT)    │       │ oil_viscosity_oem (TEXT)             │
└───────────────────────────┘       └──────────────────────────────────────┘
```

### Reference Case: Renault Logan 1.6 (2020 Argentine Market)
- **Make**: Renault (`oem_makes`)
- **Model**: Logan (`vehicle_models`)
- **Generation**: Logan II Phase 2 (2019-2024)
- **Engine Options**:
  - `H4M` / `HR16DE` (1.6 16v SCe, 115 HP):
    - **Timing Mechanism**: Timing Chain (`CADENA`). Visual inspection every 100,000 km, no fixed periodic replacement interval under normal conditions.
    - **Engine Oil**: RN0700 / RN0710 specification, 5W40 or 10W40. Standard interval: 10,000 km or 12 months; Severe usage interval: 5,000 km or 6 months.
    - **Accessory Belt**: Replacement every 60,000 km or 48 months.
    - **Spark Plugs**: Replacement every 40,000 km.
    - **Brake Fluid**: DOT 4, replacement every 24 months or 40,000 km.
  - `K7M` (1.6 8v, 85 HP - early/fleet legacy):
    - **Timing Mechanism**: Timing Belt (`CORREA`). Mandatory replacement every 60,000 km or 48 months.
- **Data Integrity Rule**: When a vehicle record specifies `Renault Logan 1.6 2020` without a confirmed engine code, the system defaults to the SCe 16v profile (`H4M`) but marks the distribution interval confidence as `MEDIUM`, prompting physical confirmation of the timing mechanism.

---

## 3. Backups, Disaster Recovery & OneDrive Migration

### Recovery Objectives
- **Recovery Point Objective (RPO)**: <= 15 minutes (maximum permissible data loss window in production).
- **Recovery Time Objective (RTO)**: <= 30 minutes (maximum acceptable restoration duration).

### Backup Operations Strategy
1. **Automated Logical Backups**: Daily `pg_dump` execution producing compressed, timestamped archives (`.sql.gz`) stored in an S3-compatible cold storage vault.
2. **Point-In-Time Recovery (PITR)**: Production PostgreSQL uses Write-Ahead Log (WAL) archiving to continuous object storage, enabling millisecond-accurate recovery up to 30 days retroactively.
3. **Automated Restore Testing**: Scheduled weekly verification job that restores the latest backup onto an ephemeral staging instance and executes integrity assertions.

### OneDrive Database Decoupling Plan
Running embedded SQLite or WASM PGlite engines directly inside cloud-synchronized folders (such as Microsoft OneDrive) induces concurrency conflicts:
- OneDrive background processes lock `.sqlite` / `.db` files during chunk uploads, causing `EBUSY`, `EPERM`, or `ENOENT` faults in Node.js/Next.js runtimes.
- Asynchronous sync can generate `(1)` duplicate collision files when writes occur simultaneously.

#### Migration Steps:
1. **Target Relocation**: Decouple the local database path to an unsynchronized workspace directory outside OneDrive:
   - Linux / macOS: `~/.local/share/automotors/data`
   - Windows: `%LOCALAPPDATA%\AutomotorsGarage\data` or local project root `.data/` explicitly protected by `.gitignore`.
2. **Environment Variable Configuration**:
   ```bash
   AUTOMOTORS_DATA_DIR="%LOCALAPPDATA%\\AutomotorsGarage\\data"
   ```
3. **Storage Relocation Script**: Automate migration via `scripts/database/relocate-data.ps1` to stop active database processes, copy existing `.data` payloads to the new location, update environment pointers, and verify database integrity.

---

## 4. Local Real PostgreSQL Foundation & Topology Transition (Milestone 14.2.1)

### Dual Engine Persistence Architecture & Provider Control
The system implements a structured persistence provider strategy (`DatabaseFactory` + `apps/backend/src/main.ts`):
1. **`DB_PROVIDER=postgres`**: Targets native PostgreSQL 16+ on Windows (managed via `pg.Pool` with connection pool metrics). If the database connection fails, the process aborts immediately (`process.exit(1)`) with zero silent fallback to ensure absolute persistence integrity.
2. **`DB_PROVIDER=pglite`**: Uses embedded PGlite WASM (PostgreSQL 16.4 engine running in-process), keeping the local workspace frictionless without requiring background Windows services.
3. **Production Policy**: In `NODE_ENV === 'production'`, `postgres` is strictly enforced and PGlite fallback is blocked.

### Relational Migrations Inventory (26 Tables)
All migrations are written in strict ANSI/PostgreSQL SQL and are 100% compatible across both PGlite and real PostgreSQL instances:
- `0001_initial_schema.sql` (18 tables): IAM, workshops, members, sessions, vehicles, customers, work orders, maintenance history, evidence, audit logs, outbox.
- `0002_owner_portal.sql`: Multi-tenant extensions for Mi Automotors (optional VINs, owner vehicle binding, owner-declared maintenance records).
- `0003_vehicle_knowledge_base.sql` (8 tables): OEM vehicle knowledge base, powertrains, generations, documentary sources, technical specs, and versioned maintenance rules.

### Native Windows Service Deployment
Rather than introducing container virtualization overhead (Docker/WSL) on the developer workstation:
- **Service**: Native PostgreSQL 16 runs as a lightweight Windows Service (`postgresql-x64-16`) on `127.0.0.1:5432`.
- **Isolation Verification**: `scripts/database/verify-postgresql-native.ps1` safely provisions an isolated integration database (`automotors_garage_integration`), applies all migrations via `DatabaseMigrator`, and verifies table integrity before routing application traffic.
- **Data Protection**: Existing development and demo records in `.data/postgres_dev` remain intact until explicit migration in Milestone 14.2.2.
