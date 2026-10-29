import { ObdDecodeError, ObdProtocolError } from '../domain/obd-errors.ts';
import { decodeRawDtcBytes, lookupDtc } from '../domain/dtc-codes.ts';
import type { ObdDtcCode } from '../domain/obd-types.ts';

export class ObdDecoder {
  /**
   * Cleans raw terminal output from ELM327 adapter:
   * Strips echo, prompts ('>'), whitespaces, and splits multi-line CAN frames.
   */
  public static cleanResponse(raw: string): string[] {
    if (!raw) return [];

    // Check for adapter-level status and error messages
    const trimmed = raw.trim();
    if (trimmed.includes('UNABLE TO CONNECT')) {
      throw new ObdProtocolError('ELM327 could not connect to vehicle ECU.', raw);
    }
    if (trimmed.includes('BUS BUSY')) {
      throw new ObdProtocolError('CAN Bus is overloaded or busy.', raw);
    }
    if (trimmed.includes('CAN ERROR')) {
      throw new ObdProtocolError('Physical CAN bus error detected by adapter.', raw);
    }

    return raw
      .replace(/>/g, '') // remove ELM prompt
      .split(/[\r\n]+/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('SEARCHING'));
  }

  /**
   * Parses hex bytes from an OBD-II Mode response line.
   * Expected format e.g. "41 0C 1A F8" -> ["41", "0C", "1A", "F8"]
   */
  public static extractHexBytes(line: string): string[] {
    // Strip spaces, CAN headers if any (e.g. "7E8 04 41 0C 1A F8" -> extract after 41)
    const tokens = line.split(/\s+/).map((t) => t.toUpperCase());

    // Locate the positive response mode byte (41, 43, 47, 49)
    const modeIdx = tokens.findIndex((t) => ['41', '43', '47', '49'].includes(t));
    if (modeIdx !== -1) {
      return tokens.slice(modeIdx);
    }

    // If no spaces, extract every 2 characters
    const noSpaces = line.replace(/\s+/g, '').toUpperCase();
    const pairs: string[] = [];
    for (let i = 0; i < noSpaces.length; i += 2) {
      pairs.push(noSpaces.slice(i, i + 2));
    }
    return pairs;
  }

  /**
   * Mode 01 PID 0C: Engine RPM
   * Formula: ((A * 256) + B) / 4
   */
  public static decodeRpm(bytes: string[]): number {
    // Expected: ["41", "0C", A, B]
    const data = this.findMode01Payload(bytes, '0C', 2);
    const a = parseInt(data[0] || '0', 16);
    const b = parseInt(data[1] || '0', 16);
    return Math.round(((a * 256) + b) / 4);
  }

  /**
   * Mode 01 PID 0D: Vehicle Speed in km/h
   * Formula: A
   */
  public static decodeSpeed(bytes: string[]): number {
    const data = this.findMode01Payload(bytes, '0D', 1);
    return parseInt(data[0] || '0', 16);
  }

  /**
   * Mode 01 PID 05: Engine Coolant Temperature in °C
   * Formula: A - 40
   */
  public static decodeCoolantTemp(bytes: string[]): number {
    const data = this.findMode01Payload(bytes, '05', 1);
    const a = parseInt(data[0] || '0', 16);
    return a - 40;
  }

  /**
   * Mode 01 PID 04: Calculated Engine Load in %
   * Formula: (A * 100) / 255
   */
  public static decodeEngineLoad(bytes: string[]): number {
    const data = this.findMode01Payload(bytes, '04', 1);
    const a = parseInt(data[0] || '0', 16);
    return Math.round((a * 100) / 255);
  }

  /**
   * Mode 01 PID 11: Throttle Position in %
   * Formula: (A * 100) / 255
   */
  public static decodeThrottlePosition(bytes: string[]): number {
    const data = this.findMode01Payload(bytes, '11', 1);
    const a = parseInt(data[0] || '0', 16);
    return Math.round((a * 100) / 255);
  }

  /**
   * Mode 01 PID 0F: Intake Air Temperature in °C
   * Formula: A - 40
   */
  public static decodeIntakeAirTemp(bytes: string[]): number {
    const data = this.findMode01Payload(bytes, '0F', 1);
    const a = parseInt(data[0] || '0', 16);
    return a - 40;
  }

  /**
   * ELM Command: ATRV (Adapter / Battery Voltage)
   * Example input: "12.6V" or "14.2V"
   */
  public static decodeVoltage(raw: string): number {
    const match = raw.match(/([0-9]+(?:\.[0-9]+)?)\s*V?/i);
    if (!match || !match[1]) {
      throw new ObdDecodeError('Cannot parse voltage from response', raw);
    }
    return parseFloat(match[1]);
  }

