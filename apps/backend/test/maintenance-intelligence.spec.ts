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
import { SummarizeHistoryUseCase } from '../src/modules/maintenance-intelligence/application/summarize-history.usecase.ts';
import { ExplainMaintenanceUseCase } from '../src/modules/maintenance-intelligence/application/explain-maintenance.usecase.ts';
import { InterpretObd2UseCase } from '../src/modules/maintenance-intelligence/application/interpret-obd2.usecase.ts';
import { MockAIProvider } from '../src/modules/maintenance-intelligence/adapters/mock-ai.adapter.ts';
import { OpenAIAIAdapter } from '../src/modules/maintenance-intelligence/adapters/openai-ai.adapter.ts';

describe('Maintenance Intelligence Engine Test Suite', () => {
  let engine: DeterministicMaintenanceEngine;
  let mockAi: MockAIProvider;

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
  // Test 6: Resumen Inteligente del Historial Vehicular con IA
  // ============================================================================
  it('6. Resumen de historial: IA extrae resumen estructurado validado con Zod', async () => {
    mockAi.setCustomCompletion((_prompt) =>
      JSON.stringify({
        vehicleId: 'v-100',
        totalRecordsAnalyzed: 3,
        mainInterventions: ['Cambio de kit de distribución', 'Service de aceite y filtros', 'Reemplazo de pastillas delanteras'],
        recentServices: [
          { date: '2026-03-10', title: 'Service 60.000 km', mileage: 60200, isCertified: true },
          { date: '2025-03-01', title: 'Cambio de Aceite 50k', mileage: 50100, isCertified: true },
        ],
        recurringRepairs: ['Reemplazo de pastillas delanteras (2 registros registrados)'],
        relevantObservations: ['Sin pérdidas de fluido detectadas. Neumáticos en buen estado.'],
        dataLimitations: ['Falta comprobante fiscal de primera intervención.'],
        referencedRecordIds: ['rec-1', 'rec-2', 'rec-3'],
        generatedAt: '2026-10-30T12:00:00.000Z',
        isAiGenerated: true,
        providerName: 'OpenAIAdapter',
      })
    );

    const useCase = new SummarizeHistoryUseCase(mockAi);

    const result = await useCase.execute({
      vehicleId: 'v-100',
      vehicleMake: 'Renault',
      vehicleModel: 'Logan',
      vehicleYear: 2020,
      currentMileageKm: 65000,
      records: [
        {
          id: 'rec-1',
          serviceDate: new Date('2026-03-10'),
          mileage: 60200,
          title: 'Service 60.000 km',
          performedInterventions: ['Cambio de kit de distribución', 'Aceite 5W40'],
          isVerified: true,
        },
        {
          id: 'rec-2',
          serviceDate: new Date('2025-03-01'),
          mileage: 50100,
          title: 'Cambio de Aceite 50k',
          performedInterventions: ['Aceite 5W40', 'Filtro de aire'],
          isVerified: true,
        },
        {
          id: 'rec-3',
          serviceDate: new Date('2024-02-15'),
          mileage: 40000,
          title: 'Frenos delanteros',
          performedInterventions: ['Reemplazo de pastillas delanteras'],
          isVerified: false,
        },
      ],
    });

    assert.equal(result.isSuccess, true);
    const summary = result.getValue();
    assert.equal(summary.vehicleId, 'v-100');
    assert.equal(summary.totalRecordsAnalyzed, 3);
    assert.ok(summary.mainInterventions.includes('Cambio de kit de distribución'));
    assert.equal(summary.recentServices.length, 2);
    assert.equal(summary.isAiGenerated, true);
    assert.deepEqual(summary.referencedRecordIds, ['rec-1', 'rec-2', 'rec-3']);
  });

  // ============================================================================
  // Test 7: Resumen de Historial con Fallback Determinista Seguro
  // ============================================================================
  it('7. Resumen de historial: genera resumen determinista seguro cuando la IA está deshabilitada', async () => {
    mockAi.setConfigured(false); // Provider disabled

    const useCase = new SummarizeHistoryUseCase(mockAi);

    const result = await useCase.execute({
      vehicleId: 'v-200',
      vehicleMake: 'Renault',
      vehicleModel: 'Logan',
      vehicleYear: 2020,
      currentMileageKm: 85000,
      records: [
        {
          id: 'rec-a',
          serviceDate: new Date('2026-05-01'),
          mileage: 80000,
          title: 'Cambio de Aceite y Filtro',
          performedInterventions: ['Aceite 5W40', 'Filtro de Aceite'],
          isVerified: true,
          observations: 'Nivel correcto, sin fugas.',
        },
        {
          id: 'rec-b',
          serviceDate: new Date('2025-05-01'),
          mileage: 70000,
          title: 'Cambio de Aceite y Filtro',
          performedInterventions: ['Aceite 5W40', 'Filtro de Aceite'],
          isVerified: false,
        },
      ],
    });

    assert.equal(result.isSuccess, true);
    const summary = result.getValue();
    assert.equal(summary.vehicleId, 'v-200');
    assert.equal(summary.totalRecordsAnalyzed, 2);
    assert.equal(summary.isAiGenerated, false);
    assert.equal(summary.providerName, 'DeterministicRuleBasedEngine');
    assert.ok(summary.recurringRepairs.some((r) => r.includes('Cambio de Aceite y Filtro')));
    assert.ok(summary.dataLimitations.some((l) => l.includes('no poseen certificación')));
  });

  // ============================================================================
  // Test 8: Explicación de Mantenimiento sin Modificar Intervalos ni Números
  // ============================================================================
  it('8. Explicación de mantenimiento: explica cálculo determinista sin alterar kilometrajes ni fechas', async () => {
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

    assert.equal(explanationResult.isSuccess, true);
    const output = explanationResult.getValue();
    assert.equal(output.category, ServiceCategory.TIMING_BELT);
    assert.equal(output.nextDueMileage, 60000);
    assert.equal(output.remainingKm, 1500);
    assert.equal(output.status, MaintenanceStatus.OVERDUE);
    assert.ok(output.disclaimer.includes('inspección física'));
  });

  // ============================================================================
  // Test 9: OpenAIAIAdapter no simula IA si falta API Key y respeta timeout
  // ============================================================================
  it('9. OpenAIAIAdapter: no simula respuestas sin API key (isConfigured === false) y rechaza ejecución', async () => {
    const unconfiguredAdapter = new OpenAIAIAdapter({ apiKey: undefined });

    assert.equal(unconfiguredAdapter.isConfigured(), false);
    await assert.rejects(
      async () => await unconfiguredAdapter.generateCompletion('test prompt'),
      /AI Provider is unconfigured/i
    );
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
    const originalFetch = globalThis.fetch;
    // Mock fetch to simulate successful OpenAI responses
    globalThis.fetch = (async () => {
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Simulated response' } }],
        }),
      } as any;
    }) as any;

    try {
      const openaiAdapter = new OpenAIAIAdapter({
        apiKey: 'sk-valid-test-key-for-unit-test-quota',
        maxMonthlyBudgetPerWorkshop: 2,
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
    } finally {
      globalThis.fetch = originalFetch;
    }
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
