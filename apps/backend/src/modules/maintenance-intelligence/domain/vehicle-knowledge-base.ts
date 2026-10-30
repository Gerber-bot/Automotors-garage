import {
  IntervalSource,
  ServiceCategory,
  type ServiceIntervalRule,
} from './intervals.ts';

export const INSUFFICIENT_DATA_MESSAGE =
  'Necesitamos más información para estimar este mantenimiento';

export interface TechnicalVehicleProfile {
  readonly profileId: string;
  readonly make: string;
  readonly modelPattern: string;
  readonly yearFrom: number;
  readonly yearTo: number;
  readonly engine: string;
  readonly exactEngineCodeStatus: 'CONFIRMED' | 'PENDING_CONFIRMATION';
  readonly exactEngineCodeNote: string;
  readonly transmission: string;
  readonly distributionType: 'CADENA' | 'CORREA' | 'DESCONOCIDO';
  readonly distributionNote: string;
  readonly isProfileComplete: boolean;
  readonly intervals: readonly ServiceIntervalRule[];
}

export const OWNER_MAINTENANCE_CATEGORIES: ReadonlyArray<{
  readonly category: ServiceCategory;
  readonly label: string;
  readonly shortDescription: string;
}> = [
  {
    category: ServiceCategory.OIL_AND_FILTER,
    label: 'Aceite y Filtro de Motor',
    shortDescription: 'Lubricación primaria del motor y retención de partículas metálicas.',
  },
  {
    category: ServiceCategory.AIR_AND_CABIN_FILTERS,
    label: 'Filtros de Aire y Habitáculo',
    shortDescription: 'Admisión limpia al motor y filtrado de polen/polvo en cabina.',
  },
  {
    category: ServiceCategory.BRAKES,
    label: 'Sistema de Frenos (Pastillas / Discos / Líquido)',
    shortDescription: 'Control de espesor de pastillas, alabeo de discos e higroscopía del fluido DOT.',
  },
  {
    category: ServiceCategory.SPARK_PLUGS,
    label: 'Bujías de Encendido',
    shortDescription: 'Eficiencia de chispa en cámara de combustión y arranque en frío.',
  },
  {
    category: ServiceCategory.COOLANT,
    label: 'Líquido Refrigerante / Circuito Térmico',
    shortDescription: 'Protección anticorrosiva y estabilidad térmica del block y radiador.',
  },
  {
    category: ServiceCategory.TIMING_BELT,
    label: 'Sistema de Distribución (Cadena / Correa)',
    shortDescription: 'Sincronización mecánica entre cigüeñal y árbol de levas.',
  },
  {
    category: ServiceCategory.GENERAL_INSPECTION,
    label: 'Inspección Multipunto / Alineación y Batería',
    shortDescription: 'Revisión integral de tren delantero, neumáticos, batería y escaneo preventivo.',
  },
];