  /**
   * Mode 01 PID 01: Status since DTCs cleared
   * Byte A:
   *   Bit 7 = MIL Status (1 = ON, 0 = OFF)
   *   Bits 0-6 = Number of confirmed DTCs
   */
  public static decodeMilAndDtcCount(bytes: string[]): { mil: boolean; count: number } {
    const data = this.findMode01Payload(bytes, '01', 4);
    const a = parseInt(data[0] || '0', 16);
    const mil = (a & 0x80) !== 0;
    const count = a & 0x7f;
    return { mil, count };
  }

  /**
   * Mode 01 PID 00 / 20 / 40: Supported PIDs bitmask
   */
  public static decodeSupportedPids(bytes: string[], baseOffset = 1): string[] {
    const data = bytes.slice(2, 6);
    if (data.length < 4) return [];

    const supported: string[] = [];
    let pidNumber = baseOffset;

    for (const hexByte of data) {
      const val = parseInt(hexByte, 16);
      for (let bit = 7; bit >= 0; bit--) {
        if ((val & (1 << bit)) !== 0) {
          const hexPid = pidNumber.toString(16).padStart(2, '0').toUpperCase();
          supported.push(`01${hexPid}`);
        }
        pidNumber++;
      }
    }
    return supported;
  }

  /**
   * Decodes Mode 03 (Stored DTCs) or Mode 07 (Pending DTCs).
   * Example: "43 01 15 03 00 00 00" -> P0115, P0300
   */
  public static decodeDtcResponse(lines: string[], isPending = false): ObdDtcCode[] {
    const results: ObdDtcCode[] = [];
    const expectedPrefix = isPending ? '47' : '43';

    for (const line of lines) {
      if (line.includes('NO DATA')) continue;

      const bytes = this.extractHexBytes(line);
      const prefixIdx = bytes.indexOf(expectedPrefix);
      if (prefixIdx === -1) continue;

      const dataBytes = bytes.slice(prefixIdx + 1);
      // Process pairs
      for (let i = 0; i + 1 < dataBytes.length; i += 2) {
        const b1 = dataBytes[i];
        const b2 = dataBytes[i + 1];
        if (!b1 || !b2) continue;
        const codeStr = decodeRawDtcBytes(b1, b2);
        if (codeStr && !results.some((r) => r.code === codeStr)) {
          results.push(lookupDtc(codeStr, isPending));
        }
      }
    }

    return results;
  }

  /**
   * Decodes Mode 09 PID 02: Vehicle Identification Number (VIN)
   */
  public static decodeVin(lines: string[]): string | undefined {
    // Mode 09 02 returns multi-frame ASCII bytes
    let asciiAccumulator = '';
    for (const line of lines) {
      const bytes = this.extractHexBytes(line);
      // Look for 49 02
      const idx = bytes.indexOf('02');
      const start = idx !== -1 ? idx + 1 : 0;
      for (let i = start; i < bytes.length; i++) {
        const val = parseInt(bytes[i] || '0', 16);
        // Printable ASCII
        if (val >= 32 && val <= 126) {
          asciiAccumulator += String.fromCharCode(val);
        }
      }
    }

    // Standard VIN is 17 alphanumeric characters (no I, O, Q)
    const match = asciiAccumulator.match(/[A-HJ-NPR-Z0-9]{17}/);
    return match ? match[0] : undefined;
  }

  /**
   * Helper to validate and slice Mode 01 response payload.
   */
  private static findMode01Payload(bytes: string[], pidHex: string, expectedLength: number): string[] {
    const pidUpper = pidHex.toUpperCase();
    const modeIdx = bytes.indexOf('41');
    if (modeIdx === -1) {
      throw new ObdDecodeError(`Missing Mode 01 positive response header (41)`, bytes.join(' '));
    }

    if (bytes[modeIdx + 1]?.toUpperCase() !== pidUpper) {
      throw new ObdDecodeError(`Expected PID ${pidUpper} but found ${bytes[modeIdx + 1]}`, bytes.join(' '));
    }

    const payload = bytes.slice(modeIdx + 2, modeIdx + 2 + expectedLength);
    if (payload.length < expectedLength) {
      throw new ObdDecodeError(
        `Insufficient payload length for PID ${pidUpper}. Expected ${expectedLength}, got ${payload.length}`,
        bytes.join(' ')
      );
    }

    return payload;
  }
}
