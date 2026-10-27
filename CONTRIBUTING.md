# Contributing to Automotors Garage

Welcome to **Automotors Garage**. To ensure high architectural quality, safety, and maintainability, all contributors and agents must follow these guidelines.

---

## Code of Conduct & Core Invariants

1. **Clean Architecture Compliance**:
   - Keep Domain clean and framework-agnostic.
   - Inject repository interfaces, not concrete implementations.
   - Do not write business logic in controllers.
2. **Security by Default**:
   - Never commit sensitive secrets, credentials, or keys.
   - Never trust frontend-supplied `tenant_id`. Always derive tenant identity from authenticated session claims.
   - Enforce authorization checks on all private routes.
3. **Quality & Testing**:
   - Write automated unit tests for domain entities and use cases.
   - Code must pass `tsc --noEmit` and ESLint checks with zero errors.
   - Conventional Commits only (`feat:`, `fix:`, `docs:`, etc.).
   - No AI co-authorship attribution in commit messages.

---

## Development Workflow

1. Check open issues or milestone tasks.
2. Document architectural decisions in `docs/decisions/` before introducing structural changes.
3. Verify test coverage and linting locally before submitting a Pull Request:
   ```bash
   pnpm lint
   pnpm test
   pnpm typecheck
   ```
