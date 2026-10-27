import { describe, it, beforeEach } from 'node:test';
import * as assert from 'node:assert/strict';

import {
  DeterministicMaintenanceEngine,
  MaintenanceStatus,
  DueReason,
  EstimationConfidence,
} from '../src/modules/maintenance-intelligence/domain/deterministic-engine.ts';
import {
  IntervalSource,
  ServiceCategory,
} from '../src/modules/maintenance-intelligence/domain/intervals.ts';
import type {
  ServiceIntervalRule,
} from '../src/modules/maintenance-intelligence/domain/intervals.ts';
import { CalculatePreventiveDueUseCase } from '../src/modules/maintenance-intelligence/application/calculate-preventive-due.usecase.ts';
import { ProcessVoiceNoteUseCase } from '../src/modules/maintenance-intelligence/application/process-voice-note.usecase.ts';
import { ExplainMaintenanceUseCase } from '../src/modules/maintenance-intelligence/application/explain-maintenance.usecase.ts';
import { InterpretObd2UseCase } from '../src/modules/maintenance-intelligence/application/interpret-obd2.usecase.ts';
import { MockAIProvider, MockTranscriptionProvider } from '../src/modules/maintenance-intelligence/adapters/mock-ai.adapter.ts';
import { OpenAIAIAdapter } from '../src/modules/maintenance-intelligence/adapters/openai-ai.adapter.ts';

