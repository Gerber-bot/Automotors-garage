import { ObdSecurityError } from './obd-errors.ts';

/**
 * Strict Whitelist of Permitted ELM327 AT Commands (Configuration & Discovery).
 * Only safe, query-only and local terminal formatting commands are allowed.
 */
export const ALLOWED_AT_COMMANDS = new Set([
  'ATZ',    // Reset device
  'ATE0',   // Echo Off
  'ATE1',   // Echo On
  'ATL0',   // Linefeed Off
  'ATL1',   // Linefeed On
  'ATS0',   // Spaces Off
  'ATS1',   // Spaces On
  'ATH0',   // Headers Off
  'ATH1',   // Headers On
  'ATSP0',  // Automatic protocol detection
  'ATSP1',  // SAE J1850 PWM
  'ATSP2',  // SAE J1850 VPW
  'ATSP3',  // ISO 9141-2
  'ATSP4',  // ISO 14230-4 KWP (5 baud init)
  'ATSP5',  // ISO 14230-4 KWP (fast init)
  'ATSP6',  // ISO 15765-4 CAN (11 bit ID, 500 kbaud) - Standard on Renault Logan
  'ATSP7',  // ISO 15765-4 CAN (29 bit ID, 500 kbaud)
  'ATSP8',  // ISO 15765-4 CAN (11 bit ID, 250 kbaud)
  'ATSP9',  // ISO 15765-4 CAN (29 bit ID, 250 kbaud)
  'ATDP',   // Describe current protocol
  'ATDPN',  // Describe current protocol number
  'ATRV',   // Read voltage from OBD connector (Pin 16)
  'ATI',    // Read ELM chip identification
  'AT@1',   // Read device manufacturer info
]);

/**
 * Strict Whitelist of Permitted SAE J1979 OBD-II Modes & PIDs.
 * Strictly READ-ONLY telemetry and discovery.
 */
export const ALLOWED_OBD_COMMANDS = new Set([
  // Mode 01: Show Current Data (Powertrain Telemetry)
  '0100', // PIDs supported [01 - 20]
  '0101', // Status since DTCs cleared (MIL check engine & DTC count)
  '0104', // Calculated engine load
  '0105', // Engine coolant temperature
  '010C', // Engine RPM
  '010D', // Vehicle speed
  '010F', // Intake air temperature
  '0111', // Throttle position
  '011F', // Run time since engine start
  '0120', // PIDs supported [21 - 40]
  '0140', // PIDs supported [41 - 60]

  // Mode 03: Request Diagnostic Trouble Codes (Confirmed DTCs)
  '03',

  // Mode 07: Request Pending Trouble Codes (In-cycle DTCs)
  '07',

  // Mode 09: Request Vehicle Information
  '0902', // Vehicle Identification Number (VIN)
]);

/**
 * Forbidden OBD Modes and Dangerous Patterns.
 * Prohibits resetting MIL, flashing ECUs, or actuating components.
 */
const FORBIDDEN_PREFIXES = [
  '04', // Mode 04: Clear / Reset DTCs and MIL Check Engine Light
  '05', // Mode 05: O2 sensor monitoring test results
  '06', // Mode 06: Request on-board test results
  '08', // Mode 08: Control of on-board system, test or component (Actuator drive)
  '2F', // UDS: InputOutputControlByIdentifier
  '31', // UDS: RoutineControl (Calibrations/Tests)
  '34', // UDS: RequestDownload (Flashing/Writing firmware)
  '36', // UDS: TransferData (Writing memory)
  '37', // UDS: RequestTransferExit
  '27', // UDS: SecurityAccess
];

/**
 * Validates and sanitizes a raw OBD-II or ELM327 command before physical dispatch.
 * Enforces Read-Only security invariants.
 *
 * @throws {ObdSecurityError} if the command violates read-only policy or is not whitelisted.
 */
export function validateAndSanitizeCommand(rawCommand: string): string {
  if (!rawCommand || typeof rawCommand !== 'string') {
    throw new ObdSecurityError('', 'Empty or invalid command payload.');
  }

  // Strip whitespaces and control characters
  const cleaned = rawCommand.replace(/\s+/g, '').toUpperCase().trim();

  // 1. Explicit Check for Forbidden Prefixes
  for (const forbidden of FORBIDDEN_PREFIXES) {
    if (cleaned.startsWith(forbidden)) {
      throw new ObdSecurityError(
        rawCommand,
        `Prohibited OBD Mode or Routine '${forbidden}' is blocked by security policy.`
      );
    }
  }

  // 2. Check Whitelist
  if (ALLOWED_AT_COMMANDS.has(cleaned) || ALLOWED_OBD_COMMANDS.has(cleaned)) {
    return cleaned;
  }

  // Reject unrecognized command
  throw new ObdSecurityError(
    rawCommand,
    `Command '${rawCommand}' is not in the authorized OBD-II diagnostic whitelist.`
  );
}
