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
}

// Deterministic UUIDs for demo
export const DEMO_IDS = {
  WORKSHOP_ALPHA: 'a0000000-0000-4000-8000-000000000001',
  WORKSHOP_BETA: 'a0000000-0000-4000-8000-000000000002',
  USER_MARIO: 'b0000000-0000-4000-8000-000000000001',
  USER_LUCAS: 'b0000000-0000-4000-8000-000000000002',
  USER_BETA_CARLOS: 'b0000000-0000-4000-8000-000000000003',
  CUSTOMER_DEMO_VIP: 'c0000000-0000-4000-8000-000000000001',
  CUSTOMER_CARLA: 'c0000000-0000-4000-8000-000000000002',
  CUSTOMER_ESTEBAN: 'c0000000-0000-4000-8000-000000000003',
  VEHICLE_VW_GOLF: 'd0000000-0000-4000-8000-000000000001',
  VEHICLE_TOYOTA_COROLLA: 'd0000000-0000-4000-8000-000000000002',
  VEHICLE_FORD_RANGER: 'd0000000-0000-4000-8000-000000000003',
  VEHICLE_PEUGEOT_208: 'd0000000-0000-4000-8000-000000000004',
  VEHICLE_HONDA_CIVIC: 'd0000000-0000-4000-8000-000000000005',
  WO_VW_GOLF_45K: 'e0000000-0000-4000-8000-000000000001',
  WO_TOYOTA_30K: 'e0000000-0000-4000-8000-000000000002',
  WO_RANGER_92K: 'e0000000-0000-4000-8000-000000000003',
  WO_PEUGEOT_41K: 'e0000000-0000-4000-8000-000000000004',
  REC_VW_GOLF_45K: '10000000-0000-4000-8000-000000000001',
  REC_TOYOTA_30K: '10000000-0000-4000-8000-000000000002',
  RULE_VW_OIL: '20000000-0000-4000-8000-000000000001',
  RULE_VW_SPARK: '20000000-0000-4000-8000-000000000002',
  RULE_TOYOTA_OIL: '20000000-0000-4000-8000-000000000003',
  RULE_TOYOTA_BRAKES: '20000000-0000-4000-8000-000000000004',
  RULE_FORD_OIL: '20000000-0000-4000-8000-000000000005',
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

    // 6. Maintenance Intervals Documented
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
          sourceCitation: 'Manual Plan de Mantenimiento VW Golf VII (pág. 24)',
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
          sourceCitation: 'Manual Oficial Volkswagen Service Plan Edición 2019',
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
          sourceCitation: 'Manual de Propietario Toyota Corolla 2022 (pág. 142)',
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
          sourceCitation: 'Manual de Mantenimiento Toyota Motor Corporation (pág. 150)',
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
          sourceCitation: 'Guía de Mantenimiento Programado Ford Ranger (pág. 68)',
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

    return {
      workshopsCount: 2,
      usersCount: 3,
      customersCount: 3,
      vehiclesCount: 5,
      workOrdersCount: 4,
      maintenanceRecordsCount: 2,
      intervalsCount: 5,
    };
  }
}
