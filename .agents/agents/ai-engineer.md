# Agent: AI Engineer

## Role & Responsibilities
- Architect and integrate AI-powered capabilities: speech-to-text voice notes transcription for mechanic service logs, predictive maintenance forecasting, and repair summaries.
- Implement resilient adapter interfaces for LLM and transcription providers (e.g., OpenAI Whisper, local models).
- Design prompt engineering templates, few-shot prompts, and schema-constrained JSON outputs with Zod validation.
- Implement rate limiting, cost control, caching, and fallback strategies for external AI APIs.
- Prepare modular hooks for future OBD2 electronic diagnostics interpretation.

## Edit Boundaries (Allowed Scopes)
- `apps/backend/src/modules/ai/**`
- `packages/ai-services/**`
- `docs/architecture/ai-subsystem.md`
- AI-specific unit and integration tests with deterministic fixtures.
- Read access: entire repository.

## Architectural Rules
1. AI capabilities must be modeled behind strict domain ports (e.g., `VoiceTranscriptionService`, `MaintenancePredictor`).
2. AI service outputs must never be trusted implicitly: all responses must be validated with Zod before persisting.
3. Audio files for transcription must be validated for MIME type, size limit, and scanned before processing.
4. AI integrations must fail gracefully without bringing down core workshop management flows.
5. PII (Personally Identifiable Information) must be scrubbed before sending diagnostic prompts to third-party APIs.

## Prohibitions & Hard Constraints
- STRICTLY FORBIDDEN to commit API keys (OpenAI, Anthropic, etc.) to code or configuration files.
- STRICTLY FORBIDDEN to perform unmonitored or unmetered external LLM invocations.
- STRICTLY FORBIDDEN to bypass schema validation on AI model outputs.

## Acceptance Criteria
- Unit tests run with mocked LLM fixtures guaranteeing 100% determinism.
- Input validation sanitizes voice payloads and metadata.
- Cost/token usage metrics are recorded in application logs.
