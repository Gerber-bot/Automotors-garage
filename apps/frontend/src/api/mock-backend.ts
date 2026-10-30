import type { Vehicle, WorkOrder } from './contracts.ts';

/**
 * NOTICE: [OFFLINE_DEVELOPMENT_MOCK]
 * This mock database is provided strictly for local offline UI preview
 * and component unit tests when the backend API is disconnected.
 */
export const IS_MOCK_FALLBACK = true;

export const MOCK_VEHICLES: Vehicle[] = [
  {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    plate: 'AF123CD',
    vin: '8AJBA25G000123456',
    make: 'Toyota',
    model: 'Corolla Hybrid',
    year: 2022,
    engine: '1.8L Hybrid (2ZR-FXE)',
    fuelType: 'HYBRID',
    currentMileage: 35000,
  },
  {
    id: 'b1ffcd88-8b1a-3de7-aa5c-5aa8ac270b22',
    plate: 'AE999ZZ',
    vin: '8AFFA11B000789012',
    make: 'Ford',
    model: 'Ranger 4x4',
    year: 2023,
    engine: '3.0L V6 Turbo Diesel',
    fuelType: 'DIESEL',
    currentMileage: 48500,
  },
  {
    id: 'c2eebc77-7c2c-2ce6-994b-4bb7ab160c33',
    plate: 'AC456XY',
    vin: 'WAUZZZF4000345678',
    make: 'Audi',
    model: 'A4 Sedan',
    year: 2021,
    engine: '2.0L TFSI',
    fuelType: 'GASOLINE',
    currentMileage: 62000,
  },
];

export const MOCK_WORK_ORDERS: WorkOrder[] = [
  {
    id: 'wo-101-uuid',
    tenantId: 'workshop-alpha',
    workshopName: 'Alpha Motors Garage',
    vehicleId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    customerId: 'cust-1-uuid',
    reportedMileage: 35000,
    reportedIssue: 'Scheduled 30,000 km preventive inspection.',
    diagnosis: 'Brake pads worn to 20%, synthetic oil service performed.',
    status: 'COMPLETED',
    interventions: [
      {
        id: 'int-1',
        title: 'Synthetic Oil & Filter Replacement',
        category: 'Engine Maintenance',
        description: 'Replaced 0W20 synthetic engine oil and OEM filter cartridge.',
      },
      {
        id: 'int-2',
        title: 'Front Ceramic Brake Pads',
        category: 'Braking System',
        description: 'Installed ceramic brake pads and cleaned caliper pins.',
      },
    ],
    evidenceAssetIds: ['sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
    closedAt: '2026-06-15T14:30:00Z',
  },
  {
    id: 'wo-102-uuid',
    tenantId: 'workshop-alpha',
    workshopName: 'Alpha Motors Garage',
    vehicleId: 'b1ffcd88-8b1a-3de7-aa5c-5aa8ac270b22',
    customerId: 'cust-2-uuid',
    reportedMileage: 48500,
    reportedIssue: 'Slight turbo lag under heavy acceleration.',
    diagnosis: 'Intercooler hose clamp slightly loose; boost pressure sensor cleaned.',
    status: 'IN_PROGRESS',
    interventions: [
      {
        id: 'int-3',
        title: 'Turbocharger Hose Inspection & Tightening',
        category: 'Powertrain',
        description: 'Inspected silicone boots and retorqued T-bolt clamps.',
      },
    ],
    evidenceAssetIds: [],
  },
];
