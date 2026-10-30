import type { DatabaseInstance } from '@automotors/database';
import {
  workshops,
  users,
  workshopMembers,
  customers,
  vehicles,
  vehicleOwnerships,
  workOrders,
  workOrderItems,
  maintenanceRecords,
  maintenanceIntervals,
  kbManufacturers,
  kbModels,
  kbGenerations,
  kbPowertrains,
  kbDocumentSources,
  kbConfigurations,
  kbTechnicalSpecs,
  kbMaintenanceRules,
} from '@automotors/database';
import { PasswordService } from '@automotors/security-foundation';

export interface SeedResult {
  workshopsCount: number;
  usersCount: number;
  customersCount: number;
  vehiclesCount: number;
  workOrdersCount: number;
  maintenanceRecordsCount: number;
  intervalsCount: number;
  kbConfigurationsCount?: number;
}

// Deterministic UUIDs for demo
export const DEMO_IDS = {
  WORKSHOP_ALPHA: 'a0000000-0000-4000-8000-000000000001',
  WORKSHOP_BETA: 'a0000000-0000-4000-8000-000000000002',
  USER_MARIO: 'b0000000-0000-4000-8000-000000000001',
  USER_LUCAS: 'b0000000-0000-4000-8000-000000000002',
  USER_BETA_CARLOS: 'b0000000-0000-4000-8000-000000000003',
  USER_OWNER_VALERIA: 'b0000000-0000-4000-8000-000000000004',
  CUSTOMER_DEMO_VIP: 'c0000000-0000-4000-8000-000000000001',
  CUSTOMER_CARLA: 'c0000000-0000-4000-8000-000000000002',
  CUSTOMER_ESTEBAN: 'c0000000-0000-4000-8000-000000000003',
  VEHICLE_VW_GOLF: 'd0000000-0000-4000-8000-000000000001',
  VEHICLE_TOYOTA_COROLLA: 'd0000000-0000-4000-8000-000000000002',
  VEHICLE_FORD_RANGER: 'd0000000-0000-4000-8000-000000000003',
  VEHICLE_PEUGEOT_208: 'd0000000-0000-4000-8000-000000000004',
  VEHICLE_HONDA_CIVIC: 'd0000000-0000-4000-8000-000000000005',
  VEHICLE_RENAULT_LOGAN_OWNER: 'd0000000-0000-4000-8000-000000000006',
  WO_VW_GOLF_45K: 'e0000000-0000-4000-8000-000000000001',
  WO_TOYOTA_30K: 'e0000000-0000-4000-8000-000000000002',
  WO_RANGER_92K: 'e0000000-0000-4000-8000-000000000003',
  WO_PEUGEOT_41K: 'e0000000-0000-4000-8000-000000000004',
  REC_VW_GOLF_45K: '10000000-0000-4000-8000-000000000001',
  REC_TOYOTA_30K: '10000000-0000-4000-8000-000000000002',
  REC_LOGAN_30K_CERTIFIED: '10000000-0000-4000-8000-000000000003',
  REC_LOGAN_40K_OWNER: '10000000-0000-4000-8000-000000000004',
  RULE_VW_OIL: '20000000-0000-4000-8000-000000000001',
  RULE_VW_SPARK: '20000000-0000-4000-8000-000000000002',
  RULE_TOYOTA_OIL: '20000000-0000-4000-8000-000000000003',
  RULE_TOYOTA_BRAKES: '20000000-0000-4000-8000-000000000004',
  RULE_FORD_OIL: '20000000-0000-4000-8000-000000000005',
  RULE_LOGAN_OIL: '20000000-0000-4000-8000-000000000006',
  RULE_LOGAN_FILTERS: '20000000-0000-4000-8000-000000000007',
  RULE_LOGAN_BRAKES: '20000000-0000-4000-8000-000000000008',
  RULE_LOGAN_SPARK: '20000000-0000-4000-8000-000000000009',
  RULE_LOGAN_COOLANT: '20000000-0000-4000-8000-000000000010',
  // Knowledge Base Demo IDs
  KB_MFG_RENAULT: '50000000-0000-4000-8000-000000000001',
  KB_MFG_VW: '50000000-0000-4000-8000-000000000002',
  KB_MODEL_LOGAN: '51000000-0000-4000-8000-000000000001',
  KB_MODEL_GOLF: '51000000-0000-4000-8000-000000000002',
  KB_GEN_LOGAN_2: '52000000-0000-4000-8000-000000000001',
  KB_GEN_GOLF_7: '52000000-0000-4000-8000-000000000002',
  KB_PWR_H4M: '53000000-0000-4000-8000-000000000001',
  KB_PWR_K7M: '53000000-0000-4000-8000-000000000002',
  KB_PWR_EA211: '53000000-0000-4000-8000-000000000003',
  KB_SRC_RENAULT: '54000000-0000-4000-8000-000000000001',
  KB_SRC_VW: '54000000-0000-4000-8000-000000000002',
  KB_CFG_LOGAN_H4M: '55000000-0000-4000-8000-000000000001',
  KB_CFG_LOGAN_K7M: '55000000-0000-4000-8000-000000000002',
  KB_CFG_GOLF_EA211: '55000000-0000-4000-8000-000000000003',
  KB_RULE_LOGAN_OIL: '56000000-0000-4000-8000-000000000001',
  KB_RULE_LOGAN_FILTERS: '56000000-0000-4000-8000-000000000002',
  KB_RULE_LOGAN_BRAKES: '56000000-0000-4000-8000-000000000003',
  KB_RULE_LOGAN_SPARKS: '56000000-0000-4000-8000-000000000004',
  KB_RULE_LOGAN_COOLANT: '56000000-0000-4000-8000-000000000005',
  KB_RULE_LOGAN_TIMING: '56000000-0000-4000-8000-000000000006',
  KB_RULE_LOGAN_K7M_BELT: '56000000-0000-4000-8000-000000000007',
};

