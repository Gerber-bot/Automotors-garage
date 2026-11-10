# Windows development without containers

Automotors Garage runs directly on Node.js. Native PostgreSQL is used when `DB_PROVIDER=postgres` and is the default when `NODE_ENV=production`; development and the current automated suite can use the existing embedded PGlite mode. Docker is not part of the runtime or CI.

## Prerequisites and install

- Windows PowerShell, Node.js **24.x** (the source runner uses `--experimental-strip-types`), npm, and Git.
- For native mode, install PostgreSQL 16 or 17 as a Windows service, then provision a dedicated database and credentials. See [native PostgreSQL setup](postgresql-local-setup.md).

From the repository root, run `npm ci`. The root `postinstall` also runs `npm --prefix apps/frontend ci`. To review or disable lifecycle scripts, use `npm ci --ignore-scripts` followed by `npm --prefix apps/frontend ci --ignore-scripts` instead. Installation does not start a database.

## Configure the backend

Create a local `.env` from `.env.example` without committing credentials. `npm run start:api` and the Windows start script load this file using Node's `--env-file-if-exists=.env`. Environment variables already set in the shell take precedence.

| Setting | Meaning |
| --- | --- |
| `DB_PROVIDER=postgres` | Use native PostgreSQL via `pg.Pool` and Drizzle; development defaults to PGlite when unset. Production defaults to PostgreSQL when unset; explicitly set `postgres` for deployment. |
| `DATABASE_URL` | Connection URI; takes precedence over individual connection fields. Keep it private. |
| `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME` | Alternative native connection fields (defaults: localhost, 5432, postgres, postgres, automotors_garage). Supply an explicit password rather than relying on defaults. |
| `JWT_SECRET` | Required in production (at least 32 characters); never commit it. |
| `PG_DATA_DIR` | In PGlite mode, must resolve inside this installation's `.data/`; external or linked storage paths are rejected. Normal development uses `.data/postgres_dev`. |
| `HOST`, `PORT`, `BACKEND_API_URL` | Backend defaults to `127.0.0.1:4000`; frontend proxy defaults to that address. Configure the frontend's `BACKEND_API_URL` separately if needed. |

## First-time database preparation

The normal launcher **does not apply migrations**. From the repository root, verify which database the local `.env` and inherited environment select before any operation:

1. Run `npm run db:status`. A new or incomplete database reports pending migrations; an existing database without a migration ledger is **unmanaged**, not assumed empty.
2. Only for a **new, isolated local database**, explicitly run `npm run db:apply` to record and apply migrations 0001–0004. Confirm that this installation owns the selected PGlite directory; do not use a persistent database from another copy.
3. **Legacy adoption is temporarily disabled.** `npm run db:adopt` refuses before opening a database, even with an acknowledgment. The former comparison did not cover executable objects and cannot establish complete equivalence. For an existing database without a ledger, preserve it and request manual review. Do not insert ledger rows, run `db:apply` to guess history, or bypass this restriction. Native PostgreSQL remains separately unvalidated.
4. Run `npm run db:status` again. Only a current schema with matching migration checksums and required tables/permission column permits ordinary startup. Migration checksums normalize Windows/Unix line endings, not substantive changes.

Production/native PostgreSQL requires separate backup and rollout approval. The helper `verify-postgresql-native.ps1` can create and migrate a database; do not use it as a read-only status command.

## Start, check, and stop

1. If using native PostgreSQL, confirm the correct service with `Get-Service postgresql*`; start **only that service** using `Start-Service <service-name>` with appropriate permissions. Verify connectivity with `pg_isready -h 127.0.0.1 -p 5432` or a read-only `psql` connection before launching the backend. Do not create or migrate a database merely to check availability.
2. Run `npm run dev` to launch the local backend and frontend; `npm run dev:check` and `npm run dev:health` check their status. Alternatively, run `npm run start:api` and `npm --prefix apps/frontend run dev` in separate terminals.
3. Open the frontend at `http://127.0.0.1:3000`; backend health is `http://127.0.0.1:4000/health/live`.
4. Run `npm run dev:stop` or double-click `DETENER_AUTOMOTORS.bat` to stop **only** processes verified as belonging to this installation. If you started the servers in terminals, stop each with Ctrl+C. The PostgreSQL Windows service is **not** stopped by this command; stop it separately only if you own that service and other applications do not need it.

If either application port is owned by another process or the saved process identity does not match, the launcher must refuse to take over or stop it. Investigate the conflict; do not remove PID files, force-terminate processes, or delete `.data/` to make startup succeed. Preserve `.logs/` for diagnosis.

The only exception is a record whose process is **definitively gone**: the PID no longer exists, or Windows assigned that PID to a process with a different creation time. The controller removes only that stale process record and its control file before starting; it never removes the record of a live verified process. If the recorded process is still alive but its identity cannot be verified, stop and review manually.

## Explicit disposable demo seeding

`seed:demo` loads `.env` like `db:*`, but rejects external database providers. Only a prepared, explicitly selected PGlite directory inside this installation is accepted. After independently preparing a **new disposable database**, set `DB_PROVIDER=pglite`, `PG_DATA_DIR=./.data/<disposable-name>` and `DEMO_SEED_ACK=I_CONFIRM_DISPOSABLE_LOCAL_DATA`, then run `npm run seed:demo`. Remove the acknowledgment afterward. No default target is inferred, no schema is applied by seeding, and production mode is forbidden. Do not use seeding as recovery or against existing real data.

## Recover without discarding data

On a migration error, leave the application stopped. Record the diagnostic, preserve `.data/`, verify the selected database and run `npm run db:status` before another operation. A changed checksum is a deployment mismatch: restore/review the migration source rather than changing an applied row. A database without a ledger is not automatically safe to adopt. Back up existing data and request review if the schema cannot be verified. Do not use `seed:demo` or delete lock files as a recovery shortcut.

## Validate

`npm run typecheck`, `npm test`, `npm run build`, and `npm run lint` run without a PostgreSQL service. The current test suite uses isolated PGlite databases; it does **not** prove migration behavior on a native PostgreSQL server. For that, use a separately provisioned, disposable native instance and a dedicated test database after checking every script's side effects. Never test migrations on persistent application data.
