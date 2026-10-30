import type {
  KbConfigurationRecord,
  PostgresKnowledgeBaseRepository,
} from '@automotors/database';

export const TechnicalMatchStatus = {
  EXACT_MATCH: 'EXACT_MATCH',
  POSSIBLE_MATCH: 'POSSIBLE_MATCH',
  AMBIGUOUS: 'AMBIGUOUS',
  NO_MATCH: 'NO_MATCH',
  INSUFFICIENT_DATA: 'INSUFFICIENT_DATA',
} as const;

export type TechnicalMatchStatus =
  (typeof TechnicalMatchStatus)[keyof typeof TechnicalMatchStatus];

export interface TechnicalIdentificationInput {
  make: string;
  model: string;
  year: number;
  engine?: string;
  fuelType?: string;
  transmission?: string;
  userDeclaredDistribution?: 'CADENA' | 'CORREA' | 'DESCONOCIDO';
  userDeclaredEngineCode?: string;
}

export interface TechnicalIdentificationResult {
  status: TechnicalMatchStatus;
  matchedConfiguration: KbConfigurationRecord | null;
  candidateConfigurations: readonly KbConfigurationRecord[];
  reason: string;
  requiresConfirmation: boolean;
  isDocumentarilyVerified: boolean;
  distributionType: 'CADENA' | 'CORREA' | 'DESCONOCIDO';
  exactEngineCodeStatus: 'CONFIRMED' | 'PENDING_CONFIRMATION';
  technicalNotes?: string;
}

export class TechnicalIdentificationEngine {
  private readonly kbRepo: PostgresKnowledgeBaseRepository;

  constructor(kbRepo: PostgresKnowledgeBaseRepository) {
    this.kbRepo = kbRepo;
  }

