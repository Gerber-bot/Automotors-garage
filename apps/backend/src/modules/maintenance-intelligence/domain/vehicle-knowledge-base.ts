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
        title: 'Cambio de Aceite y Filtro (En Revisión Documental)',
        intervalKm: 10000,
        intervalMonths: 12,
        source: IntervalSource.GENERIC_INDUSTRY,
        sourceCitation: 'Pendiente de verificación documental contra manual oficial Renault Argentina',
        severeUsageIntervalKm: 7500,
        severeUsageIntervalMonths: 6,
        verificationStatus: 'PENDING_VERIFICATION',
      },
      {
        id: 'kb-renault-logan-filters',
        category: ServiceCategory.AIR_AND_CABIN_FILTERS,
        title: 'Reemplazo de Filtro de Aire y Habitáculo (En Revisión Documental)',
        intervalKm: 10000,
        intervalMonths: 12,
        source: IntervalSource.GENERIC_INDUSTRY,
        sourceCitation: 'Pendiente de verificación documental contra manual oficial Renault Argentina',
        verificationStatus: 'PENDING_VERIFICATION',
      },
      {
        id: 'kb-renault-logan-brakes',
        category: ServiceCategory.BRAKES,
        title: 'Control de Frenos y Fluido DOT 4 (En Revisión Documental)',
        intervalKm: 30000,
        intervalMonths: 24,
        source: IntervalSource.GENERIC_INDUSTRY,
        sourceCitation: 'Pendiente de verificación documental contra manual oficial Renault Argentina',
        verificationStatus: 'PENDING_VERIFICATION',
      },
      {
        id: 'kb-renault-logan-sparks',
        category: ServiceCategory.SPARK_PLUGS,
        title: 'Reemplazo de Juego de Bujías (En Revisión Documental)',
        intervalKm: 40000,
        intervalMonths: 36,
        source: IntervalSource.GENERIC_INDUSTRY,
        sourceCitation: 'Pendiente de verificación documental contra manual oficial Renault Argentina',
        verificationStatus: 'PENDING_VERIFICATION',
      },
      {
        id: 'kb-renault-logan-coolant',
        category: ServiceCategory.COOLANT,
        title: 'Renovación de Líquido Refrigerante (En Revisión Documental)',
        intervalKm: 60000,
        intervalMonths: 48,
        source: IntervalSource.GENERIC_INDUSTRY,
        sourceCitation: 'Pendiente de verificación documental contra manual oficial Renault Argentina',
        verificationStatus: 'PENDING_VERIFICATION',
      },
      {
        id: 'kb-renault-logan-inspection',
        category: ServiceCategory.GENERAL_INSPECTION,
        title: 'Inspección General Multipunto (En Revisión Documental)',
        intervalKm: 10000,
        intervalMonths: 12,
        source: IntervalSource.GENERIC_INDUSTRY,
        sourceCitation: 'Pendiente de verificación documental contra manual oficial Renault Argentina',
        verificationStatus: 'PENDING_VERIFICATION',
      },
      // Note: All Renault Logan 2020 intervals remain in PENDING_VERIFICATION and are excluded from
      // automatic verified calculations until backed by a primary official Renault Argentina document.
    ],
  },
  {
    profileId: 'vw-golf-vii-14-tsi',
    make: 'Volkswagen',
    modelPattern: 'Golf',
    yearFrom: 2015,
    yearTo: 2021,
    engine: '1.4 TSI (EA211)',
    exactEngineCodeStatus: 'PENDING_CONFIRMATION',
    exactEngineCodeNote: 'Familia EA211 1.4L TSI 150 CV — Pendiente de verificación documental.',
    transmission: 'Automática DSG 7 velocidades / Manual 6 velocidades',
    distributionType: 'CORREA',
    distributionNote:
      'Correa dentada en baño seco. Especificación pendiente de verificación documental primaria.',
    isProfileComplete: false,
    intervals: [
      {
        id: 'kb-vw-golf-oil',
        category: ServiceCategory.OIL_AND_FILTER,
        title: 'Cambio de Aceite Sintético y Filtro (En Revisión Documental)',
        intervalKm: 15000,
        intervalMonths: 12,
        source: IntervalSource.GENERIC_INDUSTRY,
        sourceCitation: 'Pendiente de verificación documental contra manual oficial Volkswagen',
        verificationStatus: 'PENDING_VERIFICATION',
      },
      {
        id: 'kb-vw-golf-filters',
        category: ServiceCategory.AIR_AND_CABIN_FILTERS,
        title: 'Filtro de Aire y Habitáculo (En Revisión Documental)',
        intervalKm: 15000,
        intervalMonths: 12,
        source: IntervalSource.GENERIC_INDUSTRY,
        sourceCitation: 'Pendiente de verificación documental contra manual oficial Volkswagen',
        verificationStatus: 'PENDING_VERIFICATION',
      },
      {
        id: 'kb-vw-golf-sparks',
        category: ServiceCategory.SPARK_PLUGS,
        title: 'Reemplazo de Bujías de Encendido (En Revisión Documental)',
        intervalKm: 30000,
        intervalMonths: 24,
        source: IntervalSource.GENERIC_INDUSTRY,
        sourceCitation: 'Pendiente de verificación documental contra manual oficial Volkswagen',
        verificationStatus: 'PENDING_VERIFICATION',
      },
      {
        id: 'kb-vw-golf-brakes',
        category: ServiceCategory.BRAKES,
        title: 'Inspección de Frenos y Líquido DOT 4 (En Revisión Documental)',
        intervalKm: 30000,
        intervalMonths: 24,
        source: IntervalSource.GENERIC_INDUSTRY,
        sourceCitation: 'Pendiente de verificación documental contra manual oficial Volkswagen',
        verificationStatus: 'PENDING_VERIFICATION',
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
