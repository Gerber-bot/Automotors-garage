# AI Development Workflow & Orchestration Protocol

## Overview & Architecture

Automotors Garage integrates **Google Antigravity** with **Gentle AI 4.2.0** (`full-gentleman` preset) and **Engram MCP 1.20.0** under the **Organic Driven Development (ODD)** framework. This document specifies the operational model, security boundaries, subagent delegation lifecycle, and memory persistence mechanisms governing software engineering in this repository.

### Component Topology

```
┌────────────────────────────────────────────────────────────────────────┐
│                   HUMAN ARCHITECT / TECH LEAD                          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ (Directives & Review)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│             ANTIGRAVITY LEAD ORCHESTRATOR (GENTLE AI 4.2.0)            │
│  - Senior Architect Persona (Warm Rioplatense Chat / English Artifacts)│
│  - ODD Routing Ladder & Evidence Budget Enforcement                    │
│  - Contract Integrity, Security Boundary & Multi-Tenancy Enforcement   │
└───────────┬───────────────────────┬──────────────────────────┬─────────┘
            │                       │                          │
            ▼                       ▼                          ▼
┌──────────────────────┐ ┌────────────────────┐ ┌────────────────────────┐
│  ENGRAM MCP 1.20.0   │ │ NATIVE SUBAGENTS   │ │  REPOSITORY FOUNDATION │
│  - Semantic Memory   │ │ - define_subagent  │ │  - AGENTS.md Specs     │
│  - Proactive Saves   │ │ - invoke_subagent  │ │  - Modular Monolith    │
│  - Memory Judgments  │ │ - Isolated Worktree│ │  - Vitest / Node Tests │
│  - Project Scoping   │ │ - Scoped Lifecycles│ │  - Git Single Source   │
└──────────────────────┘ └────────────────────┘ └────────────────────────┘
```

---

## 1. Tool Architecture & Responsibilities

| Layer | Component | Core Responsibilities |
| :--- | :--- | :--- |
| **Harness & Orchestration** | Gentle AI 4.2.0 (`Agent Teams Lite`) | Task routing ladder, evidence budgeting, blocking prompt fidelity, subagent boundary validation. |
| **Assistant Runtime** | Google Antigravity | Tool execution (`run_command`, `read_file`, `write_file`, `edit_file`), subagent lifecycle management. |
| **Persistent Memory** | Engram MCP 1.20.0 | Cross-session context, proactive architectural saves (`mem_save`), semantic lookup (`mem_search`), conflict resolution (`mem_judge`). |
| **Role Catalog** | `.agents/agents/*.md` & `AGENTS.md` | Declarative system prompts, file modification scopes, architectural invariants, and acceptance criteria for 9 engineering roles. |
| **Code & Single Source of Truth** | Git & Repository Documentation | Authoritative source of code, migrations, tests, and Architecture Decision Records (ADRs). |

---

## 2. Organic Driven Development (ODD) Workflow

All non-trivial engineering tasks follow the 9-stage ODD lifecycle:

```
[1. Analysis] ──► [2. Planning] ──► [3. Breakdown] ──► [4. Delegation]
                                                             │
[8. Documentation] ◄── [7. Security Audit] ◄── [6. Testing] ◄┴─► [5. Implementation]
        │
        ▼
[9. Final Review & Synthesis]
```

1. **Analysis**: Inspect requirements, existing contracts, and codebase state within the bounded evidence budget (<=3 calls, ~10k tokens).
2. **Planning**: Formulate implementation strategy, verify dependencies, and assess risk tier (Passive, Medium, High).
3. **Breakdown**: Decompose substantial features into independent, disjoint behavioral units.
4. **Delegation**: If a Delegation Trigger fires (e.g., parallel writer units, complex mapping, high-risk verifier), define and invoke a bounded subagent using `.agents/agents/<role>.md` specifications. Otherwise, execute inline.
5. **Implementation**: Execute edits respecting layer boundaries (Domain pure, Application ports, Infrastructure adapters).
6. **Testing**: Run focused unit/integration tests and verify suites without falsification or mocks that hide domain failures.
7. **Security Audit**: Verify multi-tenant isolation (`tenant_id` from JWT session only), deny-by-default access, and zero secret exposure.
8. **Documentation**: Update technical specifications, milestone reports, and architecture guides alongside code changes.
9. **Final Review & Synthesis**: Synthesize decisions, outcomes, and next steps for the user concisely.

---

## 3. Persistent Memory Protocol (Engram MCP)

Engram acts as a **complementary associative memory**, not a replacement for versioned repository documentation.

