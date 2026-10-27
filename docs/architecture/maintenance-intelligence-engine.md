# Maintenance Intelligence Engine Architecture

## 1. Architectural Philosophy: The Strict Separation of Concerns

The **Maintenance Intelligence Engine** is divided into two decoupled subsystems:

```
+---------------------------------------------------------------------------------------+
|                       AUTOMOTORS GARAGE MAINTENANCE INTELLIGENCE                      |
|                                                                                       |
|   +---------------------------------------+   +-----------------------------------+   |
|   |   A. Deterministic Maintenance Engine |   |      B. AI Assistance Engine      |   |
|   |          (Mathematical Core)          |   |       (Cognitive Interpreter)     |   |
|   +---------------------------------------+   +-----------------------------------+   |
|   | • Calculates exact due mileage        |   | • Speech-to-Text (Whisper)        |   |
|   | • Calculates calendar expiration date |   | • Structured Work Order Proposals |   |
|   | • Determines remaining km & days      |   | • Natural Language Explanations   |   |
|   | • Emits INSUFFICIENT_DATA on gaps     |   | • OBD2 DTC Diagnostic Assistance  |   |
|   | • Verifies odometer monotonicity      |   | • Redaction of sensitive PII      |   |
|   +---------------------------------------+   +-----------------------------------+   |
|                       |                                       ^                       |
|                       | Mathematical Truth                    | Explains Context      |
|                       +---------------------------------------+                       |
+---------------------------------------------------------------------------------------+
```

### Core Invariant
> [!CRITICAL]
> **LLMs are NEVER the source of mathematical truth, technical intervals, or odometer calculations.**
> The Deterministic Engine calculates the exact numbers. The AI layer interprets, formats, transcribes, and explains those numbers to humans.

---

## 2. Deterministic Engine (`DeterministicMaintenanceEngine`)

### Inputs:
- Technical vehicle profile (`make`, `model`, `year`, `engine`, `fuelType`, `currentMileage`).
- Verified service history entries.
- Service Interval Rule (`intervalKm`, `intervalMonths`, `severeUsageIntervalKm`, `source`).
- Usage conditions (`isSevereUsage`, `averageMonthlyKm`).
- Reference date.

### Outputs & States:
- `nextDueMileage`: Exact odometer target for the next service.
- `remainingKm`: Difference between due mileage and current vehicle mileage.
- `nextDueDate`: Exact calendar deadline based on months interval.
- `status`:
  - `OK`: Adequate buffer in distance and time.
  - `UPCOMING_SOON`: `<= 1,000 km` or `<= 30 days`.
  - `DUE_NOW`: `<= 200 km` or `<= 7 days`.
  - `OVERDUE`: `< 0 km` or elapsed calendar date.
  - `INSUFFICIENT_DATA`: Missing documented interval rules or odometer rollback detected.
- `confidence`:
  - `HIGH`: Prior service verified with known monthly mileage rate.
  - `MEDIUM`: Prior service verified, rate estimated from standard average.
  - `LOW`: No prior service in category, computed from vehicle year of manufacture.
  - `NONE`: Insufficient data.

---

## 3. AI Assistance & Provider Architecture

### Decoupled Ports:
- `AIProviderPort`: Interface for text generation, explanations, and summarization.
- `TranscriptionProviderPort`: Interface for speech-to-text (Whisper/local models).
- `StructuredExtractionPort`: Zod-validated structured JSON output extraction.

### Implemented Adapters:
- `MockAIProvider` / `MockTranscriptionProvider`: In-memory, deterministic, supports simulating provider timeouts, crashes, and malformed JSON.
- `OpenAIAIAdapter`: Real production adapter with:
  - Configurable timeouts (`AbortController`).
  - Exponential backoff retries.
  - Quota / Token budget limits per workshop tenant.
  - Automatic PII redaction (phones, emails, credit cards).
  - Delimited prompt injection barriers (`<untrusted_mechanic_input>`).

---

## 4. Voice Notes & Human-in-the-Loop Review

When a mechanic dictates a service (e.g., *"Cambié aceite y filtro a los 112 mil, próximo service a los 122 mil"*):
1. The audio is transcribed by `TranscriptionProviderPort`.
2. The AI extracts a typed proposal matching `VoiceNoteProposalSchema`:
   ```json
   {
     "odometerKm": 112000,
     "workPerformed": ["oil_change", "oil_filter_replacement"],
     "suggestedNextServiceKm": 122000,
     "requiresConfirmation": true,
     "confidence": 0.95
   }
   ```
3. **Mandatory Human Confirmation**:
   - The proposal is displayed on a staging review screen.
   - The engine **never** commits the proposal automatically as verified work.
   - The technician must explicitly review, adjust if necessary, and approve.

---

## 5. OBD2 Diagnostic Trouble Code (DTC) Assistance

- Incorporates standard SAE J2012 fault code definitions (`P0300`, `P0171`, `P0420`, `P0128`).
- Generates mechanic-oriented physical inspection checklists.
- Enforces an immutable non-binding technical disclaimer on all diagnostic guidance outputs.
