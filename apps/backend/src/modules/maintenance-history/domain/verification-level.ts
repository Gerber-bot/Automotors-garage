export const VerificationLevel = {
  DECLARED: 'DECLARED',                       // Self-reported by customer, zero documentary proof
  DOCUMENTED: 'DOCUMENTED',                   // Supported by uploaded invoice/receipt from unregistered shop
  IDENTIFIED_WORKSHOP: 'IDENTIFIED_WORKSHOP', // Executed by a verified registered workshop in Automotors
  CORROBORATED: 'CORROBORATED',               // Executed by registered shop + cryptographic SHA-256 evidence
} as const;
export type VerificationLevel = (typeof VerificationLevel)[keyof typeof VerificationLevel];

export interface VerificationEvaluation {
  level: VerificationLevel;
  criteriaMet: readonly string[];
  isCertified: boolean; // Only IDENTIFIED_WORKSHOP or CORROBORATED are certified
}

export class VerificationLevelEvaluator {
  public static evaluate(params: {
    isRegisteredWorkshop: boolean;
    hasCryptographicEvidence: boolean;
    hasInvoiceDocument: boolean;
  }): VerificationEvaluation {
    // 1. Highest tier: Registered workshop with verified evidence vault assets
    if (params.isRegisteredWorkshop && params.hasCryptographicEvidence) {
      return {
        level: VerificationLevel.CORROBORATED,
        criteriaMet: [
          'Work performed by verified Automotors registered workshop',
          'Cryptographic SHA-256 photo/video evidence stored in immutable evidence vault',
        ],
        isCertified: true,
      };
    }

    // 2. Second tier: Registered workshop in platform
    if (params.isRegisteredWorkshop) {
      return {
        level: VerificationLevel.IDENTIFIED_WORKSHOP,
        criteriaMet: ['Work performed and signed by verified Automotors registered workshop'],
        isCertified: true,
      };
    }

    // 3. Third tier: External documented repair
    if (params.hasInvoiceDocument) {
      return {
        level: VerificationLevel.DOCUMENTED,
        criteriaMet: ['Supported by customer-provided external invoice document (unverified workshop)'],
        isCertified: false,
      };
    }

    // 4. Base tier: Unverified self-declaration
    return {
      level: VerificationLevel.DECLARED,
      criteriaMet: ['Self-declared by owner without external workshop verification'],
      isCertified: false,
    };
  }
}