### Memory Lifecycle & Protocol Rules

1. **Resolution & Scoping**:
   - At session initiation, `mem_current_project` detects the active project context.
   - When the MCP process runs from an external application directory, queries default to or resolve the active project scope.
2. **Proactive Saves (`mem_save`)**:
   - Triggered automatically after architectural decisions, non-obvious bugfixes, pattern establishment, or milestone completions.
   - Requires structured format: `**What**`, `**Why**`, `**Where**`, and `**Learned**`.
   - Never saves passwords, API keys, tokens, session secrets, or customer PII.
3. **Conflict Judgment (`mem_judge`)**:
   - When `mem_save` flags `judgment_required=true`, candidate relations are evaluated (`compatible`, `supersedes`, `scoped`, `not_conflict`) and recorded.
4. **Recall Protocol**:
   - `mem_search` retrieves historical decisions and context.
   - Full observation details are retrieved via `mem_get_observation(id: <ID>)`.
5. **Session Close**:
   - Before completing major milestones, `mem_session_summary` is called to record achievements, discoveries, and open next steps.

---

## 4. Subagent Delegation & Dynamic Execution

Antigravity executes subagents through dynamic runtime tools while adhering to static role definitions in `.agents/agents/`:

### Role Mapping Catalog

| Role | Role File | Scope Boundaries | Key Invariants |
| :--- | :--- | :--- | :--- |
| **Architect** | `architect.md` | `docs/architecture/**`, `docs/decisions/**`, monorepo configs | Pure domain, zero circular dependencies, ADR mandatory |
| **Security Auditor** | `security-auditor.md` | `docs/security/**`, guards, auth middleware | Deny-by-default, JWT tenant derivation, zero high CVEs |
| **Backend Engineer** | `backend-engineer.md` | `apps/backend/src/**`, `packages/shared-kernel/**` | Clean Architecture, Vitest coverage, zero `any` |
| **Database Engineer** | `database-engineer.md` | `packages/database/**`, migrations | Reversible migrations, no destructive drops, PGlite fail-safe |
| **Frontend Engineer** | `frontend-engineer.md` | `apps/frontend/**`, `packages/ui/**` | Next.js 15, strict typecheck, Lucide icons, responsive UX |
| **AI Engineer** | `ai-engineer.md` | `apps/backend/src/modules/ai/**` | Deterministic fallback, Zod schema validation, disclaimers |
| **QA Engineer** | `qa-engineer.md` | `tests/**`, `*.spec.ts`, `*.e2e-spec.ts` | 100% assertions valid, no flaky tests, zero suppressed errors |
| **DevOps Engineer** | `devops-engineer.md` | `scripts/**`, launchers, root batch files | Unprivileged execution, no destructive auto-clean, cross-platform |
| **Documentation** | `documentation-engineer.md` | `docs/**`, `README.md` | Accurate markdown, verified code blocks, zero outdated guides |

### Dynamic Invocation Standard

When delegating via `define_subagent` and `invoke_subagent`:
1. Use the declarative markdown in `.agents/agents/<role>.md` as the core of the subagent's `SystemPrompt`.
2. Restrict tool allowances (`EnableWriteTools`, `EnableMCPTools`) according to the role's edit boundaries.
3. Keep handoffs concise: provide exact file paths, constraints, and validation commands.

---

## 5. Skills Integration & Usage

Antigravity installs built-in skills located in `~/.gemini/antigravity/builtin/skills/`:

- **`generative_ui`**: Inline HTML visualizers, architectural topology maps, and interactive inspection widgets in chat/artifacts.
- **`automation`**: Background scheduled tasks (e.g., daily health probes, automated verification runs).
- **`agy-customizations` & `plugin`**: Packaging repository conventions and custom tools into modular plugins when needed.
- **Domain Skills Policy**: No redundant custom skills are introduced unless a clear operational gap arises (e.g., dedicated OBD-2 DTC scanner parser or PGlite database diagnostic tools).

---

## 6. Security Boundaries & Invariants

1. **Zero Secret Persistence**: Never write API keys, database credentials, JWT secrets, or environment credentials to Git, documentation, or Engram memory.
2. **Tenant Isolation**: `tenant_id` must NEVER be accepted from untrusted client payloads; it must always be extracted from verified server-side JWT session tokens.
3. **Fail-Safe Data Protection**: Automated scripts and database engines must never delete data directories or PID files silently upon failure.
4. **Honest Reporting**: Never claim tools ran, tests passed, or subagents participated unless verified with real execution output.
