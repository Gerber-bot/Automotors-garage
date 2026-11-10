# ADR-005: Explicit migrations and installation-owned processes

## Status
Accepted for stage 16.2.3. Runtime details must be validated against the implementation before manual startup.

## Context
The Windows launcher previously inferred ownership from broad process-name and port matches, which could target another installation. The backend also replayed every SQL migration on each boot against a persistent database without a migration ledger. Both behaviors can affect data or processes outside the intended instance.

## Decision
- Store verifiable per-installation process identity (including the canonical root, PID, process creation time, and command marker), and reject occupied ports unless the matching managed process belongs to this installation. Stale or unverified identity must never authorize process termination. Attempt graceful shutdown before any constrained fallback.
- Record applied migrations with file identifier and SHA-256 checksum. Apply a migration and its record in the same transaction; serialize concurrent attempts. Backend startup only checks the ledger and refuses to serve when changes are pending or altered.
- Keep migration application as an explicit, operator-controlled preparation step. Never silently adopt an existing database without a ledger: verify its actual schema against an expected structure before allowing an explicit adoption, and fail closed if verification is inconclusive.
- PGlite remains the embedded local development engine using a directory under the current worktree; production must select native PostgreSQL, not an explicit PGlite override.

## Consequences
- A new installation needs one clearly documented preparation operation before double-click startup.
- Unmanaged existing databases require complete schema verification, not a guessed migration history. **Update, stage 16.2.7.2:** adoption is disabled at both CLI and API boundaries until a verifier covers executable objects, schema objects, policies and privileges; acknowledgment cannot override the rejection. Rollout and native PostgreSQL testing remain separate approval steps.
- Process manifests are local control-plane records; they cannot be used as evidence of ownership without verifying the currently running process and its start time.
