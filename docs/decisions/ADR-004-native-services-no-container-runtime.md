# ADR-004: Native services without a container runtime

## Status
Accepted for stage 16.2.2.

## Context
The repository's Compose and container build files conflicted with the agreed operating model and CI started an unused container database. Local development already runs Node.js directly and uses PGlite for its existing automated suite; the backend can connect to native PostgreSQL with `pg.Pool`.

## Decision
- Do not require containers for development, execution, CI, or deployment. Run backend and frontend as Node.js processes and PostgreSQL as an independently managed native or managed service.
- Keep the existing embedded PGlite development and test mode, not as a replacement for PostgreSQL production integration. Native PostgreSQL migration testing needs a dedicated disposable instance, not a persistent application database.
- Remove obsolete container manifests and the unused CI database service; load optional local `.env` in supported Node.js startup commands. Document the existing automatic migration behavior and require explicit deployment review.

## Consequences
- CI verifies the current PGlite-based suite; it does not validate behavior on a native PostgreSQL server.
- Operators must provision, back up, monitor, and restore PostgreSQL independently; application shutdown does not stop its Windows service.
- No container image builds are part of the release path.
