# Engineering & Development Guidelines

## 1. Code Standards
- **Strict TypeScript**: `noImplicitAny: true`, `strictNullChecks: true`, `strict: true`.
- **Zero Unjustified `any`**: Use `unknown`, generic parameters, or explicit schema types.
- **Pure Domain**: Domain entities and value objects must contain domain business rules and validate invariants upon instantiation.
- **Thin Controllers**: Controllers only parse inputs, call an application service, and map the output.
- **Error Handling**: Use explicit typed Domain Errors or Result monads rather than arbitrary unhandled exceptions.

## 2. Commit & Branching Conventions
- Conventional Commits format: `<type>(<scope>): <short summary>` (e.g., `feat(work-order): implement status transition guards`).
- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`.
- NO AI attribution lines (e.g., "Co-Authored-By: AI") in commits.

## 3. Testing Standards
- **Unit Tests**: Fast, in-memory, deterministic. Must cover domain invariants and use cases.
- **Integration Tests**: Verify repository queries and database constraints using testcontainers or local Postgres.
- **E2E Tests**: Verify complete workflows across HTTP endpoints and browser UI.
- Mocking: Only mock external boundaries (e.g., third-party SMS, OpenAI, AWS S3). Never mock the system under test.
