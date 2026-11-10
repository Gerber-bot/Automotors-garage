# Integrate security fixes without replacing local work

The security clone is based on `e4a9089`. The primary checkout at `C:\Dev\AutomotorsGarage` was inspected read-only. Do not copy whole versions of `main.ts` or `package.json` from this clone: the primary checkout contains additional migration and process controls.

## Apply narrowly after approval

1. Add `apps/backend/src/infrastructure/database/postgres-config.ts` and its test. In the primary `apps/backend/src/main.ts`, add only the resolver import and replace only the `poolConfig` initializer with `resolvePostgresPoolConfig(process.env, NODE_ENV)`.
2. Preserve provider validation, production PGlite prohibition, `resolveLocalPgliteDir`, explicit `DatabaseMigrator.status` checks, pending-migration failures, shutdown control, PID ownership and cleanup. Do not introduce automatic startup migrations from the older clone.
3. In the existing primary `Scripts de ejecucion automatica/database/migrations.ts`, add a relative import of the same resolver (`../../apps/backend/src/infrastructure/database/postgres-config.ts`). Replace only the argument of `DatabaseFactory.createPool(...)` with `resolvePostgresPoolConfig(process.env, env)` so validation happens before opening a pool. This is an integration instruction, not a modification performed here.
4. Keep the CLI's `status`/`apply` distinction, disabled `adopt`, provider validation, production PGlite denial, directory protection, owner-file checks and pool `finally` cleanup unchanged. Run neither migrations nor status against retained databases for verification. Use disposable fixtures only.
5. Apply the HTTP parser, rejection teardown, timeout and permission hunks to `http-app.ts`. Append new integration tests to the current suite; retain all local tenant/revocation tests. Role mapping remains unchanged and restrictive.
6. In the primary `package.json`, append only `apps/backend/test/postgres-config.spec.ts` to the current `test` command. Preserve `--env-file-if-exists`, `db:*`, `test:seed`, `test:concurrency`, `test:security`, `test:windows`, migration/process tests and every current script. Do not replace the test command with this older clone's shorter list or touch lockfiles.
7. Merge the security documentation additions by section. After integration, rerun focused tests, the complete **primary** test list, typecheck, lint, build and `git diff --check`; its test count need not match this clone.

## Review boundaries and remaining decisions

- Overlapping existing files: `main.ts`, `package.json`, `http-app.ts`, and `tests/integration/workshop-history-access.spec.ts`. The first two have especially important unpublished differences. The CLI is absent from this older clone and must not be copied back or replaced.
- Security documentation is incremental; previously existing broad claims are not a new production-readiness certification.
- Manager/receptionist privilege expansion is blocked on an explicit product mapping decision; see `permissions-matrix.md`.
- Dependency findings reported previously remain unmodified. URL validation checks configuration syntax and explicit identity, not database connectivity, TLS trust, credential strength or reachability.
- Request deadlines bound body consumption, not total service capacity. Deployment-level rate, concurrency and header limits remain separate controls.

No files in the primary checkout, migrations, dependencies, commits or remote branches were changed by this work.

## Verification in the isolated clone

| Check | Result |
| :--- | :--- |
| Focused PostgreSQL and workshop HTTP tests | 28 passed, 0 failed, 0 skipped |
| `npm test` | 186 passed, 0 failed, 0 skipped; 21 suites |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed; 0 errors, 121 existing warnings |
| `npm run build` | Passed; frontend production build (root script scope) |
| `git diff --check` | Passed |
| Primary checkout preservation | 361 tracked/untracked file hashes unchanged; no path differences; 75 status entries retained; HEAD `d684176` |

The added scenarios cover production URL omissions, malformed/encoded identities, host and port validation, identity-query rejection, secret-free errors, valid local URLs, six role identifiers with the same token, oversized known-length and unterminated chunked uploads, idle and absolute body deadlines, legitimate slow delivery, client aborts, and verified keep-alive reuse only for legitimate requests. Test databases are disposable fixtures; no retained database or migration CLI was opened or executed.