describe('Maintenance Intelligence Engine Test Suite', () => {
  let engine: DeterministicMaintenanceEngine;
  let mockAi: MockAIProvider;
  let mockTranscription: MockTranscriptionProvider;

  const standardOilRule: ServiceIntervalRule = {
    id: 'rule-oil-10k',
    category: ServiceCategory.OIL_AND_FILTER,
    title: 'Synthetic Oil & Filter Service',
    intervalKm: 10000,
    intervalMonths: 12,
    source: IntervalSource.OEM_MANUAL,
    sourceCitation: 'Toyota Manual 2022 p. 142',
    severeUsageIntervalKm: 5000,
    severeUsageIntervalMonths: 6,
  };

  const timingBeltRule: ServiceIntervalRule = {
    id: 'rule-timing-belt',
    category: ServiceCategory.TIMING_BELT,
    title: 'Timing Belt & Tensioner Replacement',
    intervalKm: 60000,
    intervalMonths: 60, // 5 years
    source: IntervalSource.OEM_MANUAL,
    sourceCitation: 'VW Service Schedule 2019 p. 88',
  };

  beforeEach(() => {
    engine = new DeterministicMaintenanceEngine();
    mockAi = new MockAIProvider();
    mockTranscription = new MockTranscriptionProvider();
  });

  // ============================================================================
  // Test 1: Intervalos por Kilometraje
  // ============================================================================
  it('1. Cálculo determinista por kilometraje: detecta proximidad y vencimiento por kilometraje', () => {
    const fixedNow = new Date('2026-06-01T12:00:00Z');

    // Case A: 1,000 km remaining -> UPCOMING_SOON
    const resultUpcoming = engine.calculate({
      vehicle: {
        id: 'v-1',
        make: 'Toyota',
        model: 'Corolla',
        year: 2022,
        currentMileage: 19200,
      },
      rule: standardOilRule,
      previousServices: [
        {
          serviceDate: new Date('2026-01-15T10:00:00Z'),
          recordedMileage: 10000,
          category: ServiceCategory.OIL_AND_FILTER,
        },
      ],
      currentDate: fixedNow,
    });

    assert.equal(resultUpcoming.nextDueMileage, 20000);
    assert.equal(resultUpcoming.remainingKm, 800);
    assert.equal(resultUpcoming.status, MaintenanceStatus.UPCOMING_SOON);

    // Case B: Overdue by mileage (21,500 km > 20,000 km)
    const resultOverdue = engine.calculate({
      vehicle: {
        id: 'v-1',
        make: 'Toyota',
        model: 'Corolla',
        year: 2022,
        currentMileage: 21500,
      },
      rule: standardOilRule,
      previousServices: [
        {
          serviceDate: new Date('2026-01-15T10:00:00Z'),
          recordedMileage: 10000,
          category: ServiceCategory.OIL_AND_FILTER,
        },
      ],
      currentDate: fixedNow,
    });

    assert.equal(resultOverdue.status, MaintenanceStatus.OVERDUE);
    assert.equal(resultOverdue.dueReason, DueReason.DUE_BY_MILEAGE);
    assert.equal(resultOverdue.remainingKm, -1500);
  });

  // ============================================================================
  // Test 2: Intervalos por Fecha / Tiempo Calendario
  // ============================================================================
  it('2. Cálculo determinista por tiempo: detecta vencimiento cuando pasaron los meses del intervalo', () => {
    const serviceDate = new Date('2025-01-01T10:00:00Z');
    const today = new Date('2026-02-15T10:00:00Z'); // 13.5 months later (> 12 months!)

    const result = engine.calculate({
      vehicle: {
        id: 'v-2',
        make: 'Toyota',
        model: 'Yaris',
        year: 2022,
        currentMileage: 12000, // Only 2,000 km driven, but 13+ months elapsed!
      },
      rule: standardOilRule,
      previousServices: [
        {
          serviceDate,
          recordedMileage: 10000,
          category: ServiceCategory.OIL_AND_FILTER,
        },
      ],
      currentDate: today,
    });

    assert.equal(result.status, MaintenanceStatus.OVERDUE);
    assert.equal(result.dueReason, DueReason.DUE_BY_TIME);
    assert.equal(result.remainingKm, 8000); // Kilometers still ok, but time expired!
  });

  // ============================================================================
  // Test 3: Vencimientos Combinados (Kilometraje y Tiempo)
  // ============================================================================
  it('3. Vencimiento combinado: identifica cuando ambos límites (km y tiempo) fueron superados', () => {
    const serviceDate = new Date('2024-01-01T10:00:00Z');
    const today = new Date('2026-06-01T10:00:00Z'); // Over 2 years later!

    const result = engine.calculate({
      vehicle: {
        id: 'v-3',
        make: 'Toyota',
        model: 'Etios',
        year: 2021,
        currentMileage: 25000, // 15,000 km driven (> 10,000 km interval)
      },
      rule: standardOilRule,
      previousServices: [
        {
          serviceDate,
          recordedMileage: 10000,
          category: ServiceCategory.OIL_AND_FILTER,
        },
      ],
      currentDate: today,
    });

    assert.equal(result.status, MaintenanceStatus.OVERDUE);
    assert.equal(result.dueReason, DueReason.DUE_BY_BOTH);
  });

  // ============================================================================
  // Test 4: Historial Incompleto o Vehículo sin Regla -> INSUFFICIENT_DATA
  // ============================================================================
  it('4. Vehículo sin regla de intervalo devuelve INSUFFICIENT_DATA en lugar de certeza falsa', () => {
    const useCase = new CalculatePreventiveDueUseCase(engine);

    const result = useCase.execute({
      vehicle: {
        id: 'v-unknown',
        make: 'ProtoCar',
        model: 'Experimental',
        year: 2025,
        currentMileage: 5000,
      },
      rules: [], // No documented intervals!
    });

    assert.equal(result.isSuccess, true);
    const calculations = result.getValue();
    assert.equal(calculations.length, 1);
    assert.equal(calculations[0]!.status, MaintenanceStatus.INSUFFICIENT_DATA);
    assert.equal(calculations[0]!.confidence, EstimationConfidence.NONE);
    assert.match(calculations[0]!.warning ?? '', /No documented service interval rule found/i);
  });

  // ============================================================================
  // Test 5: Odómetros Inconsistentes / Rollback Check
  // ============================================================================
  it('5. Detecta inconsistencias en odómetro (kilometraje actual menor al último servicio registrado)', () => {
    const result = engine.calculate({
      vehicle: {
        id: 'v-rollback',
        make: 'Volkswagen',
        model: 'Vento',
        year: 2018,
        currentMileage: 45000, // Tampered!
      },
      rule: standardOilRule,
      previousServices: [
        {
          serviceDate: new Date('2025-05-10T10:00:00Z'),
          recordedMileage: 70000, // 70k > 45k!
          category: ServiceCategory.OIL_AND_FILTER,
        },
      ],
    });

    assert.equal(result.status, MaintenanceStatus.INSUFFICIENT_DATA);
    assert.match(result.warning ?? '', /Odometer inconsistency detected/i);
  });

  // ============================================================================
  // Test 6: Transcripción de Notas de Voz y Extracción Estructurada con Revisión Humana
  // ============================================================================
  it('6. Notas de voz: IA extrae propuesta estructurada y obliga confirmación humana (requiresConfirmation: true)', async () => {
    const useCase = new ProcessVoiceNoteUseCase(mockTranscription, mockAi);

    const fakeAudio = Buffer.from('RIFF....WAVEfmt....data');

    const result = await useCase.execute({
      audioBuffer: fakeAudio,
      mimeType: 'audio/wav',
      workshopId: 'workshop-123',
      mechanicId: 'mech-1',
      vehicleId: 'veh-1',
    });

    assert.equal(result.isSuccess, true);
    const data = result.getValue();

    assert.equal(data.requiresMechanicReview, true);
    assert.equal(data.proposal.requiresConfirmation, true); // Strict human-in-the-loop guarantee!
    assert.equal(data.proposal.odometerKm, 112000);
    assert.deepEqual(data.proposal.workPerformed, ['oil_change', 'oil_filter_replacement']);
    assert.equal(data.proposal.suggestedNextServiceKm, 122000);
    assert.ok(data.safetyNotice);
  });

  // ============================================================================
  // Test 7: Respuestas Malformadas de IA (Recuperación y Fallback Seguro)
  // ============================================================================
  it('7. Respuestas malformadas de IA: extractor rechaza schema inválido y no rompe el flujo', async () => {
    mockAi.setSimulateMalformed(true); // Emits broken JSON
    const useCase = new ProcessVoiceNoteUseCase(mockTranscription, mockAi);

    const result = await useCase.execute({
      audioBuffer: Buffer.from('RIFF....WAVE'),
      mimeType: 'audio/wav',
      workshopId: 'workshop-123',
      mechanicId: 'mech-1',
      vehicleId: 'veh-1',
    });

    assert.equal(result.isFailure, true);
    assert.match(result.getError(), /schema validation failed/i);
  });

  // ============================================================================
  // Test 8: Timeouts de Proveedores y Fallback Determinista en Explicación
  // ============================================================================
  it('8. Timeout de proveedor de IA: el caso de uso realiza fallback determinista seguro sin colapsar', async () => {
    mockAi.setSimulateTimeout(true); // Simulates network hang

    const explainUseCase = new ExplainMaintenanceUseCase(mockAi);

    const calcResult = engine.calculate({
      vehicle: { id: 'v-1', make: 'Ford', model: 'Focus', year: 2020, currentMileage: 58500 },
      rule: timingBeltRule,
      previousServices: [],
    });

    const explanationResult = await explainUseCase.execute({
      vehicleSummary: 'Ford Focus 2020 (58,500 km)',
      deterministicCalculation: calcResult,
    });

    // Does not fail! Returns safe deterministic fallback text
    assert.equal(explanationResult.isSuccess, true);
    const output = explanationResult.getValue();
    assert.equal(output.nextDueMileage, 60000);
    assert.equal(output.remainingKm, 1500);
    assert.equal(output.modelProvenance, 'deterministic-fallback-on-error');
  });

  // ============================================================================
  // Test 9: Errores en Transcripción de Audio
  // ============================================================================
  it('9. Error en motor de transcripción: payload vacío o fallo de audio devuelve error controlado', async () => {
    const useCase = new ProcessVoiceNoteUseCase(mockTranscription, mockAi);

    // Empty audio buffer
    const emptyResult = await useCase.execute({
      audioBuffer: Buffer.alloc(0),
      mimeType: 'audio/wav',
      workshopId: 'w-1',
      mechanicId: 'm-1',
      vehicleId: 'v-1',
    });
    assert.equal(emptyResult.isFailure, true);
    assert.match(emptyResult.getError(), /Audio buffer cannot be empty/i);

    // Simulated provider crash
    mockTranscription.setSimulateFailure(true);
    const crashResult = await useCase.execute({
      audioBuffer: Buffer.from('audio_bytes'),
      mimeType: 'audio/wav',
      workshopId: 'w-1',
      mechanicId: 'm-1',
      vehicleId: 'v-1',
    });
    assert.equal(crashResult.isFailure, true);
    assert.match(crashResult.getError(), /Voice transcription failed/i);
  });

  // ============================================================================
  // Test 10: Asistencia para Diagnóstico OBD2 con Descargo Obligatorio
  // ============================================================================
  it('10. Diagnóstico OBD2: interpreta códigos SAE con descargo de responsabilidad no vinculante', async () => {
    mockAi.setCustomCompletion((_prompt) =>
      JSON.stringify({
        codesAnalyzed: ['P0300', 'P0171'],
        systemicImpact:
          'Combination of lean fuel trim and random misfires indicates unmetered vacuum leak or low fuel pressure.',
        urgencyLevel: 'IMMEDIATE_ACTION',
        mechanicChecklist: [
          'Smoke test intake manifold for air leaks',
          'Measure fuel rail pressure',
          'Inspect spark plug tips for lean condition',
        ],
        disclaimer:
          'AI-assisted technical guidance. Physical diagnosis and verification by a certified technician is mandatory before component replacement.',
      })
    );

    const obd2UseCase = new InterpretObd2UseCase(mockAi);

    const result = await obd2UseCase.execute({
      dtcCodes: ['P0300', 'P0171'],
      vehicleMake: 'Chevrolet',
      vehicleModel: 'Cruze',
      vehicleYear: 2017,
    });

    assert.equal(result.isSuccess, true);
    const obd = result.getValue();
    assert.deepEqual(obd.codesAnalyzed, ['P0300', 'P0171']);
    assert.equal(obd.urgencyLevel, 'IMMEDIATE_ACTION');
    assert.ok(obd.mechanicChecklist.length >= 3);
    assert.match(obd.disclaimer, /certified technician is mandatory/i);
  });

  // ============================================================================
  // Test 11: Aislamiento de Presupuestos / Cuotas de IA entre Talleres
  // ============================================================================
  it('11. Aislamiento y control de cuotas de IA por taller: previene consumo desmedido', async () => {
    const openaiAdapter = new OpenAIAIAdapter({
      maxMonthlyBudgetPerWorkshop: 2, // Set budget to 2 requests
    });

    // Call 1 from Workshop Alpha -> Allowed
    await openaiAdapter.generateCompletion('Test prompt', { workshopId: 'workshop-alpha' });

    // Call 2 from Workshop Alpha -> Allowed
    await openaiAdapter.generateCompletion('Test prompt', { workshopId: 'workshop-alpha' });

    // Call 3 from Workshop Alpha -> Budget Exceeded!
    await assert.rejects(
      async () => await openaiAdapter.generateCompletion('Test prompt', { workshopId: 'workshop-alpha' }),
      /AI budget quota exceeded for workshop 'workshop-alpha'/i
    );

    // Call from Workshop Bravo is unaffected (Tenant Isolation)!
    const bravoResult = await openaiAdapter.generateCompletion('Test prompt', { workshopId: 'workshop-bravo' });
    assert.ok(bravoResult);
  });

  // ============================================================================
  // Test 12: Sanitización de Prompts y Minimización de Datos (PII Redaction)
  // ============================================================================
  it('12. Sanitización de prompts: elimina correos, teléfonos y tarjetas de crédito antes del envío', () => {
    const openaiAdapter = new OpenAIAIAdapter();

    const dirtyInput =
      'Mechanic Juan (email: juan@workshop.com, phone: +54 9 11 2345-6789, card: 4532 1234 5678 9010) reported 100k service.';

    const sanitized = openaiAdapter.sanitizePrompt(dirtyInput);

    assert.ok(!sanitized.includes('juan@workshop.com'));
    assert.ok(!sanitized.includes('2345-6789'));
    assert.ok(!sanitized.includes('4532 1234'));
    assert.ok(sanitized.includes('[EMAIL_REDACTED]'));
    assert.ok(sanitized.includes('[PHONE_REDACTED]'));
    assert.ok(sanitized.includes('[CREDIT_CARD_REDACTED]'));
  });
});