  public async identify(
    input: TechnicalIdentificationInput
  ): Promise<TechnicalIdentificationResult> {
    // 1. Guard against incomplete basic inputs
    if (!input.make?.trim() || !input.model?.trim() || !input.year || input.year <= 1900) {
      return {
        status: TechnicalMatchStatus.INSUFFICIENT_DATA,
        matchedConfiguration: null,
        candidateConfigurations: [],
        reason: 'Se requieren Marca, Modelo y Año de fabricación válidos para identificar la configuración.',
        requiresConfirmation: false,
        isDocumentarilyVerified: false,
        distributionType: 'DESCONOCIDO',
        exactEngineCodeStatus: 'PENDING_CONFIRMATION',
      };
    }

    // 2. Query configurations matching make, model, year
    const configs = await this.kbRepo.searchConfigurations({
      make: input.make,
      model: input.model,
      year: input.year,
    });

    if (configs.length === 0) {
      return {
        status: TechnicalMatchStatus.NO_MATCH,
        matchedConfiguration: null,
        candidateConfigurations: [],
        reason: `No se encontraron perfiles técnicos homologados en la base de datos para ${input.make} ${input.model} (${input.year}).`,
        requiresConfirmation: false,
        isDocumentarilyVerified: false,
        distributionType: input.userDeclaredDistribution ?? 'DESCONOCIDO',
        exactEngineCodeStatus: 'PENDING_CONFIRMATION',
      };
    }

    // 3. Exactly 1 configuration found
    if (configs.length === 1) {
      const cfg = configs[0]!;
      const powertrain = cfg.powertrain;
      const timing = (powertrain?.timingMechanism as 'CADENA' | 'CORREA') ?? 'DESCONOCIDO';
      const isVerified = cfg.verificationStatus === 'VERIFIED';

      // If user specified an engine code or displacement, verify compatibility
      if (input.engine?.trim()) {
        const normEngine = input.engine.toLowerCase();
        const cfgEngineCode = (powertrain?.engineCode ?? '').toLowerCase();
        const cfgFamily = (powertrain?.family ?? '').toLowerCase();
        const cfgDisp = (powertrain?.displacementLiters ?? '').toLowerCase();

        const engineMatches =
          cfgEngineCode.includes(normEngine) ||
          normEngine.includes(cfgEngineCode) ||
          cfgFamily.includes(normEngine) ||
          (cfgDisp && normEngine.includes(cfgDisp));

        if (!engineMatches) {
          return {
            status: TechnicalMatchStatus.POSSIBLE_MATCH,
            matchedConfiguration: cfg,
            candidateConfigurations: [cfg],
            reason: `Existe una única configuración para este modelo (${cfg.commercialName}), pero la motorización declarada '${input.engine}' difiere o requiere verificación.`,
            requiresConfirmation: true,
            isDocumentarilyVerified: false,
            distributionType: timing,
            exactEngineCodeStatus: 'PENDING_CONFIRMATION',
          };
        }
      }

      return {
        status: TechnicalMatchStatus.EXACT_MATCH,
        matchedConfiguration: cfg,
        candidateConfigurations: [cfg],
        reason: `Configuración técnica identificada unívocamente: ${cfg.commercialName}.`,
        requiresConfirmation: false,
        isDocumentarilyVerified: isVerified,
        distributionType: timing,
        exactEngineCodeStatus: isVerified ? 'CONFIRMED' : 'PENDING_CONFIRMATION',
      };
    }

    // 4. Multiple candidate configurations found -> Disambiguation Analysis
    // Filter by engineCode or displacement if provided
    const filtered = [...configs];

    if (input.userDeclaredEngineCode?.trim()) {
      const code = input.userDeclaredEngineCode.trim().toLowerCase();
      const codeMatches = filtered.filter(
        (c) => c.powertrain?.engineCode?.toLowerCase() === code
      );
      if (codeMatches.length === 1) {
        const matched = codeMatches[0]!;
        const timing = (matched.powertrain?.timingMechanism as 'CADENA' | 'CORREA') ?? 'DESCONOCIDO';
          return {
            status: TechnicalMatchStatus.EXACT_MATCH,
            matchedConfiguration: matched,
            candidateConfigurations: [matched],
            reason: `Coincidencia exacta por código de motor: ${matched.commercialName} (Motor ${matched.powertrain?.engineCode}).`,
            requiresConfirmation: false,
            isDocumentarilyVerified: matched.verificationStatus === 'VERIFIED',
            distributionType: timing,
            exactEngineCodeStatus:
              matched.verificationStatus === 'VERIFIED' ? 'CONFIRMED' : 'PENDING_CONFIRMATION',
          };
      }
    }

    // Filter by user declared distribution (e.g. user declares "CADENA" for Renault Logan 1.6)
    if (input.userDeclaredDistribution && input.userDeclaredDistribution !== 'DESCONOCIDO') {
      const distMatches = filtered.filter(
        (c) => c.powertrain?.timingMechanism === input.userDeclaredDistribution
      );
      if (distMatches.length === 1) {
        const matched = distMatches[0]!;
        return {
          status: TechnicalMatchStatus.POSSIBLE_MATCH,
          matchedConfiguration: matched,
          candidateConfigurations: distMatches,
          reason: `Configuración preseleccionada conforme a distribución por ${input.userDeclaredDistribution} declarada por el usuario (${matched.commercialName}). Pendiente de confirmación documental del código de motor.`,
          requiresConfirmation: true,
          isDocumentarilyVerified: false,
          distributionType: input.userDeclaredDistribution,
          exactEngineCodeStatus: 'PENDING_CONFIRMATION',
          technicalNotes:
            'La distribución coincide con la declaración del propietario, pero el código exacto de motorización debe verificarse en el vano motor o cédula.',
        };
      }
    }

    // If ambiguous (e.g. Renault Logan with both H4M 16v Cadena and K7M 8v Correa options)
    const candidateSummary = configs
      .map(
        (c) =>
          `${c.commercialName} [Motor: ${c.powertrain?.engineCode ?? 'N/A'}, Distribución: ${c.powertrain?.timingMechanism ?? 'N/A'}]`
      )
      .join(' | ');

    return {
      status: TechnicalMatchStatus.AMBIGUOUS,
      matchedConfiguration: null,
      candidateConfigurations: configs,
      reason: `Existen múltiples variantes mecánicas homologadas para ${input.make} ${input.model} (${input.year}). Se requiere que el usuario o taller seleccione la motorización correspondiente: ${candidateSummary}`,
      requiresConfirmation: true,
      isDocumentarilyVerified: false,
      distributionType: input.userDeclaredDistribution ?? 'DESCONOCIDO',
      exactEngineCodeStatus: 'PENDING_CONFIRMATION',
      technicalNotes:
        'Diferencias críticas en el sistema de distribución (cadena vs correa) entre motorizaciones compatibles.',
    };
  }
}