const TECHNICAL_PROFILES: readonly TechnicalVehicleProfile[] = [
  {
    profileId: 'renault-logan-16-2020-arg',
    make: 'Renault',
    modelPattern: 'Logan',
    yearFrom: 2016,
    yearTo: 2024,
    engine: '1.6 16v SCe',
    exactEngineCodeStatus: 'PENDING_CONFIRMATION',
    exactEngineCodeNote:
      'Motor probable H4M / HR16 — Código exacto pendiente de confirmación documental en cédula o block.',
    transmission: 'Manual (5 velocidades)',
    distributionType: 'CADENA',
    distributionNote:
      'Distribución por cadena metálica bañada en aceite (no utiliza correa dentada de caucho). Requiere control acústico de tensores y revisión de correa poli-V de accesorios.',
    isProfileComplete: false, // Incomplete because exact engine code is pending documentary confirmation
    intervals: [
      {
        id: 'kb-renault-logan-oil',
        category: ServiceCategory.OIL_AND_FILTER,
        title: 'Cambio de Aceite Sintético / Semisintético y Filtro',
        intervalKm: 10000,
        intervalMonths: 12,
        source: IntervalSource.OEM_MANUAL,
        sourceCitation: 'Manual de Mantenimiento Renault Argentina — Plan 10.000 km / 1 año',
        severeUsageIntervalKm: 7500,
        severeUsageIntervalMonths: 6,
      },
      {
        id: 'kb-renault-logan-filters',
        category: ServiceCategory.AIR_AND_CABIN_FILTERS,
        title: 'Reemplazo de Filtro de Aire de Admisión y Filtro de Habitáculo',
        intervalKm: 10000,
        intervalMonths: 12,
        source: IntervalSource.OEM_MANUAL,
        sourceCitation: 'Manual de Mantenimiento Renault Argentina — Sección Filtrado',
      },
      {
        id: 'kb-renault-logan-brakes',
        category: ServiceCategory.BRAKES,
        title: 'Control de Pastillas/Cintas Delanteras-Traseras y Fluido DOT 4',
        intervalKm: 30000,
        intervalMonths: 24,
        source: IntervalSource.OEM_MANUAL,
        sourceCitation: 'Guía Técnica de Seguridad Activa Renault — Sistema de Frenos',
      },
      {
        id: 'kb-renault-logan-sparks',
        category: ServiceCategory.SPARK_PLUGS,
        title: 'Reemplazo de Juego de Bujías de Encendido',
        intervalKm: 40000,
        intervalMonths: 36,
        source: IntervalSource.OEM_MANUAL,
        sourceCitation: 'Plan de Mantenimiento Renault 1.6 16v — Sistema de Encendido',
      },
      {
        id: 'kb-renault-logan-coolant',
        category: ServiceCategory.COOLANT,
        title: 'Renovación de Líquido Refrigerante Tipo D (Glaceol RX)',
        intervalKm: 60000,
        intervalMonths: 48,
        source: IntervalSource.OEM_MANUAL,
        sourceCitation: 'Especificación Técnica Renault Glaceol RX Type D',
      },
      {
        id: 'kb-renault-logan-inspection',
        category: ServiceCategory.GENERAL_INSPECTION,
        title: 'Inspección General Multipunto, Batería, Tren Delantero y Alineación',
        intervalKm: 10000,
        intervalMonths: 12,
        source: IntervalSource.OEM_MANUAL,
        sourceCitation: 'Protocolo de Revisión Anual Renault Minuto (25 puntos de control)',
      },
      // Note: TIMING_BELT is intentionally omitted from automatic replacement rules for chain-driven H4M/HR16
      // until exact engine code and accessory belt history are confirmed.
    ],
  },
  {
    profileId: 'vw-golf-vii-14-tsi',
    make: 'Volkswagen',
    modelPattern: 'Golf',
    yearFrom: 2015,
    yearTo: 2021,
    engine: '1.4 TSI (EA211)',
    exactEngineCodeStatus: 'CONFIRMED',
    exactEngineCodeNote: 'Familia EA211 1.4L TSI 150 CV confirmada.',
    transmission: 'Automática DSG 7 velocidades / Manual 6 velocidades',
    distributionType: 'CORREA',
    distributionNote:
      'Correa dentada de larga duración en baño seco con refuerzo de fibra de vidrio.',
    isProfileComplete: true,
    intervals: [
      {
        id: 'kb-vw-golf-oil',
        category: ServiceCategory.OIL_AND_FILTER,
        title: 'Cambio de Aceite Sintético Norma VW 502 00 / 504 00 y Filtro',
        intervalKm: 15000,
        intervalMonths: 12,
        source: IntervalSource.OEM_MANUAL,
        sourceCitation: 'Manual Plan de Mantenimiento VW Golf VII (pág. 24)',
      },
      {
        id: 'kb-vw-golf-filters',
        category: ServiceCategory.AIR_AND_CABIN_FILTERS,
        title: 'Filtro de Aire y Polen con Carbón Activado',
        intervalKm: 15000,
        intervalMonths: 12,
        source: IntervalSource.OEM_MANUAL,
        sourceCitation: 'Manual Oficial Volkswagen Service Plan Edición 2019',
      },
      {
        id: 'kb-vw-golf-sparks',
        category: ServiceCategory.SPARK_PLUGS,
        title: 'Reemplazo de Bujías de Encendido TSI',
        intervalKm: 30000,
        intervalMonths: 24,
        source: IntervalSource.OEM_MANUAL,
        sourceCitation: 'Manual Oficial Volkswagen Service Plan Edición 2019',
      },
      {
        id: 'kb-vw-golf-brakes',
        category: ServiceCategory.BRAKES,
        title: 'Inspección de Pastillas/Discos y Cambio de Líquido de Frenos DOT 4',
        intervalKm: 30000,
        intervalMonths: 24,
        source: IntervalSource.OEM_MANUAL,
        sourceCitation: 'Plan de Mantenimiento Volkswagen — Sistema Hidráulico de Frenos',
      },
    ],
  },
];

export class VehicleKnowledgeBase {
  /**
   * Resolves a technical profile from make/model/year/engine without inventing unverified data.
   */
  public static findProfile(params: {
    make: string;
    model: string;
    year: number;
    engine?: string;
    technicalSpecs?: Record<string, unknown>;
  }): TechnicalVehicleProfile | null {
    const normalizedMake = params.make.trim().toLowerCase();
    const normalizedModel = params.model.trim().toLowerCase();

    for (const profile of TECHNICAL_PROFILES) {
      if (
        normalizedMake.includes(profile.make.toLowerCase()) &&
        normalizedModel.includes(profile.modelPattern.toLowerCase()) &&
        params.year >= profile.yearFrom &&
        params.year <= profile.yearTo
      ) {
        return profile;
      }
    }

    return null;
  }

  /**
   * Normalizes free-form or UI category inputs into canonical ServiceCategory enum values.
   */
  public static normalizeCategory(raw: string): ServiceCategory {
    const upper = raw.trim().toUpperCase();
    if (upper in ServiceCategory) {
      return upper as ServiceCategory;
    }
    if (upper.includes('ACEITE') || upper.includes('LUBRIC') || upper.includes('OIL')) {
      return ServiceCategory.OIL_AND_FILTER;
    }
    if (upper.includes('AIRE') || upper.includes('HABIT') || upper.includes('CABIN') || upper.includes('FILTRO')) {
      return ServiceCategory.AIR_AND_CABIN_FILTERS;
    }
    if (upper.includes('FRENO') || upper.includes('PASTILLA') || upper.includes('DISCO') || upper.includes('BRAKE')) {
      return ServiceCategory.BRAKES;
    }
    if (upper.includes('BUJ') || upper.includes('ENCENDIDO') || upper.includes('SPARK')) {
      return ServiceCategory.SPARK_PLUGS;
    }
    if (upper.includes('REFRIG') || upper.includes('AGUA') || upper.includes('COOLANT')) {
      return ServiceCategory.COOLANT;
    }
    if (upper.includes('DISTRIB') || upper.includes('CORREA') || upper.includes('CADENA') || upper.includes('TIMING')) {
      return ServiceCategory.TIMING_BELT;
    }
    if (upper.includes('TRANSMIS') || upper.includes('CAJA')) {
      return ServiceCategory.TRANSMISSION_FLUID;
    }
    return ServiceCategory.GENERAL_INSPECTION;
  }
}
