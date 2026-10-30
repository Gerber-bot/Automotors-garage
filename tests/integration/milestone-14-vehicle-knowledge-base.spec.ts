import { describe, it, before, after } from 'node:test';
import * as assert from 'node:assert/strict';
import * as http from 'node:http';
import * as fs from 'node:fs';
import * as path from 'node:path';

import {
  DatabaseFactory,
  DatabaseMigrator,
  PostgresKnowledgeBaseRepository,
  PostgresSessionRepository,
} from '@automotors/database';
import { HttpApp } from '../../apps/backend/src/infrastructure/http/http-app.ts';
import { DemoSeeder, DEMO_IDS } from '../../apps/backend/src/infrastructure/database/demo-seed.ts';
import { ApiClient } from '../../apps/frontend/src/api/client.ts';
import { TokenService } from '../../packages/security-foundation/src/services/token.service.ts';
import {
  DeterministicMaintenanceEngine,
  MaintenanceStatus,
  DueReason,
} from '../../apps/backend/src/modules/maintenance-intelligence/domain/deterministic-engine.ts';
import {
  TechnicalIdentificationEngine,
  TechnicalMatchStatus,
} from '../../apps/backend/src/modules/maintenance-intelligence/domain/technical-identification-engine.ts';

describe('Milestone 14.1: Automotors Vehicle Knowledge Base Specification & Test Suite', () => {
  let db: any;
  let app: HttpApp;
  let server: http.Server;
  let baseUrl: string;
  let testDataDir: string;
  let kbRepo: PostgresKnowledgeBaseRepository;
  let techEngine: TechnicalIdentificationEngine;

  let ownerAClient: ApiClient;
  let ownerBClient: ApiClient;
  let workshopClient: ApiClient;
  let superAdminClient: ApiClient;
  let ownerLoganId: string;

  before(async () => {
    testDataDir = path.join(process.cwd(), '.data', `test_m14_kb_${Date.now()}`);
    if (fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true, force: true });
    }

    db = await DatabaseFactory.createInMemoryTestDb(testDataDir);
    await DatabaseMigrator.runMigrations(db);

    const seeder = new DemoSeeder(db);
    await seeder.seed();

    kbRepo = new PostgresKnowledgeBaseRepository(db);
    techEngine = new TechnicalIdentificationEngine(kbRepo);

    app = new HttpApp({ db });
    server = app.createServer();
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const address = server.address();
        if (address && typeof address === 'object') {
          baseUrl = `http://127.0.0.1:${address.port}`;
        }
        resolve();
      });
    });

    ownerAClient = new ApiClient({ baseUrl: `${baseUrl}/api/v1` });
    ownerBClient = new ApiClient({ baseUrl: `${baseUrl}/api/v1` });
    workshopClient = new ApiClient({ baseUrl: `${baseUrl}/api/v1` });

    // Login Valeria (Owner A)
    const loginA = await ownerAClient.login('valeria@miautomotors.com', 'Password123!');
    ownerAClient.setAuthSession(loginA.token, null);

    // Register & Login Owner B
    const regB = await ownerBClient.registerOwner({
      email: 'm14.owner.b@example.com',
      password: 'Password123!',
      fullName: 'Martín Propietario',
    });
    ownerBClient.setAuthSession(regB.token, null);

    // Login Workshop Mario
    const loginW = await workshopClient.login('mario@alphamotors.com', 'Password123!');
    workshopClient.setAuthSession(loginW.token, DEMO_IDS.WORKSHOP_ALPHA);

    // Global Super Admin client
    const sessionRepo = new PostgresSessionRepository(db);
    const superAdminSessionId = '00000000-0000-4000-8000-000000000099';
    await sessionRepo.save({
      id: superAdminSessionId,
      userId: DEMO_IDS.USER_MARIO,
      activeTenantId: null,
      expiresAt: new Date(Date.now() + 86400000),
      isRevoked: false,
      createdAt: new Date(),
    });
    const tokenService = new TokenService(process.env.JWT_SECRET || 'production-grade-super-secret-key-automotors-32-chars');
    const superAdminToken = tokenService.generateAccessToken({
      sub: DEMO_IDS.USER_MARIO,
      email: 'superadmin@automotors.com',
      tenantId: null,
      role: 'SUPER_ADMIN',
      permissions: ['*'],
      sessionId: superAdminSessionId,
    });
    superAdminClient = new ApiClient({ baseUrl: `${baseUrl}/api/v1` });
    superAdminClient.setAuthSession(superAdminToken, null);

    ownerLoganId = DEMO_IDS.VEHICLE_RENAULT_LOGAN_OWNER;
  });

  after(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    if (fs.existsSync(testDataDir)) {
      try {
        fs.rmSync(testDataDir, { recursive: true, force: true });
      } catch {
        // Ignored on Windows file locks
      }
    }
  });

  // ============================================================================
  // Test 1: Creación de fabricantes
  // ============================================================================
  it('1. Creación de fabricantes: almacena marcas homologadas con estado activo y unicidad', async () => {
    const mfg = await kbRepo.saveManufacturer({
      name: 'Fiat',
      country: 'Italia / Mercosur',
      status: 'ACTIVE',
    });
    assert.ok(mfg.id);
    assert.equal(mfg.name, 'Fiat');

    // Idempotent / Upsert on unique name
    const mfgAgain = await kbRepo.saveManufacturer({
      name: 'Fiat',
      country: 'Italia / Betim',
      status: 'ACTIVE',
    });
    assert.equal(mfgAgain.id, mfg.id);
    assert.equal(mfgAgain.country, 'Italia / Betim');

    const all = await kbRepo.listManufacturers();
    assert.ok(all.some((m) => m.name === 'Fiat'));
    assert.ok(all.some((m) => m.name === 'Renault'));
  });

  // ============================================================================
  // Test 2: Creación de modelos
  // ============================================================================
  it('2. Creación de modelos: asocia modelos a sus fabricantes correspondientes', async () => {
    const fiat = await kbRepo.findManufacturerByName('Fiat');
    assert.ok(fiat);

    const cronos = await kbRepo.saveModel({
      manufacturerId: fiat.id,
      name: 'Cronos',
      status: 'ACTIVE',
    });
    assert.ok(cronos.id);
    assert.equal(cronos.name, 'Cronos');

    const models = await kbRepo.listModels(fiat.id);
    assert.equal(models.length, 1);
    assert.equal(models[0]!.name, 'Cronos');
  });

  // ============================================================================
  // Test 3: Asociación de motores (Powertrains)
  // ============================================================================
  it('3. Asociación de motores: registra características mecánicas (cilindrada, combustible, distribución)', async () => {
    const renault = await kbRepo.findManufacturerByName('Renault');
    assert.ok(renault);

    const h4m = await kbRepo.findPowertrainByCode(renault.id, 'H4M');
    assert.ok(h4m);
    assert.equal(h4m.timingMechanism, 'CADENA');
    assert.equal(h4m.displacementCc, 1598);
    assert.equal(h4m.valves, 16);

    const k7m = await kbRepo.findPowertrainByCode(renault.id, 'K7M');
    assert.ok(k7m);
    assert.equal(k7m.timingMechanism, 'CORREA');
    assert.equal(k7m.valves, 8);
  });

  // ============================================================================
  // Test 4: Asociación de generaciones
  // ============================================================================
  it('4. Asociación de generaciones: delimita ventanas temporales de fabricación por mercado', async () => {
    const renault = await kbRepo.findManufacturerByName('Renault');
    const logan = await kbRepo.findModel(renault!.id, 'Logan');
    assert.ok(logan);

    const gens = await kbRepo.listGenerations(logan.id);
    assert.ok(gens.length >= 1);
    const gen2 = gens.find((g) => g.generationName === 'Logan II Phase 2');
    assert.ok(gen2);
    assert.equal(gen2.startYear, 2019);
    assert.equal(gen2.endYear, 2024);
    assert.equal(gen2.market, 'AR');
  });

  // ============================================================================
  // Test 5: Registro de fuentes documentales y auditoría de fuentes pendientes
  // ============================================================================
  it('5. Registro de fuentes: mantiene Renault Logan 2020 en PENDING_VERIFICATION sin referencias inventadas y permite fixtures sintéticos explícitos', async () => {
    const renaultSource = await kbRepo.findDocumentSourceById(DEMO_IDS.KB_SRC_RENAULT);
    assert.ok(renaultSource);
    assert.equal(renaultSource.reviewStatus, 'PENDING_VERIFICATION');
    assert.equal(renaultSource.documentReference, null, 'No debe existir referencia inventada REF-REN-MAN-2020-L52');
    assert.equal(renaultSource.pageOrSection, null);

    const syntheticSource = await kbRepo.saveDocumentSource({
      docType: 'SYNTHETIC_TEST_FIXTURE',
      publisher: 'Automotors QA Test Suite (Fixture Sintético)',
      title: '[FIXTURE SINTÉTICO DE PRUEBA] Especificación Controlada para Test Automatizado',
      documentReference: 'SYNTHETIC-FIXTURE-M14-001',
      market: 'AR',
      versionOrDate: 'TEST-1.0',
      reviewStatus: 'VERIFIED',
    });
    assert.ok(syntheticSource.id);
    assert.equal(syntheticSource.reviewStatus, 'VERIFIED');
  });

  // ============================================================================
  // Test 6: Auditoría de reglas pendientes del Renault Logan 2020 y versionado en fixture sintético
  // ============================================================================
  it('6. Reglas Renault Logan 2020 en PENDING_VERIFICATION (excluidas de recomendaciones verificadas) y versionado sobre fixture sintético', async () => {
    // 1. All seeded Renault Logan 2020 rules and specs must be PENDING_VERIFICATION
    const allLoganRules = await kbRepo.listRulesByConfiguration(DEMO_IDS.KB_CFG_LOGAN_H4M, { onlyActive: true });
    assert.equal(allLoganRules.length, 6);
    for (const r of allLoganRules) {
      assert.equal(r.verificationStatus, 'PENDING_VERIFICATION', `Rule ${r.category} must be PENDING_VERIFICATION`);
      assert.equal(r.verifiedAt, null);
    }

    const k7mRules = await kbRepo.listRulesByConfiguration(DEMO_IDS.KB_CFG_LOGAN_K7M, { onlyActive: true });
    assert.equal(k7mRules.length, 1);
    assert.equal(k7mRules[0]!.verificationStatus, 'PENDING_VERIFICATION');

    const loganSpecs = await kbRepo.listTechnicalSpecs(DEMO_IDS.KB_CFG_LOGAN_H4M);
    assert.equal(loganSpecs.length, 6);
    for (const s of loganSpecs) {
      assert.equal(s.verificationStatus, 'PENDING_VERIFICATION', `Spec ${s.specKey} must be PENDING_VERIFICATION`);
    }

    // 2. Querying onlyVerified for Renault Logan 2020 must return 0 rules
    const verifiedLoganRules = await kbRepo.listRulesByConfiguration(DEMO_IDS.KB_CFG_LOGAN_H4M, {
      onlyActive: true,
      onlyVerified: true,
    });
    assert.equal(verifiedLoganRules.length, 0, 'Unverified Logan rules must be excluded from verified queries');

    // 3. Owner predictions for Renault Logan 2020 must exclude all PENDING_VERIFICATION rules (INSUFFICIENT_DATA)
    const loganPreds = await ownerAClient.getOwnerVehiclePredictions(ownerLoganId);
    for (const p of loganPreds.predictions) {
      assert.equal(
        p.status,
        'INSUFFICIENT_DATA',
        `Category ${p.category} on unverified Logan must return INSUFFICIENT_DATA`
      );
      assert.equal(p.nextDueMileage, null);
    }

    // 4. Test rule versioning on an isolated synthetic fixture rule
    const fiat = await kbRepo.findManufacturerByName('Fiat');
    const cronos = await kbRepo.findModel(fiat!.id, 'Cronos');
    // Every configuration belongs to a generation (kb_configurations.generation_id is NOT NULL).
    const syntheticGen = await kbRepo.saveGeneration({
      modelId: cronos!.id,
      generationName: '[FIXTURE SINTÉTICO] Cronos Test Generation',
      startYear: 2021,
      endYear: 2024,
      market: 'AR',
      verificationStatus: 'VERIFIED',
    });
    const syntheticCfg = await kbRepo.saveConfiguration({
      modelId: cronos!.id,
      generationId: syntheticGen.id,
      commercialName: '[FIXTURE SINTÉTICO] Fiat Cronos 1.3 Test Config',
      yearFrom: 2021,
      yearTo: 2024,
      market: 'AR',
      transmission: 'MANUAL',
      verificationStatus: 'VERIFIED',
    });

    const initialRule = await kbRepo.saveMaintenanceRule({
      configurationId: syntheticCfg.id,
      category: 'OIL_AND_FILTER',
      operation: 'REPLACE',
      title: '[FIXTURE SINTÉTICO] Cambio de Aceite de Prueba',
      intervalKm: 10000,
      intervalMonths: 12,
      severeIntervalKm: 7500,
      verificationStatus: 'VERIFIED',
    });
    assert.equal(initialRule.ruleVersion, 1);
    assert.equal(initialRule.isActive, true);

    const newRev = await kbRepo.createRuleRevision({
      ruleId: initialRule.id,
      changes: {
        severeIntervalKm: 6000,
        verificationNotes: '[FIXTURE SINTÉTICO] Ajuste de intervalo severo para prueba de trazabilidad.',
      },
      actorUserId: DEMO_IDS.USER_MARIO,
      autoVerify: true,
    });

    assert.equal(newRev.ruleVersion, 2);
    assert.equal(newRev.previousVersionId, initialRule.id);
    assert.equal(newRev.severeIntervalKm, 6000);
    assert.equal(newRev.isActive, true);
    assert.equal(newRev.verificationStatus, 'VERIFIED');

    // Previous version must be deprecated and inactive
    const oldRev = await kbRepo.findRuleById(initialRule.id);
    assert.equal(oldRev?.isActive, false);
    assert.equal(oldRev?.verificationStatus, 'DEPRECATED');
  });

  // ============================================================================
  // Test 7: Rechazo de reglas no verificadas
  // ============================================================================
  it('7. Rechazo de reglas no verificadas: el motor determinista rechaza reglas DRAFT o PENDING de recomendaciones automáticas', async () => {
    const engine = new DeterministicMaintenanceEngine();

    const draftRule = {
      id: 'draft-rule-1',
      category: 'OIL_AND_FILTER',
      title: 'Regla Borrador Generada Automáticamente',
      intervalKm: 10000,
      intervalMonths: 12,
      source: 'GENERIC',
      sourceCitation: 'Propuesta no validada',
      verificationStatus: 'DRAFT', // NOT VERIFIED
    };

    const calc = engine.calculate({
      vehicle: {
        id: 'test-veh-1',
        make: 'Renault',
        model: 'Logan',
        year: 2020,
        currentMileage: 50000,
      },
      rule: draftRule as any,
    });

    assert.equal(calc.status, MaintenanceStatus.INSUFFICIENT_DATA);
    assert.equal(calc.nextDueMileage, null);
    assert.ok(calc.warning?.includes("Regla técnica en estado 'DRAFT'"));
  });

  // ============================================================================
  // Test 8: Identificación de motorizaciones (EXACT_MATCH)
  // ============================================================================
  it('8. Identificación técnica: coincidencia unívoca (EXACT_MATCH) diferenciando perfiles pendientes vs sintéticos verificados', async () => {
    // 1. VW Golf VII has a single powertrain EA211 in 2019 (seeded in PENDING_VERIFICATION)
    const result = await techEngine.identify({
      make: 'Volkswagen',
      model: 'Golf',
      year: 2019,
      engine: '1.4 TSI EA211',
    });

    assert.equal(result.status, TechnicalMatchStatus.EXACT_MATCH);
    assert.ok(result.matchedConfiguration);
    assert.equal(result.distributionType, 'CORREA');
    assert.equal(result.isDocumentarilyVerified, false);
    assert.equal(result.exactEngineCodeStatus, 'PENDING_CONFIRMATION');
    assert.equal(result.requiresConfirmation, false);

    // 2. Synthetic verified fixture configuration (Fiat Cronos from Test 6)
    const verifiedResult = await techEngine.identify({
      make: 'Fiat',
      model: 'Cronos',
      year: 2022,
    });
    assert.equal(verifiedResult.status, TechnicalMatchStatus.EXACT_MATCH);
    assert.equal(verifiedResult.isDocumentarilyVerified, true);
    assert.equal(verifiedResult.exactEngineCodeStatus, 'CONFIRMED');
  });

  // ============================================================================
  // Test 9: Ambigüedad entre variantes (AMBIGUOUS: H4M Cadena vs K7M Correa)
  // ============================================================================
  it('9. Ambigüedad mecánica: Renault Logan 1.6 2020 detecta variantes H4M (cadena) y K7M (correa) exigiendo confirmación', async () => {
    // Owner registers "Renault Logan 1.6 2020" without confirmed engine code
    const result = await techEngine.identify({
      make: 'Renault',
      model: 'Logan',
      year: 2020,
      engine: '1.6',
    });

    assert.equal(result.status, TechnicalMatchStatus.AMBIGUOUS);
    assert.equal(result.matchedConfiguration, null);
    assert.ok(result.candidateConfigurations.length >= 2);
    assert.equal(result.requiresConfirmation, true);
    assert.ok(result.reason.includes('múltiples variantes'));

    // If owner declares "CADENA", engine flags as POSSIBLE_MATCH pending documentary confirmation
    const declaredResult = await techEngine.identify({
      make: 'Renault',
      model: 'Logan',
      year: 2020,
      userDeclaredDistribution: 'CADENA',
    });

    assert.equal(declaredResult.status, TechnicalMatchStatus.POSSIBLE_MATCH);
    assert.ok(declaredResult.matchedConfiguration);
    assert.equal(declaredResult.distributionType, 'CADENA');
    assert.equal(declaredResult.exactEngineCodeStatus, 'PENDING_CONFIRMATION');
    assert.equal(declaredResult.isDocumentarilyVerified, false);
  });

  // ============================================================================
  // Test 10: Aplicación correcta de intervalos (Ejemplo Ficticio de Pauta)
  // ============================================================================
  it('10. Motor Determinista: 50.000 km odómetro + último service 48.000 km + regla 10.000 km = próximo 58.000 km (restan 8.000 km)', async () => {
    const engine = new DeterministicMaintenanceEngine();

    const verifiedRule = {
      id: 'rule-test-oil',
      category: 'OIL_AND_FILTER',
      title: 'Cambio de Aceite Sintético y Filtro',
      intervalKm: 10000,
      intervalMonths: 12,
      source: 'OEM_MANUAL',
      sourceCitation: 'Manual Oficial Renault 2020',
      verificationStatus: 'VERIFIED',
    };

    const calc = engine.calculate({
      vehicle: {
        id: 'v-test-50k',
        make: 'Renault',
        model: 'Logan',
        year: 2020,
        currentMileage: 50000,
      },
      rule: verifiedRule as any,
      previousServices: [
        {
          serviceDate: new Date('2026-08-01T10:00:00Z'),
          recordedMileage: 48000,
          category: 'OIL_AND_FILTER' as any,
        },
      ],
      currentDate: new Date('2026-10-30T10:00:00Z'),
    });

    assert.equal(calc.status, MaintenanceStatus.OK);
    assert.equal(calc.nextDueMileage, 58000);
    assert.equal(calc.remainingKm, 8000);
    assert.equal(calc.dueReason, DueReason.NONE);
    assert.ok(calc.nextDueDate);
  });

  // ============================================================================
  // Test 11: Falta de datos (INSUFFICIENT_DATA)
  // ============================================================================
  it('11. Ausencia de datos: datos incompletos o sin reglas devuelven INSUFFICIENT_DATA sin inventar proyecciones', async () => {
    const engine = new DeterministicMaintenanceEngine();

    const calcNoRule = engine.calculate({
      vehicle: {
        id: 'v-empty',
        make: 'MarcaDesconocida',
        model: 'ModeloX',
        year: 2022,
        currentMileage: 25000,
      },
      rule: null,
    });
    assert.equal(calcNoRule.status, MaintenanceStatus.INSUFFICIENT_DATA);
    assert.equal(calcNoRule.nextDueMileage, null);
    assert.equal(calcNoRule.confidence, 'NONE');

    // Missing basic search params in identification engine
    const idResult = await techEngine.identify({
      make: '',
      model: '',
      year: 0,
    });
    assert.equal(idResult.status, TechnicalMatchStatus.INSUFFICIENT_DATA);
  });

  // ============================================================================
  // Test 12: Seguridad y Aislamiento entre Talleres y Propietarios
  // ============================================================================
  it('12. Seguridad multi-tenant: Propietario B no puede vincular configuraciones al vehículo de Propietario A (403)', async () => {
    await assert.rejects(
      async () =>
        await ownerBClient.bindOwnerVehicleConfiguration(
          ownerLoganId,
          DEMO_IDS.KB_CFG_LOGAN_H4M
        ),
      /Acceso denegado: no sos el propietario autorizado/i
    );
  });

  // ============================================================================
  // Test 13: Conservación del Historial
  // ============================================================================
  it('13. Conservación del historial: vincular una configuración técnica conserva inalterados los registros de servicios anteriores', async () => {
    const preHistory = await ownerAClient.getOwnerVehicleHistory(ownerLoganId);
    const initialRecordsCount = preHistory.totalRecords;
    assert.ok(initialRecordsCount > 0);

    // Bind configuration to Logan
    const updatedVeh = await ownerAClient.bindOwnerVehicleConfiguration(
      ownerLoganId,
      DEMO_IDS.KB_CFG_LOGAN_H4M
    );
    assert.equal(updatedVeh.configurationId, DEMO_IDS.KB_CFG_LOGAN_H4M);

    const postHistory = await ownerAClient.getOwnerVehicleHistory(ownerLoganId);
    assert.equal(postHistory.totalRecords, initialRecordsCount);
    assert.equal(postHistory.timeline[0]!.description, preHistory.timeline[0]!.description);
  });

  // ============================================================================
  // Test 14: Compatibilidad con registros anteriores
  // ============================================================================
  it('14. Compatibilidad con registros anteriores: vehículos registrados en M12 sin configuration_id siguen operando normalmente', async () => {
    // Register new vehicle without configuration_id
    const newVeh = await ownerAClient.createOwnerVehicle({
      make: 'Fiat',
      model: 'Cronos 1.3 Drive',
      year: 2021,
      currentMileage: 32000,
      plate: 'AE999ZZ',
    });
    assert.ok(newVeh.id);

    // Check predictions with fallback
    const preds = await ownerAClient.getOwnerVehiclePredictions(newVeh.id);
    assert.ok(preds.predictions.length > 0);
    // Insufficient data or fallback handled gracefully without crash
    assert.ok(preds.predictions.some((p) => p.status === 'INSUFFICIENT_DATA' || p.status === 'OK'));
  });

  // ============================================================================
  // Test 15: Seguridad del rol global SUPER_ADMIN y trazabilidad de versiones
  // ============================================================================
  it('15. Seguridad del rol global SUPER_ADMIN: impide escalación por registro público, membresía de taller o JWT manipulado', async () => {
    // Find synthetic fixture rule on Fiat Cronos
    const fiat = await kbRepo.findManufacturerByName('Fiat');
    const cronos = await kbRepo.findModel(fiat!.id, 'Cronos');
    const cronosConfigs = await kbRepo.searchConfigurations({ make: 'Fiat', model: 'Cronos', year: 2022 });
    assert.ok(cronosConfigs.length > 0);
    const syntheticCfgId = cronosConfigs[0]!.id;

    const syntheticRules = await kbRepo.listRulesByConfiguration(syntheticCfgId, { onlyActive: true });
    const targetRule = syntheticRules[0]!;
    assert.ok(targetRule);

    // -------------------------------------------------------------------------
    // Vector A: Registro público (/api/v1/auth/register) intentando inyectar SUPER_ADMIN
    // -------------------------------------------------------------------------
    const escalRegRes = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'attacker.register@example.com',
        password: 'Password123!',
        fullName: 'Attacker Register',
        role: 'SUPER_ADMIN',
        isPlatformSuperAdmin: true,
        permissions: ['*'],
      }),
    });
    assert.equal(escalRegRes.status, 201);
    const escalRegBody = (await escalRegRes.json()) as any;
    assert.equal(escalRegBody.user.role, 'VEHICLE_OWNER', 'Public registration must never grant SUPER_ADMIN');

    const regVerifyAttempt = await fetch(`${baseUrl}/api/v1/kb/rules/${targetRule.id}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${escalRegBody.token}`,
      },
      body: JSON.stringify({ notes: 'Intento desde registro público' }),
    });
    assert.equal(regVerifyAttempt.status, 403);

    // -------------------------------------------------------------------------
    // Vector B: Membresía de taller (workshop_members) intentando otorgar SUPER_ADMIN
    // -------------------------------------------------------------------------
    // 1. Normal Workshop ADMIN attempts to revise global catalog rule -> 403
    await assert.rejects(
      async () => {
        await workshopClient.createKbRuleRevision(targetRule.id, {
          intervalKm: 35000,
        });
      },
      (err: any) => {
        assert.equal(err.statusCode, 403);
        assert.match(err.message, /SUPER_ADMIN/i);
        return true;
      }
    );

    // 2. Even if workshop_members row in DB has role = 'SUPER_ADMIN', login/select-workshop sanitizes it
    //    and tenant-scoped tokens can NEVER obtain isPlatformSuperAdmin
    await db.execute(
      `UPDATE workshop_members SET role = 'SUPER_ADMIN' WHERE user_id = '${DEMO_IDS.USER_LUCAS}' AND workshop_id = '${DEMO_IDS.WORKSHOP_ALPHA}'`
    );
    const lucasClient = new ApiClient({ baseUrl: `${baseUrl}/api/v1` });
    const lucasLogin = await lucasClient.login('lucas@alphamotors.com', 'Password123!', DEMO_IDS.WORKSHOP_ALPHA);
    assert.notEqual(lucasLogin.user.role, 'SUPER_ADMIN', 'Workshop membership must never emit SUPER_ADMIN role');

    const lucasVerifyAttempt = await fetch(`${baseUrl}/api/v1/kb/rules/${targetRule.id}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${lucasLogin.token}`,
      },
      body: JSON.stringify({ notes: 'Intento desde membresía de taller adulterada' }),
    });
    assert.equal(lucasVerifyAttempt.status, 403);

    // 3. Even if a JWT is signed with role = 'SUPER_ADMIN' but bound to a workshop tenantId (tenantId !== null) -> 403
    const tokenService = new TokenService(process.env.JWT_SECRET || 'production-grade-super-secret-key-automotors-32-chars');
    const tenantBoundSuperToken = tokenService.generateAccessToken({
      sub: DEMO_IDS.USER_MARIO,
      email: 'mario@alphamotors.com',
      tenantId: DEMO_IDS.WORKSHOP_ALPHA,
      role: 'SUPER_ADMIN',
      permissions: ['*'],
      sessionId: '00000000-0000-4000-8000-000000000099',
    });
    const tenantBoundAttempt = await fetch(`${baseUrl}/api/v1/kb/rules/${targetRule.id}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tenantBoundSuperToken}`,
      },
      body: JSON.stringify({ notes: 'Intento con tenantId no nulo' }),
    });
    assert.equal(tenantBoundAttempt.status, 403);

    // -------------------------------------------------------------------------
    // Vector C: JWT manipulado (payload alterado o firma inválida) -> 401 Unauthorized
    // -------------------------------------------------------------------------
    const validOwnerToken = escalRegBody.token as string;
    const parts = validOwnerToken.split('.');
    const tamperedPayload = Buffer.from(
      JSON.stringify({
        sub: escalRegBody.user.id,
        email: 'attacker.register@example.com',
        tenantId: null,
        role: 'SUPER_ADMIN',
        permissions: ['*'],
        sessionId: escalRegBody.session.id,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      })
    ).toString('base64url');
    const tamperedJwt = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

    const tamperedAttempt = await fetch(`${baseUrl}/api/v1/kb/rules/${targetRule.id}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tamperedJwt}`,
      },
      body: JSON.stringify({ notes: 'Intento con JWT manipulado' }),
    });
    assert.equal(tamperedAttempt.status, 401);

    const forgedTokenService = new TokenService('forged-attacker-secret-key-not-matching-server-32');
    const forgedJwt = forgedTokenService.generateAccessToken({
      sub: DEMO_IDS.USER_MARIO,
      email: 'superadmin@automotors.com',
      tenantId: null,
      role: 'SUPER_ADMIN',
      permissions: ['*'],
      sessionId: '00000000-0000-4000-8000-000000000099',
    });
    const forgedAttempt = await fetch(`${baseUrl}/api/v1/kb/rules/${targetRule.id}/revision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${forgedJwt}`,
      },
      body: JSON.stringify({ changes: { intervalKm: 99999 } }),
    });
    assert.equal(forgedAttempt.status, 401);

    // -------------------------------------------------------------------------
    // Vector D: Plataforma SUPER_ADMIN legítimo (tenantId: null) crea revisión en fixture sintético
    // -------------------------------------------------------------------------
    const newRev = await superAdminClient.createKbRuleRevision(
      targetRule.id,
      {
        intervalKm: 12000,
        verificationNotes: '[FIXTURE SINTÉTICO] Revisión autorizada por SUPER_ADMIN global de plataforma.',
      },
      true
    );

    assert.equal(newRev.ruleVersion, targetRule.ruleVersion + 1);
    assert.equal(newRev.intervalKm, 12000);
    assert.equal(newRev.isActive, true);
  });

  // ============================================================================
  // Test 16: Integridad de migraciones y reversibilidad
  // ============================================================================
  it('16. Integridad de migraciones y reversibilidad: ejecuta 0001-0003, prueba rollback down.sql y reejecución limpia', async () => {
    const sandboxDir = path.join(process.cwd(), '.data', `test_migration_sandbox_${Date.now()}`);
    const freshDb = await DatabaseFactory.createInMemoryTestDb(sandboxDir);

    // 1. Runs all migrations: 0001, 0002, 0003
    await DatabaseMigrator.runMigrations(freshDb);

    // Verify health
    const health = await DatabaseFactory.checkHealth(freshDb);
    assert.equal(health.isHealthy, true);

    // 2. Test Idempotency / Safe Re-run on already migrated DB
    await DatabaseMigrator.runMigrations(freshDb);

    // 3. Test Rollback (Down migration 0003)
    const downSqlPath = path.resolve(process.cwd(), 'packages', 'database', 'src', 'migrations', '0003_vehicle_knowledge_base.down.sql');
    const downSql = fs.readFileSync(downSqlPath, 'utf8');
    await DatabaseMigrator.executeMigrationSql(freshDb, downSql, '0003_vehicle_knowledge_base.down.sql');

    // Verify KB tables dropped
    const checkTable = await freshDb.execute(
      "SELECT to_regclass('public.kb_configurations') as exists_tbl"
    );
    assert.equal(checkTable.rows?.[0]?.exists_tbl, null);

    // 4. Test Re-applying migrations cleanly after rollback
    await DatabaseMigrator.runMigrations(freshDb);
    const recheckTable = await freshDb.execute(
      "SELECT to_regclass('public.kb_configurations') as exists_tbl"
    );
    assert.ok(recheckTable.rows?.[0]?.exists_tbl !== null);

    // Clean up
    if (fs.existsSync(sandboxDir)) {
      try {
        fs.rmSync(sandboxDir, { recursive: true, force: true });
      } catch {
        // Ignored on file locks
      }
    }
  });
});
