export type ObdProtocol =
  | 'AUTO'
  | 'ISO_15765_4_CAN_11BIT_500K'
  | 'ISO_15765_4_CAN_29BIT_500K'
  | 'ISO_15765_4_CAN_11BIT_250K'
  | 'ISO_15765_4_CAN_29BIT_250K'
  | 'ISO_14230_4_KWP_FAST'
  | 'ISO_9141_2'
  | 'UNKNOWN';

export interface ObdSensorReading {
  rpm: number;
  speed: number; // km/h
  coolantTemp: number; // °C
  engineLoad: number; // %
  throttlePosition: number; // %
  intakeAirTemp: number; // °C
  adapterVoltage: number; // V
  milStatus: boolean; // Check Engine Light (true = ON)
  dtcCount: number;
  vin?: string;
  supportedPids: readonly string[];
}

export type DtcSystem = 'POWERTRAIN' | 'CHASSIS' | 'BODY' | 'NETWORK';
export type DtcSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ObdDtcCode {
  code: string; // e.g. "P0300"
  system: DtcSystem;
  description: string;
  severity: DtcSeverity;
  possibleCauses: readonly string[];
  recommendedChecks: readonly string[];
  isPending?: boolean;
}

export interface ObdTelemetrySnapshot {
  timestamp: string;
  isSimulated: boolean;
  adapterIdentifier: string;
  protocol: ObdProtocol;
  sensors: ObdSensorReading;
  dtcCodes: readonly ObdDtcCode[];
}

export interface DiagnosticRecord {
  id: string;
  vehicleId: string;
  workshopId: string;
  technicianId?: string;
  recordedAt: string;
  origin: 'SIMULATED' | 'USB_SERIAL_ELM327' | 'BLUETOOTH_ELM327';
  telemetry: ObdTelemetrySnapshot;
  technicianNotes?: string;
  isVerified: boolean;
  voltageDisclaimer?: string;
}

export interface SerialPortInfo {
  path: string;
  manufacturer?: string;
  serialNumber?: string;
  pnpId?: string;
  friendlyName?: string;
}
