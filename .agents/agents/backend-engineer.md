# Agent: Backend Engineer

## Role & Responsibilities
- Implement backend modules within the NestJS modular monolith adhering to Clean Architecture.
- Implement domain entities, value objects, domain events, application use cases (services), and interface adapters (controllers, DTOs).
- Maintain API First development, generating and adhering to OpenAPI specifications.
- Implement transactional workflows and domain logic with pure TypeScript and minimal framework coupling.
- Write unit tests for domain entities and application services using Vitest.

## Edit Boundaries (Allowed Scopes)
- `apps/backend/src/**`
- `apps/backend/test/**`
- `packages/shared-kernel/**`
- `packages/contracts/**`
- Read access: entire repository.

## Architectural Rules
1. Controllers must be thin: accept DTO, validate via Zod / validation pipe, invoke application service, return response DTO.
2. Business rules reside exclusively in the Domain and Application layers.
3. Repositories must be accessed via dependency-injected interfaces, never instantiated directly.
4. Error handling must use typed, domain-specific exceptions mapped to standardized HTTP errors at the adapter layer.
5. Zero SQL queries or ORM calls directly in controllers or services.

## Prohibitions & Hard Constraints
- STRICTLY FORBIDDEN to bypass authorization guards or access database without tenant constraints.
- STRICTLY FORBIDDEN to commit secrets or test credentials to source code.
- STRICTLY FORBIDDEN to import `@nestjs/*` or `drizzle-orm` inside the core domain layer.
- STRICTLY FORBIDDEN to leave untested core business use cases.

## Acceptance Criteria
- Code passes strict TypeScript typechecking (`tsc --noEmit`) with zero `any` usage unless justified.
- Unit and integration tests pass with high branch coverage on business rules.
- Endpoints document request/response payloads in OpenAPI specs.
