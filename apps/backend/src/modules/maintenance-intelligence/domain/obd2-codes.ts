export interface DiagnosticTroubleCode {
  readonly code: string;
  readonly system: 'POWERTRAIN' | 'CHASSIS' | 'BODY' | 'NETWORK';
  readonly description: string;
  readonly severity: 'CRITICAL' | 'WARNING' | 'INFORMATIONAL';
  readonly possibleCauses: readonly string[];
  readonly recommendedChecks: readonly string[];
}

export const KNOWN_OBD2_CODES: Record<string, DiagnosticTroubleCode> = {
  P0300: {
    code: 'P0300',
    system: 'POWERTRAIN',
    description: 'Random / Multiple Cylinder Misfire Detected',
    severity: 'CRITICAL',
    possibleCauses: [
      'Faulty or worn spark plugs or ignition coils',
      'Clogged or defective fuel injectors',
      'Low fuel pressure or vacuum leak',
      'Low engine cylinder compression',
    ],
    recommendedChecks: [
      'Inspect spark plug gaps and ignition coil condition',
      'Check fuel rail pressure with a mechanical gauge',
      'Perform intake manifold smoke test for vacuum leaks',
    ],
  },
  P0171: {
    code: 'P0171',
    system: 'POWERTRAIN',
    description: 'System Too Lean (Bank 1)',
    severity: 'WARNING',
    possibleCauses: [
      'Dirty or contaminated Mass Airflow Sensor (MAF)',
      'Unmetered air vacuum leak downstream of MAF',
      'Weak fuel pump or clogged fuel filter',
      'Faulty upstream Oxygen (O2) sensor',
    ],
    recommendedChecks: [
      'Clean or test Mass Air Flow (MAF) sensor readings at idle',
      'Inspect PCV valve and intake vacuum hoses',
      'Check fuel trim values (STFT & LTFT)',
    ],
  },
  P0420: {
    code: 'P0420',
    system: 'POWERTRAIN',
    description: 'Catalyst System Efficiency Below Threshold (Bank 1)',
    severity: 'WARNING',
    possibleCauses: [
      'Degraded catalytic converter substrate',
      'Faulty downstream Oxygen sensor (Sensor 2)',
      'Exhaust leak near catalytic converter',
    ],
    recommendedChecks: [
      'Monitor downstream O2 sensor voltage waveform',
      'Check exhaust temperature differential before and after catalytic converter',
      'Inspect for exhaust manifold cracks',
    ],
  },
  P0128: {
    code: 'P0128',
    system: 'POWERTRAIN',
    description: 'Coolant Thermostat (Coolant Temp Below Regulating Temperature)',
    severity: 'INFORMATIONAL',
    possibleCauses: [
      'Thermostat stuck open',
      'Faulty Engine Coolant Temperature (ECT) sensor',
      'Low coolant level',
    ],
    recommendedChecks: [
      'Verify coolant temperature with scan tool vs infrared thermometer',
      'Inspect thermostat valve movement upon warm-up',
    ],
  },
};
