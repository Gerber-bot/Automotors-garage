# ADR-003: Authorize workshop requests against current database state

## Status
Accepted for stage 16.2.1; the schema migration must not be applied to production without a separate rollout.

## Context
The workshop-history routes isolate records by workshop, but a signed JWT still carries a snapshot of role and permissions. A revoked membership, disabled user or workshop, or changed permission must take effect before the next private request. The existing membership table has no place to store an independent permission change.

## Decision
1. Authenticate the token and persisted session, then recheck the active user and (for a tenant token) the active membership and workshop in PostgreSQL on every private request. The token identifies the selected workshop, but never authorizes access on its own. Reject a mismatched session user.
2. Keep `permissions` nullable on `workshop_members`: `NULL` means the existing role defaults; an array, including an empty array, is the explicit current permission set. Intersect it with the role's allowed permissions so overrides cannot elevate privilege. This is an additive migration, not an instruction to migrate a real database during reconstruction.
3. Require current `READ` for workshop history summaries and current `CALCULATE_PREVENTIVE` for workshop preventive explanations. Continue to scope records and calculations in the repository by the authenticated workshop. Owner endpoints continue to authorize by current user identity and vehicle ownership. Platform `SUPER_ADMIN` remains restricted to its existing platform-only policy; tenant memberships cannot grant it.

## Consequences
- Role, membership, workshop, user, and permission changes take effect without refreshing a JWT.
- An additional database lookup is required per authenticated request; existing deployments must apply the additive migration as a separate, reviewed operation before deploying the new code.
- The present platform schema has no persistent platform-admin assignment. This decision does not create one or expand platform-admin access.

## Deployment note (stage 16.2.10)
`apps/backend/src/main.ts` still calls `DatabaseMigrator.runMigrations` at startup, and the migrator replays `0001`–`0004` on every boot. Deploying this branch therefore applies `0004` automatically on the first start; it is not a separate operator action in this codebase.

`0004` is `ALTER TABLE workshop_members ADD COLUMN IF NOT EXISTS permissions text[]`. It is additive and replay-safe: existing rows keep all values, the new column is `NULL` (role defaults) for every existing membership, and no permission is granted. A local PGlite probe applied `0001`–`0003`, inserted a membership, then applied `0004` twice and replayed the full set: the row, role, and timestamps were unchanged and `permissions` stayed `NULL`.

This does not authorize production use. The probe ran on in-memory PGlite, not on native PostgreSQL, and this branch does not introduce Work's explicit-migration system. To honor a controlled rollout, apply `0004` in a reviewed maintenance window before the first start, or hold the deployment until an explicit migration path exists. Treating the startup replay as production-safe would be an assumption, not evidence.
