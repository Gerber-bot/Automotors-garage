# AGENTS.md — Multi-Agent Orchestration Protocol & Architecture

## System Overview
Automotors Garage coordinates specialized autonomous and semi-autonomous engineering agents under the **Organic Driven Development (ODD)** paradigm. The lead orchestrator maintains high architectural standards and delegates bounded, well-defined units of work to domain-specific agents.

---

## Antigravity Subagent Capabilities & Environment Mapping

Antigravity operates with both native runtime subagent lifecycle tools and repository-level specification files:

1. **Native Dynamic Execution**:
   - `define_subagent`: Used by the orchestrator to instantiate scoped subagents with dedicated system prompts and tool allowances.
   - `invoke_subagent`: Spawns subagent tasks running in the background with isolated or shared workspace modes (`inherit`, `branch`, `share`).
   - `manage_subagents`: Inspects, communicates with (`send_message`), or safely terminates child subagents.

2. **Declarative Role Specifications**:
   - Stored in `.agents/agents/<role>.md`.
   - Defines strict file boundaries, architectural constraints, and acceptance criteria.
   - Used as system prompts when creating dynamic subagents.

3. **Workspace Isolation & Parallelism**:
   - Subagents executing independent, non-conflicting tasks run in isolated git branches or worktrees (`branch` or `share` mode).
   - Conflicting edits across identical files are prohibited; synchronization happens at the orchestrator layer.

---

## Agent Catalog & Boundaries

| Agent | Core Responsibilities | Allowed Modification Scope | Mandatory Validation |
| :--- | :--- | :--- | :--- |
| **architect** | System design, clean architecture boundaries, ADRs | `docs/architecture/**`, `docs/decisions/**`, monorepo configs | Lint dependencies, no circular graph |
| **security-auditor** | RBAC/ABAC, multi-tenancy, threat model, crypto | `docs/security/**`, `tests/security/**`, security guards/middleware | Negative security tests, zero high CVEs |
| **backend-engineer** | NestJS modular monolith, use cases, domain logic | `apps/backend/src/**`, `packages/shared-kernel/**`, `packages/contracts/**` | Vitest unit/integration tests, zero `any` |
| **database-engineer** | PostgreSQL, Drizzle ORM, migrations, repositories | `packages/database/**`, `apps/backend/src/infrastructure/database/**` | Reversible migrations, query plans |
| **frontend-engineer** | Next.js, React, Tailwind, shadcn/ui, state | `apps/frontend/**`, `packages/ui/**` | Strict typecheck, responsive UI, accessibility |
| **ai-engineer** | Voice transcription (Whisper), predictive service, LLMs | `apps/backend/src/modules/ai/**`, `packages/ai-services/**` | Deterministic mocked tests, Zod validation |
| **qa-engineer** | E2E Playwright, Vitest suites, test data factories | `tests/**`, `apps/*/test/**`, `*.spec.ts`, `*.e2e-spec.ts` | 100% assertions valid, no flaky tests |
| **devops-engineer** | Native services, CI/CD, local infrastructure | `.github/**`, `Scripts de ejecucion automatica/**`, deployment configs | Native startup and health checks without containers |
| **documentation-engineer** | Architecture guides, API specs, developer onboarding | `docs/**`, `README.md`, `CONTRIBUTING.md`, OpenAPI docs | Accurate markdown, verified setup guides |

---

## Universal Agent Rules & Hard Invariants

1. **Deny-by-Default & Least Privilege**:
   - No agent may access or edit files outside its designated scope without orchestrator approval.
   - Private endpoints require explicit authentication and role/resource authorization.
2. **Never Trust Client Tenant Context**:
   - The frontend never dictates `tenant_id`. All multi-tenant queries must derive tenant context strictly from verified server-side JWT session credentials.
3. **No Secret Commits**:
   - Committing API keys, passwords, database credentials, or real secret tokens is strictly prohibited across all agents.
4. **No Falsified Tests or Premature Claims**:
   - An agent must never mark a task complete without executing verifiable tests. Mocks must be explicitly marked as mocks.
5. **Documentation Precedes or Accompanies Code**:
   - Architectural decisions must be documented in `docs/decisions/` before broad structural implementation.
