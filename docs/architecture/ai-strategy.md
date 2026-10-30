# AI Optimization & Integration Strategy

## 1. Executive Summary & Core Philosophy

Automotors Garage employs artificial intelligence strictly as an assistive layer designed to enhance mechanical diagnostics and vehicle ownership clarity. AI does not replace deterministic business logic, nor does it make autonomous repair decisions.

### Foundational Principles:
1. **Human-in-the-Loop Supremacy**: All AI outputs are assistive and non-binding. Physical inspection and certification by a technician remain mandatory before component replacement.
2. **Deterministic Baseline Priority**: Mathematics, interval countdowns, remaining kilometers, and calendar due dates are computed 100% deterministically by the `DeterministicMaintenanceEngine`. LLMs are strictly forbidden from modifying or inventing numerical intervals.
3. **No Fake AI Simulation**: When external AI providers lack configuration (missing or placeholder API keys), the application explicitly reports the unconfigured state and falls back to deterministic rule-based algorithms. It never returns canned responses that masquerade as real AI generation.
4. **Contextual Action Model**: Floating or omnipresent chat widgets are rejected. AI interactions occur solely via focused, contextual actions embedded within relevant domain views (Diagnostics, History, and Maintenance Projections).
5. **Zero Voice Dictation Overhead**: Voice notes and speech-to-text intake have been decommissioned in favor of structured, rapid manual entry (sub-60-second Quick Service workflow) and verified records.

---

## 2. Contextual AI Capabilities

The platform implements three high-value contextual AI use cases:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Automotors Domain Engine                        │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
           ┌─────────────────────────┼─────────────────────────┐
           ▼                         ▼                         ▼
┌─────────────────────┐   ┌─────────────────────┐   ┌─────────────────────┐
│  OBD-II Diagnostic  │   │   Smart Vehicle     │   │     Maintenance     │
│      Assistant      │   │   History Summary   │   │     Explanation     │
├─────────────────────┤   ├─────────────────────┤   ├─────────────────────┤
│ • Interprets DTCs   │   │ • Scoped to vehicle │   │ • Explains engine   │
│ • SAE J2012 context │   │ • Key interventions │   │   projections       │
│ • Suggested checks  │   │ • Recurring repairs │   │ • Invariant numbers │
│ • Mandatory warning │   │ • Data limitations  │   │ • Workshop warning  │
└─────────────────────┘   └─────────────────────┘   └─────────────────────┘
```

### Capability A: OBD-II Diagnostic Assistant (`interpretObd2`)
- **Location**: `DiagnosticsView` (Workshop Scanner).
- **Function**: Takes active SAE Diagnostic Trouble Codes (DTCs), sensor telemetry, and vehicle parameters. Merges verified SAE standard definitions with LLM reasoning to outline systemic impacts and a prioritized mechanical checklist.
- **Safety Invariant**: Features a mandatory, un-dismissible technical disclaimer: *"AI-assisted technical guidance. Physical diagnosis and verification by a certified technician is mandatory before component replacement."*

### Capability B: Smart Vehicle History Summary (`summarizeHistory`)
- **Location**: `MiAutomotorsView` (Owner History Tab) & `VehiclesView` (Workshop Passport).
- **Function**: Synthesizes chronological vehicle maintenance records into a structured briefing covering major historical interventions, recent services, recurring repair patterns, and technical notes from past mechanics.
- **Strict Data Integrity**: Operates exclusively on verified timeline records supplied in context. Cross-references specific record IDs without fabricating service milestones.

### Capability C: Maintenance Prediction Explanation (`explainMaintenance`)
- **Location**: `MiAutomotorsView` (Predictions Tab) & `VehiclesView` (Preventive Tab).
- **Function**: Takes the mathematical output of `DeterministicMaintenanceEngine` and produces an accessible technical narrative explaining *why* the manufacturer recommends this service, what wear factors are mitigated, and what uncertainty exists.
- **Strict Mathematical Invariant**: Preserves exact mileage (`nextDueMileage`, `remainingKm`) and dates (`nextDueDate`). If the engine determines `INSUFFICIENT_DATA`, the explanation clarifies data requirements rather than guessing intervals.

---

## 3. Resilience, Privacy & Security Architecture

### Configuration & Graceful Degradation
- **Provider Status Probe**: Exposed via `GET /api/v1/ai/status`. The frontend verifies whether AI capabilities are configured without exposing credentials.
- **Deterministic Fallback**: If `OpenAIAIAdapter.isConfigured()` returns `false`, or if external network calls encounter a timeout (5s) or HTTP error, the system executes deterministic fallback algorithms. The user receives complete, structured output without crashes or false claims.

### Security Guards:
1. **PII Sanitization**: Prompt payloads are sanitized by `OpenAIAIAdapter.sanitizePrompt()` before transmission, redacting email addresses, phone numbers, and payment card numbers.
2. **Prompt Injection Defense**: Vehicle telemetry and technical notes are enclosed in strict XML structural boundaries (`<vehicle_data>`, `<untrusted_input>`), with system prompts explicitly forbidding execution of embedded commands.
3. **Tenant Rate Limits & Quotas**: Monthly request counts are tracked per workshop (`maxMonthlyBudgetPerWorkshop`), rejecting excessive calls to protect operational budgets.
4. **Strict Schema Conformance**: All external LLM responses are parsed and validated via Zod schemas (`Obd2InterpretationSchema`, `HistorySummarySchema`, `MaintenanceExplanationSchema`). Malformed responses trigger the deterministic fallback engine.
