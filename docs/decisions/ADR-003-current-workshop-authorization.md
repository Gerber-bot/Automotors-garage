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
