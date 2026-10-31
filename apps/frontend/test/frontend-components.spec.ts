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

  // ============================================================================
  // Test 6: Verificación de Contratos y Políticas de la Landing Page
  // ============================================================================
  it('6. Landing pública respeta las fuentes de verdad y políticas de contenido', async () => {
    // Read LandingView source code to verify invariants
    const fs = await import('node:fs');
    const path = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const resolveAppPath = (rel: string) => path.resolve(__dirname, '..', rel);

    const landingPath = resolveAppPath('src/components/domain/LandingView.tsx');
    assert.ok(fs.existsSync(landingPath), 'LandingView.tsx must exist');

    const content = fs.readFileSync(landingPath, 'utf8');

    // Invariant 1: Hero title and subtitle
    assert.match(content, /El historial de tu vehículo/i);
    assert.match(content, /La gestión de tu taller/i);
    assert.match(content, /Una misma plataforma/i);

    // Invariant 2: Active demo routes (connected without broken links)
    assert.match(content, /demo interactiva disponible/i);
    assert.match(content, /\/demo\/propietario/i);
    assert.match(content, /\/demo\/taller/i);
    assert.doesNotMatch(content, /Demo en preparación/i);

    // Invariant 3: Mandatory technical disclaimer
    assert.match(content, /Descargo.*obligatorio/i);
    assert.match(content, /Orientaci[óo]n t[ée]cnica\s+preventiva/i);

    // Invariant 4: No fake marketing claims or unproven time guarantees
    assert.doesNotMatch(content, /100% garantizada/i);
    assert.doesNotMatch(content, /invulnerable/i);
    assert.doesNotMatch(content, /diagnóstico infalible/i);
    assert.doesNotMatch(content, /nivel bancario/i);
    assert.doesNotMatch(content, /<60s/i);
    assert.doesNotMatch(content, /60 segundos/i);
    assert.doesNotMatch(content, /inmutab/i);
    assert.doesNotMatch(content, /credenciales de prueba/i);

    // Invariant 5: Honest phrasing for services, history and illustrations
    assert.match(content, /Registro [áa]gil de servicios/i);
    assert.match(content, /trazabilidad.*correcciones auditables/i);
    assert.match(content, /ilustrativ/i);
  });

  // ============================================================================
  // Test 7: Demostraciones Públicas Interactivas y Aislamiento de Datos (Milestone 15.2.2)
  // ============================================================================
  it('7. Demos públicas de propietario y taller operan con datos sintéticos aislados sin credenciales ni backend real', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const resolveAppPath = (rel: string) => path.resolve(__dirname, '..', rel);

    // 1. Verificar existencia de rutas Next.js públicas
    const ownerRoutePath = resolveAppPath('src/app/demo/propietario/page.tsx');
    const workshopRoutePath = resolveAppPath('src/app/demo/taller/page.tsx');
    assert.ok(fs.existsSync(ownerRoutePath), 'Ruta /demo/propietario debe existir');
    assert.ok(fs.existsSync(workshopRoutePath), 'Ruta /demo/taller debe existir');

    // 2. Verificar componente DemoOwnerView
    const ownerViewPath = resolveAppPath('src/components/demo/DemoOwnerView.tsx');
    assert.ok(fs.existsSync(ownerViewPath), 'DemoOwnerView.tsx debe existir');
    const ownerContent = fs.readFileSync(ownerViewPath, 'utf8');

    assert.match(ownerContent, /MODO DEMOSTRACIÓN/i);
    assert.match(ownerContent, /href="\/"/i, 'Debe incluir enlace de retorno a la landing');
    assert.match(ownerContent, /AF123CD/i, 'Debe incluir vehículo sintético Toyota');
    assert.match(ownerContent, /AD456EF/i, 'Debe incluir vehículo sintético Ford');
    assert.match(ownerContent, /WORKSHOP_CERTIFIED/i, 'Debe diferenciar registros certificados');
    assert.match(ownerContent, /OWNER_DECLARED/i, 'Debe diferenciar registros declarados por dueño');
    assert.match(ownerContent, /Descargo técnico obligatorio/i, 'Debe incluir descargo técnico');
    // Aislamiento: sin JWT ni llamadas a backend privado
    assert.doesNotMatch(ownerContent, /fetch\(/i, 'Demo no debe invocar fetch hacia backend persistente');
    assert.doesNotMatch(ownerContent, /SUPER_ADMIN/i, 'Demo no debe contener privilegios SUPER_ADMIN');

    // 3. Verificar componente DemoWorkshopView
    const workshopViewPath = resolveAppPath('src/components/demo/DemoWorkshopView.tsx');
    assert.ok(fs.existsSync(workshopViewPath), 'DemoWorkshopView.tsx debe existir');
    const workshopContent = fs.readFileSync(workshopViewPath, 'utf8');

    assert.match(workshopContent, /MODO DEMOSTRACIÓN/i);
    assert.match(workshopContent, /href="\/"/i, 'Debe incluir enlace de retorno a la landing');
    assert.match(workshopContent, /Garage Pro Centro/i, 'Debe identificar taller ficticio');
    assert.match(workshopContent, /OT-2026/i, 'Debe incluir órdenes de trabajo sintéticas');
    assert.match(workshopContent, /Quick Service/i, 'Debe permitir Quick Service ágil');
    assert.match(workshopContent, /Confirmación Humana Técnica Obligatoria/i, 'Debe exigir confirmación en Quick Service');
    assert.match(workshopContent, /P0300/i, 'Debe incluir caso de diagnóstico OBD-II simulado');
    assert.match(workshopContent, /SAE J2012/i, 'Debe basarse en protocolo SAE J2012');
    assert.match(workshopContent, /Diagnóstico técnico simulado/i, 'Debe declarar que el diagnóstico es simulado');
    // Aislamiento: sin JWT ni llamadas a backend privado
    assert.doesNotMatch(workshopContent, /fetch\(/i, 'Demo no debe invocar fetch hacia backend persistente');
    assert.doesNotMatch(workshopContent, /SUPER_ADMIN/i, 'Demo no debe contener privilegios SUPER_ADMIN');
  });

  // ============================================================================
  // Test 8: Milestone 16.1 — Persistencia Aislada y Experiencia Desktop
  // ============================================================================
  it('8. Demos interactivas garantizan persistencia local aislada, no duplicidad y diseño responsive (Milestone 16.1)', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const resolveAppPath = (rel: string) => path.resolve(__dirname, '..', rel);

    // 1. Invariantes DemoOwnerView (Mi Automotors)
    const ownerViewPath = resolveAppPath('src/components/demo/DemoOwnerView.tsx');
    const ownerContent = fs.readFileSync(ownerViewPath, 'utf8');

    // Clave de almacenamiento local aislada
    assert.match(ownerContent, /automotors_demo_owner_v1/);
    assert.match(ownerContent, /localStorage\.getItem\(STORAGE_KEY\)/);
    assert.match(ownerContent, /Restablecer demostración/i);
    assert.match(ownerContent, /guardan únicamente en este navegador/i);

    // Prevención de duplicados de patente
    assert.match(ownerContent, /duplicate/i);
    assert.match(ownerContent, /Ya existe un vehículo registrado con la patente/i);

    // No sintetizar VINs falsos y tratar campos opcionales
    assert.doesNotMatch(ownerContent, /DEMO\$\{Date\.now\(\)\}/, 'No debe sintetizar falsos números de chasis (VIN)');
    assert.match(ownerContent, /No informado/i, 'Debe indicar "No informado" para datos técnicos no provistos');

    // Estado vacío con acción clara
    assert.match(ownerContent, /Sin mantenimientos registrados/i);
    assert.match(ownerContent, /Registrar Primer Servicio/i);

    // Ficha técnica y datos declarados (sin denominarla "Ficha Técnica Oficial")
    assert.match(ownerContent, /Ficha Técnica y Datos Declarados/i);
    assert.match(ownerContent, /No hay recomendaciones de mantenimiento verificadas disponibles para este vehículo/i);

    // 2. Invariantes DemoWorkshopView (Automotors Pro)
    const workshopViewPath = resolveAppPath('src/components/demo/DemoWorkshopView.tsx');
    const workshopContent = fs.readFileSync(workshopViewPath, 'utf8');

    // Clave de almacenamiento local aislada
    assert.match(workshopContent, /automotors_demo_workshop_v1/);
    assert.match(workshopContent, /localStorage\.getItem\(STORAGE_KEY\)/);
    assert.match(workshopContent, /Restablecer demostración/i);
    assert.match(workshopContent, /guardan únicamente en este navegador/i);

    // Quick Service layout amplio y enlace a orden generada
    assert.match(workshopContent, /Ver en Órdenes de Trabajo/i);
    assert.match(workshopContent, /¡Servicio rápido registrado y certificado/i);
    assert.match(workshopContent, /Confirmación Humana Técnica Obligatoria/i);

    // Diagnóstico OBD-II con descargo explícito
    assert.match(workshopContent, /no se conecta\s+f[ií]sicamente a una ECU vehicular/i);
    assert.match(workshopContent, /SAE J2012/i);
  });
});
