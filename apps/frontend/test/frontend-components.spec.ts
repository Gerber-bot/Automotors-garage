import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';

import {
  QuickServiceEntrySchema,
  ObdAiAnalysisSchema,
  CreateVehicleDtoSchema,
} from '../src/api/contracts.ts';
import { ApiClient } from '../src/api/client.ts';

describe('Frontend Architecture & Components Test Suite', () => {
  // ============================================================================
  // Test 1: Contratos Zod para Quick Service Entry (<60s)
  // ============================================================================
  it('1. Validador Zod de Quick Service Entry exige confirmación humana obligatoria', () => {
    // Valid entry with human confirmation
    const validEntry = {
      searchQuery: 'AF123CD',
      selectedVehicleId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      odometerKm: 35000,
      selectedInterventions: ['oil_change', 'brake_pads'],
      requiresConfirmation: true,
      humanConfirmed: true,
    };

    const parsed = QuickServiceEntrySchema.safeParse(validEntry);
    assert.equal(parsed.success, true);

    // Invalid entry: without technician explicit confirmation -> Must FAIL!
    const unconfirmedEntry = {
      searchQuery: 'AF123CD',
      selectedVehicleId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      odometerKm: 35000,
      selectedInterventions: ['oil_change'],
      requiresConfirmation: true,
      humanConfirmed: false, // Not confirmed!
    };

    const failedParse = QuickServiceEntrySchema.safeParse(unconfirmedEntry);
    assert.equal(failedParse.success, false);
    assert.match(
      failedParse.error?.issues[0]?.message ?? '',
      /Technician must review and confirm details/i
    );
  });

  // ============================================================================
  // Test 2: Validación de esquemas de análisis asistido de OBD-II
  // ============================================================================
  it('2. Esquema de diagnóstico OBD-II valida estructura técnica y descargo obligatorio', () => {
    const validAnalysis = {
      codesAnalyzed: ['P0300'],
      systemicImpact: 'Multiple cylinder misfire detected.',
      urgencyLevel: 'IMMEDIATE_ACTION',
      mechanicChecklist: ['Check coils', 'Check plugs'],
      disclaimer: 'Orientación técnica obligatoria.',
    };

    assert.equal(ObdAiAnalysisSchema.safeParse(validAnalysis).success, true);

    const invalidAnalysis = {
      codesAnalyzed: 'not-an-array',
      urgencyLevel: 'INVALID_LEVEL',
    };

    assert.equal(ObdAiAnalysisSchema.safeParse(invalidAnalysis).success, false);
  });

  // ============================================================================
  // Test 3: Centralized ApiClient y Aislamiento de Mocks
  // ============================================================================
  it('3. ApiClient centralizado busca vehículos y opera con mocks identificados en modo offline', async () => {
    const client = new ApiClient();
    client.setOfflineMockMode(true);

    // 1. Search by Plate AF123CD
    const searchResults = await client.getVehicles('AF123CD');
    assert.equal(searchResults.length, 1);
    assert.equal(searchResults[0]!.make, 'Toyota');
    assert.equal(searchResults[0]!.model, 'Corolla Hybrid');

    // 2. Search by Make 'Ford'
    const fordResults = await client.getVehicles('Ford');
    assert.equal(fordResults.length, 1);
    assert.equal(fordResults[0]!.model, 'Ranger 4x4');

    // 3. Work Orders query
    const orders = await client.getWorkOrders();
    assert.ok(orders.length >= 2);
  });

  // ============================================================================
  // Test 4: Manejo de Expiración de Sesión en ApiClient
  // ============================================================================
  it('4. ApiClient detecta expiración de sesión y gatilla callback onUnauthorized', async () => {
    let unauthorizedTriggered = false;

    // Custom fetch simulator returning 401
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ detail: 'Token expired' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });

    try {
      const client = new ApiClient({
        baseUrl: 'http://api.fake.com',
        onUnauthorized: () => {
          unauthorizedTriggered = true;
        },
      });

      await assert.rejects(async () => await client.getVehicles());
      assert.equal(unauthorizedTriggered, true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // ============================================================================
  // Test 5: Validación de Creación de Vehículos en Frontend
  // ============================================================================
  it('5. Validador de creación de vehículos exige año razonable y kilometraje no negativo', () => {
    const valid = CreateVehicleDtoSchema.safeParse({
      make: 'Peugeot',
      model: '208',
      year: 2022,
      currentMileage: 25000,
    });
    assert.equal(valid.success, true);

    const negativeMileage = CreateVehicleDtoSchema.safeParse({
      make: 'Peugeot',
      model: '208',
      year: 2022,
      currentMileage: -50,
    });
    assert.equal(negativeMileage.success, false);
  });
});
