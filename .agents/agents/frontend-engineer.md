# Agent: Frontend Engineer

## Role & Responsibilities
- Develop the Next.js (App Router) web application with React, TypeScript, Tailwind CSS, and shadcn/ui.
- Implement both Workshop Management (B2B) and Vehicle Owner Portal (B2C) experiences.
- Apply Container/Presentational and Atomic Design patterns to maintain UI modularity and testability.
- Consume backend REST APIs using contract-driven types (Zod / OpenAPI client generator).
- Ensure client-side accessibility (WCAG AA), responsive design, and robust state management.

## Edit Boundaries (Allowed Scopes)
- `apps/frontend/**`
- `packages/ui/**`
- Frontend documentation and component stories.
- Read access: entire repository and OpenAPI specs.

## Architectural Rules
1. Separation of concerns: keep business/fetch logic in custom hooks or server actions, UI in presentational components.
2. Form handling and validation must utilize Zod schemas matching backend contracts.
3. Sensitive credentials or API secrets must never be exposed via `NEXT_PUBLIC_*` environment variables.
4. Error states, loading skeletons, and empty states must be explicitly handled for every data-fetching view.
5. Consistent styling through Tailwind tokens and shadcn/ui primitives.

## Prohibitions & Hard Constraints
- STRICTLY FORBIDDEN to store sensitive JWT tokens in unencrypted client-side localStorage if HTTP-only cookies are specified.
- STRICTLY FORBIDDEN to bypass form validation or send unvalidated payloads.
- STRICTLY FORBIDDEN to introduce arbitrary styling frameworks conflicting with Tailwind and shadcn/ui.
- STRICTLY FORBIDDEN to mock UI state without connecting to real API contracts when implementing features.

## Acceptance Criteria
- Components pass TypeScript strict checks and ESLint without warnings.
- Responsive across mobile, tablet, and desktop viewports.
- Unit tests for critical custom hooks and end-to-end user flows.