export class DemoSeeder {
  private readonly db: DatabaseInstance;

  constructor(db: DatabaseInstance) {
    this.db = db;
  }

  public async seed(): Promise<SeedResult> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('DEMO_SEED_FORBIDDEN_IN_PRODUCTION: Cannot seed demo data in a production environment.');
    }

    const passwordService = new PasswordService();
    const defaultPasswordHash = await passwordService.hash('Password123!');

    // 1. Workshops
    await this.db
      .insert(workshops)
      .values([
        {
          id: DEMO_IDS.WORKSHOP_ALPHA,
          name: '[DEMO] Alpha Motors Garage',
          taxId: '30-71234567-9',
          address: 'Av. Libertador 4500, Vicente López, Buenos Aires',
          phone: '+54 11 4790-1234',
          email: 'contacto@alphamotors.demo',
          isActive: true,
        },
        {
          id: DEMO_IDS.WORKSHOP_BETA,
          name: '[DEMO] Beta Service Oficial',
          taxId: '30-89123456-1',
          address: 'Av. Juan B. Justo 3200, CABA',
          phone: '+54 11 4855-9876',
          email: 'info@betaservice.demo',
          isActive: true,
        },
      ])
      .onConflictDoNothing();

    // 2. Users
    await this.db
      .insert(users)
      .values([
        {
          id: DEMO_IDS.USER_MARIO,
          email: 'mario@alphamotors.com',
          passwordHash: defaultPasswordHash,
          fullName: 'Mario Rossi (Jefe de Taller)',
          phone: '+54 9 11 5555-1111',
          isActive: true,
        },
        {
          id: DEMO_IDS.USER_LUCAS,
          email: 'lucas@alphamotors.com',
          passwordHash: defaultPasswordHash,
          fullName: 'Lucas Gómez (Mecánico Especialista)',
          phone: '+54 9 11 5555-2222',
          isActive: true,
        },
        {
          id: DEMO_IDS.USER_BETA_CARLOS,
          email: 'carlos@betaservice.com',
          passwordHash: defaultPasswordHash,
          fullName: 'Carlos Bianchi (Mecánico Beta)',
          phone: '+54 9 11 5555-3333',
          isActive: true,
        },
        {
          id: DEMO_IDS.USER_OWNER_VALERIA,
          email: 'valeria@miautomotors.com',
          passwordHash: defaultPasswordHash,
          fullName: 'Valeria Méndez',
          phone: '+54 9 11 6789-4321',
          isActive: true,
        },
      ])
      .onConflictDoNothing();

    // 3. Workshop Memberships
    await this.db
      .insert(workshopMembers)
      .values([
        {
          workshopId: DEMO_IDS.WORKSHOP_ALPHA,
          userId: DEMO_IDS.USER_MARIO,
          role: 'ADMIN',
          isActive: true,
        },
        {
          workshopId: DEMO_IDS.WORKSHOP_BETA,
          userId: DEMO_IDS.USER_MARIO,
          role: 'ADMIN',
          isActive: true,
        },
        {
          workshopId: DEMO_IDS.WORKSHOP_ALPHA,
          userId: DEMO_IDS.USER_LUCAS,
          role: 'MECHANIC',
          isActive: true,
        },
        {
          workshopId: DEMO_IDS.WORKSHOP_BETA,
          userId: DEMO_IDS.USER_BETA_CARLOS,
          role: 'MECHANIC',
          isActive: true,
        },
      ])
      .onConflictDoNothing();

    // 4. Customers
    await this.db
      .insert(customers)
      .values([
        {
          id: DEMO_IDS.CUSTOMER_DEMO_VIP,
          workshopId: DEMO_IDS.WORKSHOP_ALPHA,
          firstName: 'Carlos',
          lastName: 'Méndez (Cliente VIP)',
          email: 'carlos.mendez@cliente.com',
          phone: '+54 9 11 4444-5555',
          documentId: '20-33445566-7',
          notes: 'Cliente de confianza. Priorizar turno.',
        },
        {
          id: DEMO_IDS.CUSTOMER_CARLA,
          workshopId: DEMO_IDS.WORKSHOP_ALPHA,
          firstName: 'Carla',
          lastName: 'Benítez',
          email: 'carla@cliente.com',
          phone: '+54 9 11 2222-3333',
          documentId: '27-38889999-4',
          notes: 'Pago con transferencia bancaria.',
        },
        {
          id: DEMO_IDS.CUSTOMER_ESTEBAN,
          workshopId: DEMO_IDS.WORKSHOP_ALPHA,
          firstName: 'Esteban',
          lastName: 'Quito',
          email: 'esteban@cliente.com',
          phone: '+54 9 11 9999-8888',
          documentId: '20-25667788-2',
          notes: 'Camioneta de uso mixto campo/ciudad.',
        },
      ])
      .onConflictDoNothing();

    // 4b. Knowledge Base: Manufacturers, Models, Generations, Powertrains, Sources, Configurations & Rules
    await this.db
      .insert(kbManufacturers)
      .values([
        {
          id: DEMO_IDS.KB_MFG_RENAULT,
          name: 'Renault',
          country: 'Francia / Mercosur',
          status: 'ACTIVE',
        },
        {
          id: DEMO_IDS.KB_MFG_VW,
          name: 'Volkswagen',
          country: 'Alemania',
          status: 'ACTIVE',
        },
      ])
      .onConflictDoNothing();

    await this.db
      .insert(kbModels)
      .values([
        {
          id: DEMO_IDS.KB_MODEL_LOGAN,
          manufacturerId: DEMO_IDS.KB_MFG_RENAULT,
          name: 'Logan',
          status: 'ACTIVE',
        },
        {
          id: DEMO_IDS.KB_MODEL_GOLF,
          manufacturerId: DEMO_IDS.KB_MFG_VW,
          name: 'Golf',
          status: 'ACTIVE',
        },
      ])
      .onConflictDoNothing();

    await this.db
      .insert(kbGenerations)
      .values([
        {
          id: DEMO_IDS.KB_GEN_LOGAN_2,
          modelId: DEMO_IDS.KB_MODEL_LOGAN,
          generationName: 'Logan II Phase 2',
          generationCode: 'L52',
          startYear: 2019,
          endYear: 2024,
          market: 'AR',
          verificationStatus: 'PENDING_VERIFICATION',
        },
        {
          id: DEMO_IDS.KB_GEN_GOLF_7,
          modelId: DEMO_IDS.KB_MODEL_GOLF,
          generationName: 'Golf VII',
          generationCode: '5G',
          startYear: 2015,
          endYear: 2021,
          market: 'AR',
          verificationStatus: 'PENDING_VERIFICATION',
        },
      ])
      .onConflictDoNothing();

    await this.db
      .insert(kbPowertrains)
      .values([
        {
          id: DEMO_IDS.KB_PWR_H4M,
          manufacturerId: DEMO_IDS.KB_MFG_RENAULT,
          engineCode: 'H4M',
          family: 'SCe / HR16DE',
          displacementCc: 1598,
          displacementLiters: '1.6',
          fuelType: 'GASOLINE',
          valves: 16,
          powerHp: 115,
          timingMechanism: 'CADENA',
          timingObservations:
            'Arquitectura con cadena metálica bañada en aceite y correa auxiliar poli-V. Especificación e intervalos exactos pendientes de verificación con manual primario oficial de Renault Argentina.',
          // oil_viscosity_oem holds only an OEM-verified value. Unverified candidates are kept
          // in metadata with an explicit PENDING_VERIFICATION status and are never surfaced as official.
          oilViscosityOem: null,
          oilCapacityLiters: null,
          verificationStatus: 'PENDING_VERIFICATION',
          metadata: {
            candidateOilViscosity: '5W-40 / 10W-40',
            candidateOilViscosityStatus: 'PENDING_VERIFICATION',
            candidateOilViscosityNote:
              'Preliminary reference. Requires confirmation against the primary official Renault Argentina manual.',
          },
        },
        {
          id: DEMO_IDS.KB_PWR_K7M,
          manufacturerId: DEMO_IDS.KB_MFG_RENAULT,
          engineCode: 'K7M',
          family: 'Hi-Torque 8v',
          displacementCc: 1598,
          displacementLiters: '1.6',
          fuelType: 'GASOLINE',
          valves: 8,
          powerHp: 85,
          timingMechanism: 'CORREA',
          timingObservations:
            'Arquitectura con correa dentada de distribución. Intervalo exacto de sustitución pendiente de verificación con manual primario oficial de Renault Argentina.',
          oilViscosityOem: null,
          oilCapacityLiters: null,
          verificationStatus: 'PENDING_VERIFICATION',
          metadata: {
            candidateOilViscosity: '10W-40',
            candidateOilViscosityStatus: 'PENDING_VERIFICATION',
            candidateOilViscosityNote:
              'Preliminary reference. Requires confirmation against the primary official Renault Argentina manual.',
          },
        },
        {
          id: DEMO_IDS.KB_PWR_EA211,
          manufacturerId: DEMO_IDS.KB_MFG_VW,
          engineCode: 'EA211',
          family: 'TSI EA211',
          displacementCc: 1395,
          displacementLiters: '1.4',
          fuelType: 'GASOLINE',
          valves: 16,
          powerHp: 150,
          timingMechanism: 'CORREA',
          timingObservations:
            'Correa dentada en baño seco. Especificación pendiente de verificación documental primaria.',
          oilViscosityOem: null,
          oilCapacityLiters: null,
          verificationStatus: 'PENDING_VERIFICATION',
          metadata: {
            candidateOilViscosityStatus: 'PENDING_VERIFICATION',
            candidateOilViscosityNote: 'No verified OEM oil specification registered.',
          },
        },
      ])
      .onConflictDoNothing();

    await this.db
      .insert(kbDocumentSources)
      .values([
        {
          id: DEMO_IDS.KB_SRC_RENAULT,
          docType: 'PENDING_PRIMARY_SOURCE',
          publisher: 'Renault Argentina S.A. (Sin documento primario adjunto en repositorio)',
          title: 'Ficha en Revisión Técnica — Pendiente de Manual Físico / Carnet de Mantenimiento Renault Argentina',
          market: 'AR',
          versionOrDate: null,
          documentReference: null,
          pageOrSection: null,
          consultationDate: new Date('2026-01-15T00:00:00Z'),
          reviewStatus: 'PENDING_VERIFICATION',
        },
        {
          id: DEMO_IDS.KB_SRC_VW,
          docType: 'PENDING_PRIMARY_SOURCE',
          publisher: 'Volkswagen Argentina S.A. (Sin documento primario adjunto en repositorio)',
          title: 'Ficha en Revisión Técnica — Pendiente de Manual Físico Oficial Volkswagen',
          market: 'AR',
          versionOrDate: null,
          documentReference: null,
          pageOrSection: null,
          consultationDate: new Date('2026-01-15T00:00:00Z'),
          reviewStatus: 'PENDING_VERIFICATION',
        },
      ])
      .onConflictDoNothing();

    await this.db
      .insert(kbConfigurations)
      .values([
        {
          id: DEMO_IDS.KB_CFG_LOGAN_H4M,
          modelId: DEMO_IDS.KB_MODEL_LOGAN,
          generationId: DEMO_IDS.KB_GEN_LOGAN_2,
          powertrainId: DEMO_IDS.KB_PWR_H4M,
          commercialName: 'Renault Logan II 1.6 16v SCe Manual',
          yearFrom: 2019,
          yearTo: 2024,
          market: 'AR',
          transmission: 'MANUAL',
          bodyStyle: 'Sedán',
          trim: 'Zen / Intens',
          sourceId: DEMO_IDS.KB_SRC_RENAULT,
          verificationStatus: 'PENDING_VERIFICATION',
        },
        {
          id: DEMO_IDS.KB_CFG_LOGAN_K7M,
          modelId: DEMO_IDS.KB_MODEL_LOGAN,
          generationId: DEMO_IDS.KB_GEN_LOGAN_2,
          powertrainId: DEMO_IDS.KB_PWR_K7M,
          commercialName: 'Renault Logan II 1.6 8v Manual',
          yearFrom: 2016,
          yearTo: 2020,
          market: 'AR',
          transmission: 'MANUAL',
          bodyStyle: 'Sedán',
          trim: 'Life / Zen',
          sourceId: DEMO_IDS.KB_SRC_RENAULT,
          verificationStatus: 'PENDING_VERIFICATION',
        },
        {
          id: DEMO_IDS.KB_CFG_GOLF_EA211,
          modelId: DEMO_IDS.KB_MODEL_GOLF,
          generationId: DEMO_IDS.KB_GEN_GOLF_7,
          powertrainId: DEMO_IDS.KB_PWR_EA211,
          commercialName: 'Volkswagen Golf VII 1.4 TSI Highline DSG',
          yearFrom: 2015,
          yearTo: 2021,
          market: 'AR',
          transmission: 'AUTOMATIC',
          bodyStyle: 'Hatchback',
          trim: 'Highline',
          sourceId: DEMO_IDS.KB_SRC_VW,
          verificationStatus: 'PENDING_VERIFICATION',
        },
      ])
      .onConflictDoNothing();

    await this.db
      .insert(kbTechnicalSpecs)
      .values([
        {
          id: '57000000-0000-4000-8000-000000000001',
          configurationId: DEMO_IDS.KB_CFG_LOGAN_H4M,
          category: 'ENGINE_OIL',
          specKey: 'oil_viscosity',
          specValue: 'Pendiente de verificación documental (viscosidad y norma RN según manual de unidad)',
          unit: 'SAE',
          condition: 'ALL',
          sourceId: DEMO_IDS.KB_SRC_RENAULT,
          verificationStatus: 'PENDING_VERIFICATION',
        },
        {
          id: '57000000-0000-4000-8000-000000000002',
          configurationId: DEMO_IDS.KB_CFG_LOGAN_H4M,
          category: 'ENGINE_OIL',
          specKey: 'oil_capacity',
          specValue: 'Pendiente de verificación documental (capacidad exacta con y sin filtro)',
          unit: 'L',
          condition: 'ALL',
          sourceId: DEMO_IDS.KB_SRC_RENAULT,
          verificationStatus: 'PENDING_VERIFICATION',
        },
        {
          id: '57000000-0000-4000-8000-000000000003',
          configurationId: DEMO_IDS.KB_CFG_LOGAN_H4M,
          category: 'DISTRIBUTION',
          specKey: 'timing_system',
          specValue: 'Cadena metálica (H4M) — Pauta de inspección pendiente de verificación documental',
          unit: null,
          condition: 'ALL',
          sourceId: DEMO_IDS.KB_SRC_RENAULT,
          verificationStatus: 'PENDING_VERIFICATION',
        },
        {
          id: '57000000-0000-4000-8000-000000000004',
          configurationId: DEMO_IDS.KB_CFG_LOGAN_H4M,
          category: 'COOLANT',
          specKey: 'coolant_standard',
          specValue: 'Pendiente de verificación documental (especificación de fluido refrigerante)',
          unit: null,
          condition: 'ALL',
          sourceId: DEMO_IDS.KB_SRC_RENAULT,
          verificationStatus: 'PENDING_VERIFICATION',
        },
        {
          id: '57000000-0000-4000-8000-000000000005',
          configurationId: DEMO_IDS.KB_CFG_LOGAN_H4M,
          category: 'ACCESSORIES',
          specKey: 'accessory_belt',
          specValue: 'Correa poli-V de accesorios — Intervalo pendiente de verificación documental',
          unit: null,
          condition: 'ALL',
          sourceId: DEMO_IDS.KB_SRC_RENAULT,
          verificationStatus: 'PENDING_VERIFICATION',
        },
        {
          id: '57000000-0000-4000-8000-000000000006',
          configurationId: DEMO_IDS.KB_CFG_LOGAN_H4M,
          category: 'SPARK_PLUGS',
          specKey: 'spark_plug_model',
          specValue: 'Pendiente de verificación documental (código de pieza y luz de electrodo)',
          unit: null,
          condition: 'ALL',
          sourceId: DEMO_IDS.KB_SRC_RENAULT,
          verificationStatus: 'PENDING_VERIFICATION',
        },
      ])
      .onConflictDoNothing();

    await this.db
      .insert(kbMaintenanceRules)
      .values([
        {
          id: DEMO_IDS.KB_RULE_LOGAN_OIL,
          configurationId: DEMO_IDS.KB_CFG_LOGAN_H4M,
          category: 'OIL_AND_FILTER',
          operation: 'REPLACE',
          title: 'Cambio de Aceite y Filtro de Aceite (En Revisión Documental)',
          description:
            'Pauta preliminar en estado PENDING_VERIFICATION. Excluida de recomendaciones verificadas hasta cotejo con manual oficial de Renault Argentina.',
          intervalKm: 10000,
          intervalMonths: 12,
          severeIntervalKm: 7500,
          severeIntervalMonths: 6,
          conditions: 'Sujeto a confirmación de plan oficial Renault Argentina.',
          sourceId: DEMO_IDS.KB_SRC_RENAULT,
          verificationStatus: 'PENDING_VERIFICATION',
          ruleVersion: 1,
          isActive: true,
          verifiedAt: null,
          verificationNotes:
            'Pendiente de respaldo documental primario oficial de Renault Argentina. Excluida del cálculo automático.',
        },
        {
          id: DEMO_IDS.KB_RULE_LOGAN_FILTERS,
          configurationId: DEMO_IDS.KB_CFG_LOGAN_H4M,
          category: 'AIR_AND_CABIN_FILTERS',
          operation: 'REPLACE',
          title: 'Reemplazo de Filtro de Aire y Filtro de Habitáculo (En Revisión Documental)',
          description:
            'Pauta preliminar en estado PENDING_VERIFICATION. Excluida de recomendaciones verificadas.',
          intervalKm: 10000,
          intervalMonths: 12,
          sourceId: DEMO_IDS.KB_SRC_RENAULT,
          verificationStatus: 'PENDING_VERIFICATION',
          ruleVersion: 1,
          isActive: true,
          verifiedAt: null,
          verificationNotes:
            'Pendiente de respaldo documental primario oficial de Renault Argentina. Excluida del cálculo automático.',
        },
        {
          id: DEMO_IDS.KB_RULE_LOGAN_BRAKES,
          configurationId: DEMO_IDS.KB_CFG_LOGAN_H4M,
          category: 'BRAKES',
          operation: 'INSPECT',
          title: 'Inspección de Frenos y Fluido Hidráulico (En Revisión Documental)',
          description:
            'Pauta preliminar en estado PENDING_VERIFICATION. Excluida de recomendaciones verificadas.',
          intervalKm: 30000,
          intervalMonths: 24,
          sourceId: DEMO_IDS.KB_SRC_RENAULT,
          verificationStatus: 'PENDING_VERIFICATION',
          ruleVersion: 1,
          isActive: true,
          verifiedAt: null,
          verificationNotes:
            'Pendiente de respaldo documental primario oficial de Renault Argentina. Excluida del cálculo automático.',
        },
        {
          id: DEMO_IDS.KB_RULE_LOGAN_SPARKS,
          configurationId: DEMO_IDS.KB_CFG_LOGAN_H4M,
          category: 'SPARK_PLUGS',
          operation: 'REPLACE',
          title: 'Reemplazo de Juego de Bujías de Encendido (En Revisión Documental)',
          description:
            'Pauta preliminar en estado PENDING_VERIFICATION (sin código de bujía verificado documentalmente). Excluida de recomendaciones verificadas.',
          intervalKm: 40000,
          intervalMonths: 36,
          sourceId: DEMO_IDS.KB_SRC_RENAULT,
          verificationStatus: 'PENDING_VERIFICATION',
          ruleVersion: 1,
          isActive: true,
          verifiedAt: null,
          verificationNotes:
            'Pendiente de respaldo documental primario oficial de Renault Argentina. Excluida del cálculo automático.',
        },
        {
          id: DEMO_IDS.KB_RULE_LOGAN_COOLANT,
          configurationId: DEMO_IDS.KB_CFG_LOGAN_H4M,
          category: 'COOLANT',
          operation: 'REPLACE',
          title: 'Renovación de Líquido Refrigerante (En Revisión Documental)',
          description:
            'Pauta preliminar en estado PENDING_VERIFICATION. Excluida de recomendaciones verificadas.',
          intervalKm: 60000,
          intervalMonths: 48,
          sourceId: DEMO_IDS.KB_SRC_RENAULT,
          verificationStatus: 'PENDING_VERIFICATION',
          ruleVersion: 1,
          isActive: true,
          verifiedAt: null,
          verificationNotes:
            'Pendiente de respaldo documental primario oficial de Renault Argentina. Excluida del cálculo automático.',
        },
        {
          id: DEMO_IDS.KB_RULE_LOGAN_TIMING,
          configurationId: DEMO_IDS.KB_CFG_LOGAN_H4M,
          category: 'TIMING_BELT',
          operation: 'INSPECT',
          title: 'Control de Cadena de Distribución y Correa de Accesorios (En Revisión Documental)',
          description:
            'Pauta preliminar para variante H4M en estado PENDING_VERIFICATION. Excluida de recomendaciones verificadas hasta confirmación documental de fábrica.',
          intervalKm: 60000,
          intervalMonths: 48,
          conditions: 'Pendiente de verificación documental de intervalo de correa auxiliar.',
          sourceId: DEMO_IDS.KB_SRC_RENAULT,
          verificationStatus: 'PENDING_VERIFICATION',
          ruleVersion: 1,
          isActive: true,
          verifiedAt: null,
          verificationNotes:
            'Pendiente de respaldo documental primario oficial de Renault Argentina. Excluida del cálculo automático.',
        },
        {
          id: DEMO_IDS.KB_RULE_LOGAN_K7M_BELT,
          configurationId: DEMO_IDS.KB_CFG_LOGAN_K7M,
          category: 'TIMING_BELT',
          operation: 'REPLACE',
          title: 'Reemplazo de Correa Dentada de Distribución K7M 8v (En Revisión Documental)',
          description:
            'Pauta preliminar para variante K7M 8v en estado PENDING_VERIFICATION. Excluida de recomendaciones verificadas hasta confirmación documental de fábrica.',
          intervalKm: 60000,
          intervalMonths: 48,
          sourceId: DEMO_IDS.KB_SRC_RENAULT,
          verificationStatus: 'PENDING_VERIFICATION',
          ruleVersion: 1,
          isActive: true,
          verifiedAt: null,
          verificationNotes:
            'Pendiente de respaldo documental primario oficial de Renault Argentina. Excluida del cálculo automático.',
        },
      ])
      .onConflictDoNothing();

    // 5. Vehicles (5 vehículos, destacando el Volkswagen Golf VII de demostración)
    await this.db
      .insert(vehicles)
      .values([
        {
          id: DEMO_IDS.VEHICLE_VW_GOLF,
          vin: 'WVWZZZAUZKP100001',
          plate: 'AE123CD',
          make: 'Volkswagen',
          model: 'Golf VII 1.4 TSI Highline DSG',
          year: 2019,
          engine: '1.4 TSI 150 CV (EA211)',
          fuelType: 'Nafta Premium',
          currentMileage: 58400,
          configurationId: DEMO_IDS.KB_CFG_GOLF_EA211,
          metadata: { isDemoData: true, featured: true },
        },
        {
          id: DEMO_IDS.VEHICLE_TOYOTA_COROLLA,
          vin: '9BRBL42E4N0000002',
          plate: 'AF456GH',
          make: 'Toyota',
          model: 'Corolla 2.0 SEG Direct Shift',
          year: 2022,
          engine: '2.0 Dynamic Force 170 CV',
          fuelType: 'Nafta Super',
          currentMileage: 35000,
          metadata: { isDemoData: true },
        },
        {
          id: DEMO_IDS.VEHICLE_FORD_RANGER,
          vin: '8AFBR24S5L0000003',
          plate: 'AD789JK',
          make: 'Ford',
          model: 'Ranger 3.2 TDCi Limited 4x4 AT',
          year: 2020,
          engine: '3.2 Duratorq 200 CV',
          fuelType: 'Diesel Grado 3',
          currentMileage: 92000,
          metadata: { isDemoData: true },
        },
        {
          id: DEMO_IDS.VEHICLE_PEUGEOT_208,
          vin: '8ADCC5FP7M0000004',
          plate: 'AE321MN',
          make: 'Peugeot',
          model: '208 Feline Tiptronic',
          year: 2021,
          engine: '1.6 VTi 115 CV (EC5)',
          fuelType: 'Nafta Super',
          currentMileage: 41200,
          metadata: { isDemoData: true },
        },
        {
          id: DEMO_IDS.VEHICLE_HONDA_CIVIC,
          vin: '93HFA1670J0000005',
          plate: 'AC654OP',
          make: 'Honda',
          model: 'Civic EXL 2.0 i-VTEC CVT',
          year: 2018,
          engine: '2.0 16v 155 CV',
          fuelType: 'Nafta Super',
          currentMileage: 78000,
          metadata: { isDemoData: true },
        },
        {
          id: DEMO_IDS.VEHICLE_RENAULT_LOGAN_OWNER,
          vin: '8A1LSRB05L0002020',
          plate: 'AE202LG',
          make: 'Renault',
          model: 'Logan II Zen 1.6 16v SCe',
          year: 2020,
          engine: '1.6 16v SCe (H4M / HR16 probable)',
          fuelType: 'Nafta Super',
          currentMileage: 46800,
          ownerUserId: DEMO_IDS.USER_OWNER_VALERIA,
          configurationId: DEMO_IDS.KB_CFG_LOGAN_H4M,
          metadata: {
            isDemoData: true,
            isOwnerPortalVehicle: true,
            transmission: 'Manual (5 velocidades)',
            distributionType: 'CADENA',
            exactEngineCode: 'H4M / HR16 — pendiente de confirmación documental',
          },
        },
      ])
      .onConflictDoNothing();

    // 5b. Vehicle Ownerships
    await this.db
      .insert(vehicleOwnerships)
      .values([
        {
          id: '30000000-0000-4000-8000-000000000001',
          vehicleId: DEMO_IDS.VEHICLE_VW_GOLF,
          customerId: DEMO_IDS.CUSTOMER_DEMO_VIP,
          workshopId: DEMO_IDS.WORKSHOP_ALPHA,
          isCurrentOwner: true,
        },
        {
          id: '30000000-0000-4000-8000-000000000002',
          vehicleId: DEMO_IDS.VEHICLE_TOYOTA_COROLLA,
          customerId: DEMO_IDS.CUSTOMER_CARLA,
          workshopId: DEMO_IDS.WORKSHOP_ALPHA,
          isCurrentOwner: true,
        },
        {
          id: '30000000-0000-4000-8000-000000000003',
          vehicleId: DEMO_IDS.VEHICLE_FORD_RANGER,
          customerId: DEMO_IDS.CUSTOMER_ESTEBAN,
          workshopId: DEMO_IDS.WORKSHOP_ALPHA,
          isCurrentOwner: true,
        },
      ])
      .onConflictDoNothing();

    // 6. Maintenance Intervals (Synthetic Demo Fixtures only — Renault Logan 2020 is governed by KB in PENDING_VERIFICATION)
    await this.db
      .insert(maintenanceIntervals)
      .values([
        {
          id: DEMO_IDS.RULE_VW_OIL,
          make: 'Volkswagen',
          model: 'Golf',
          year: 2019,
          engine: '1.4 TSI',
          category: 'OIL_AND_FILTER',
          intervalKm: 15000,
          intervalMonths: 12,
          sourceCitation: '[FIXTURE DEMO] Pauta de demostración para taller (sin documento OEM adjunto)',
        },
        {
          id: DEMO_IDS.RULE_VW_SPARK,
          make: 'Volkswagen',
          model: 'Golf',
          year: 2019,
          engine: '1.4 TSI',
          category: 'SPARK_PLUGS',
          intervalKm: 30000,
          intervalMonths: 24,
          sourceCitation: '[FIXTURE DEMO] Pauta de demostración para taller (sin documento OEM adjunto)',
        },
        {
          id: DEMO_IDS.RULE_TOYOTA_OIL,
          make: 'Toyota',
          model: 'Corolla',
          year: 2022,
          engine: '2.0 Dynamic Force',
          category: 'OIL_AND_FILTER',
          intervalKm: 10000,
          intervalMonths: 12,
          sourceCitation: '[FIXTURE DEMO] Pauta de demostración para taller (sin documento OEM adjunto)',
        },
        {
          id: DEMO_IDS.RULE_TOYOTA_BRAKES,
          make: 'Toyota',
          model: 'Corolla',
          year: 2022,
          engine: '2.0 Dynamic Force',
          category: 'BRAKES',
          intervalKm: 30000,
          intervalMonths: 24,
          sourceCitation: '[FIXTURE DEMO] Pauta de demostración para taller (sin documento OEM adjunto)',
        },
        {
          id: DEMO_IDS.RULE_FORD_OIL,
          make: 'Ford',
          model: 'Ranger',
          year: 2020,
          engine: '3.2 TDCi',
          category: 'OIL_AND_FILTER',
          intervalKm: 10000,
          intervalMonths: 12,
          sourceCitation: '[FIXTURE DEMO] Pauta de demostración para taller (sin documento OEM adjunto)',
        },
      ])
      .onConflictDoNothing();

    // 7. Work Orders
    // 7a. Completed in VW Golf at 45,000 km
    await this.db
      .insert(workOrders)
      .values({
        id: DEMO_IDS.WO_VW_GOLF_45K,
        workshopId: DEMO_IDS.WORKSHOP_ALPHA,
        vehicleId: DEMO_IDS.VEHICLE_VW_GOLF,
        customerId: DEMO_IDS.CUSTOMER_DEMO_VIP,
        assignedMechanicId: DEMO_IDS.USER_MARIO,
        reportedMileage: 45000,
        status: 'COMPLETED',
        reportedIssue: 'Service programado de los 45.000 km y chequeo general antes de viaje.',
        diagnosis: 'Estado general óptimo. Batería en 85% de vida útil. Neumáticos con 5.5mm de dibujo.',
        internalNotes: 'Cliente VIP satisfecho. Próximo service recomendado a los 60.000 km.',
        partsCost: '85000.00',
        laborCost: '35000.00',
        version: 2,
        closedAt: new Date('2025-11-20T16:00:00Z'),
      })
      .onConflictDoNothing();

    await this.db
      .insert(workOrderItems)
      .values([
        {
          id: '40000000-0000-4000-8000-000000000001',
          workOrderId: DEMO_IDS.WO_VW_GOLF_45K,
          title: 'Aceite Sintético Motul 5W40',
          category: 'OIL_AND_FILTER',
          description: 'Aceite Sintético Motul X-cess 5W40 (4.5 L)',
          cost: '55000.00',
          isApproved: true,
        },
        {
          id: '40000000-0000-4000-8000-000000000002',
          workOrderId: DEMO_IDS.WO_VW_GOLF_45K,
          title: 'Filtro de Aceite Mann',
          category: 'FILTERS',
          description: 'Filtro de Aceite Blindado Mann W712/95',
          cost: '18000.00',
          isApproved: true,
        },
        {
          id: '40000000-0000-4000-8000-000000000003',
          workOrderId: DEMO_IDS.WO_VW_GOLF_45K,
          title: 'Mano de obra service y escaneo OBD2',
          category: 'LABOR',
          description: 'Mano de obra service y escaneo computarizado OBD2',
          cost: '47000.00',
          isApproved: true,
        },
      ])
      .onConflictDoNothing();

    await this.db
      .insert(maintenanceRecords)
      .values({
        id: DEMO_IDS.REC_VW_GOLF_45K,
        vehicleId: DEMO_IDS.VEHICLE_VW_GOLF,
        workOrderId: DEMO_IDS.WO_VW_GOLF_45K,
        performingWorkshopId: DEMO_IDS.WORKSHOP_ALPHA,
        performingWorkshopName: 'Alpha Motors Garage',
        serviceDate: new Date('2025-11-20T16:00:00Z'),
        recordedMileage: 45000,
        verificationLevel: 'CORROBORATED',
        isCertified: true,
        interventions: [
          { title: 'Aceite Sintético Motul 5W40', category: 'Lubricación' },
          { title: 'Filtro de Aceite Mann Original', category: 'Filtros' },
          { title: 'Escaneo Electrónico OBD2', category: 'Diagnóstico' },
        ],
        internalNotes: 'Cliente satisfecho. Próximo service recomendado a los 60.000 km.',
        partsCost: '85000.00',
        laborCost: '35000.00',
      })
      .onConflictDoNothing();

    // 7b. Completed in Toyota Corolla at 30,000 km
    await this.db
      .insert(workOrders)
      .values({
        id: DEMO_IDS.WO_TOYOTA_30K,
        workshopId: DEMO_IDS.WORKSHOP_ALPHA,
        vehicleId: DEMO_IDS.VEHICLE_TOYOTA_COROLLA,
        customerId: DEMO_IDS.CUSTOMER_CARLA,
        assignedMechanicId: DEMO_IDS.USER_LUCAS,
        reportedMileage: 30000,
        status: 'COMPLETED',
        reportedIssue: 'Service programado 30.000 km y vibración al frenar.',
        diagnosis: 'Discos con alabeo térmico leve rectificados. Pastillas cambiadas.',
        internalNotes: 'Frenado suave comprobado en prueba de ruta.',
        partsCost: '95000.00',
        laborCost: '45000.00',
        version: 2,
        closedAt: new Date('2026-05-10T14:30:00Z'),
      })
      .onConflictDoNothing();

    await this.db
      .insert(maintenanceRecords)
      .values({
        id: DEMO_IDS.REC_TOYOTA_30K,
        vehicleId: DEMO_IDS.VEHICLE_TOYOTA_COROLLA,
        workOrderId: DEMO_IDS.WO_TOYOTA_30K,
        performingWorkshopId: DEMO_IDS.WORKSHOP_ALPHA,
        performingWorkshopName: 'Alpha Motors Garage',
        serviceDate: new Date('2026-05-10T14:30:00Z'),
        recordedMileage: 30000,
        verificationLevel: 'CORROBORATED',
        isCertified: true,
        interventions: [
          { title: 'Aceite Genuino Toyota 0W20', category: 'Lubricación' },
          { title: 'Pastillas de Freno Cerámicas Frasle', category: 'Frenos' },
        ],
        internalNotes: 'Rectificación de discos realizada en tornería aliada.',
        partsCost: '95000.00',
        laborCost: '45000.00',
      })
      .onConflictDoNothing();

    // 7c. Open Work Order in Ford Ranger
    await this.db
      .insert(workOrders)
      .values({
        id: DEMO_IDS.WO_RANGER_92K,
        workshopId: DEMO_IDS.WORKSHOP_ALPHA,
        vehicleId: DEMO_IDS.VEHICLE_FORD_RANGER,
        customerId: DEMO_IDS.CUSTOMER_ESTEBAN,
        assignedMechanicId: DEMO_IDS.USER_MARIO,
        reportedMileage: 92000,
        status: 'IN_PROGRESS',
        reportedIssue: 'Ruido metálico en tren delantero al pasar badenes y service 90k.',
        diagnosis: 'Bieletas de barra estabilizadora con juego excesivo. Repuestos solicitados.',
        version: 1,
      })
      .onConflictDoNothing();

    await this.db
      .insert(workOrderItems)
      .values([
        {
          id: '40000000-0000-4000-8000-000000000004',
          workOrderId: DEMO_IDS.WO_RANGER_92K,
          title: 'Cambio de bieletas delanteras',
          category: 'SUSPENSION',
          description: 'Reemplazo de bieletas de barra estabilizadora',
          cost: '45000.00',
          isApproved: true,
        },
        {
          id: '40000000-0000-4000-8000-000000000005',
          workOrderId: DEMO_IDS.WO_RANGER_92K,
          title: 'Service Aceite y Filtro Diésel',
          category: 'OIL_AND_FILTER',
          description: 'Aceite 5W30 Sintético y Filtro de combustible',
          cost: '65000.00',
          isApproved: true,
        },
      ])
      .onConflictDoNothing();

    // 7d. Open Work Order in Peugeot 208
    await this.db
      .insert(workOrders)
      .values({
        id: DEMO_IDS.WO_PEUGEOT_41K,
        workshopId: DEMO_IDS.WORKSHOP_ALPHA,
        vehicleId: DEMO_IDS.VEHICLE_PEUGEOT_208,
        customerId: DEMO_IDS.CUSTOMER_CARLA,
        assignedMechanicId: DEMO_IDS.USER_LUCAS,
        reportedMileage: 41200,
        status: 'OPEN',
        reportedIssue: 'Luz de Check Engine encendida intermitente. Pérdida de potencia en 3ra.',
        diagnosis: 'Pendiente de escaneo OBD2 detallado.',
        version: 1,
      })
      .onConflictDoNothing();

    // 7e. Owner Portal Demo Records for Renault Logan 1.6 2020 (1 Workshop Certified + 1 Owner Declared)
    await this.db
      .insert(maintenanceRecords)
      .values([
        {
          id: DEMO_IDS.REC_LOGAN_30K_CERTIFIED,
          vehicleId: DEMO_IDS.VEHICLE_RENAULT_LOGAN_OWNER,
          performingWorkshopId: DEMO_IDS.WORKSHOP_ALPHA,
          performingWorkshopName: 'Alpha Motors Garage (Red Certificada)',
          recordOrigin: 'WORKSHOP_CERTIFIED',
          serviceDate: new Date('2025-02-15T11:00:00Z'),
          recordedMileage: 30000,
          verificationLevel: 'IDENTIFIED_WORKSHOP',
          isCertified: true,
          criteriaMet: ['Work performed and signed by verified Automotors registered workshop'],
          interventions: [
            {
              title: 'Service Oficial 30.000 km: Aceite y Filtro + Revisión de Frenos',
              category: 'OIL_AND_FILTER',
              description: 'Cambio de aceite sintético 5W40, filtro de aceite original y control de pastillas delanteras.',
            },
            {
              title: 'Inspección y regulación de sistema de frenos',
              category: 'BRAKES',
              description: 'Limpieza de campanas traseras y verificación de pastillas delanteras (70% restante).',
            },
          ],
          internalNotes: 'Service de los 30.000 km completado según plan Renault.',
          partsCost: '62000.00',
          laborCost: '28000.00',
        },
        {
          id: DEMO_IDS.REC_LOGAN_40K_OWNER,
          vehicleId: DEMO_IDS.VEHICLE_RENAULT_LOGAN_OWNER,
          performingWorkshopId: null,
          performingWorkshopName: 'Lubricentro Belgrano (Declaración del Propietario)',
          recordedByUserId: DEMO_IDS.USER_OWNER_VALERIA,
          recordOrigin: 'OWNER_DECLARED',
          serviceDate: new Date('2026-01-20T10:30:00Z'),
          recordedMileage: 40200,
          verificationLevel: 'DECLARED',
          isCertified: false,
          criteriaMet: ['Self-declared by owner without external workshop verification'],
          interventions: [
            {
              title: 'Cambio de Aceite Sintético y Filtros de Aire / Habitáculo',
              category: 'OIL_AND_FILTER',
              description: 'Cambio preventivo a los 40.200 km con aceite Elf Evolution 5W40 y filtros.',
            },
            {
              title: 'Reemplazo de Filtro de Aire y Polen',
              category: 'AIR_AND_CABIN_FILTERS',
              description: 'Filtro de admisión y habitáculo nuevos.',
            },
          ],
          internalNotes: 'Realizado antes de viaje a la costa. Conservo comprobante en guantera.',
          partsCost: '74000.00',
          laborCost: '0.00',
        },
      ])
      .onConflictDoNothing();

    return {
      workshopsCount: 2,
      usersCount: 4,
      customersCount: 3,
      vehiclesCount: 6,
      workOrdersCount: 4,
      maintenanceRecordsCount: 4,
      intervalsCount: 10,
      kbConfigurationsCount: 3,
    };
  }
}
