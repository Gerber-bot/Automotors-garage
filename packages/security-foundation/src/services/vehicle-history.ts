export interface ServiceRecord {
  readonly id: string;
  readonly vehicleVin: string;
  readonly performingTenantId: string;
  readonly performingWorkshopName: string;
  readonly serviceDate: string;
  readonly recordedMileage: number;
  readonly serviceType: string;
  readonly isVerified: boolean;

  // Private Workshop Data (Only visible to performing tenant)
  readonly internalMechanicNotes: string;
  readonly partsCost: number;
  readonly laborCost: number;
  readonly internalProfitMargin: number;

  // Private Customer Data (Only visible to performing tenant & vehicle owner)
  readonly customerName: string;
  readonly customerPhone: string;
}

export interface SanitizedPublicPassportEntry {
  readonly date: string;
  readonly recordedMileage: number;
  readonly serviceType: string;
  readonly workshopName: string;
  readonly isVerified: boolean;
}

export interface WorkshopViewPassportEntry {
  readonly recordId: string;
  readonly date: string;
  readonly recordedMileage: number;
  readonly serviceType: string;
  readonly workshopName: string;
  readonly isVerified: boolean;
  readonly isOwnRecord: boolean;

  // Included ONLY if isOwnRecord is true
  readonly internalNotes?: string;
  readonly financialDetails?: {
    partsCost: number;
    laborCost: number;
  };
}

export class VehicleHistoryPrivacyService {
  /**
   * Sanitizes service records for public view (e.g. QR code vehicle passport).
   * Strips all PII, costs, profit margins, and internal notes.
   */
  public sanitizeForPublicView(records: readonly ServiceRecord[]): readonly SanitizedPublicPassportEntry[] {
    return records.map((r) => ({
      date: r.serviceDate,
      recordedMileage: r.recordedMileage,
      serviceType: r.serviceType,
      workshopName: r.performingWorkshopName,
      isVerified: r.isVerified,
    }));
  }

  /**
   * Partitions service records for viewing by a specific workshop.
   * If record was performed by another workshop, internal notes and financials are completely redacted.
   */
  public sanitizeForWorkshopView(
    records: readonly ServiceRecord[],
    currentTenantId: string
  ): readonly WorkshopViewPassportEntry[] {
    return records.map((r) => {
      const isOwnRecord = r.performingTenantId === currentTenantId;

      if (isOwnRecord) {
        return {
          recordId: r.id,
          date: r.serviceDate,
          recordedMileage: r.recordedMileage,
          serviceType: r.serviceType,
          workshopName: r.performingWorkshopName,
          isVerified: r.isVerified,
          isOwnRecord: true,
          internalNotes: r.internalMechanicNotes,
          financialDetails: {
            partsCost: r.partsCost,
            laborCost: r.laborCost,
          },
        };
      }

      // External workshop record: redact confidential business data
      return {
        recordId: r.id,
        date: r.serviceDate,
        recordedMileage: r.recordedMileage,
        serviceType: r.serviceType,
        workshopName: r.performingWorkshopName,
        isVerified: r.isVerified,
        isOwnRecord: false,
      };
    });
  }
}
