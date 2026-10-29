import type {
  ObdTransport,
  TransportState,
  StateChangeCallback,
  TransportStateChange,
} from './obd-transport.interface.ts';
import { validateAndSanitizeCommand } from '../domain/obd-commands.ts';
import { ObdConnectionError, ObdTimeoutError, ObdProtocolError } from '../domain/obd-errors.ts';

export type SimulatorFaultInjection = 'NO_DATA' | 'UNABLE_TO_CONNECT' | 'TIMEOUT' | 'BUS_BUSY' | null;

export interface SimulatorConfig {
  vehicleModel?: string; // e.g. "Renault Logan 1.6 2020 (H4M/HR16)"
  vin?: string;
  hasMilOn?: boolean;
  activeDtcs?: string[]; // e.g. ["P0300", "P0115"]
  faultInjection?: SimulatorFaultInjection;
}

/**
 * High-Fidelity OBD-II & ELM327 Simulator.
 * Emulates the ECU response cycle of a Renault Logan 1.6 2020 (CAN 11-bit 500k ISO 15765-4).
 * Always identifies its output with isSimulated: true.
 */
export class ObdSimulatorTransport implements ObdTransport {
  public readonly transportId = 'SIMULATOR_RENAULT_LOGAN_2020';
  public readonly isSimulated = true;
  private _state: TransportState = 'DISCONNECTED';
  private stateListeners: Set<StateChangeCallback> = new Set();

  private config: Required<SimulatorConfig>;
  private tickCount = 0;

  constructor(customConfig?: SimulatorConfig) {
    this.config = {
      vehicleModel: customConfig?.vehicleModel || 'Renault Logan 1.6 Life/Zen 2020 (H4M)',
      vin: customConfig?.vin || '93Y4SRH15LL000001',
      hasMilOn: customConfig?.hasMilOn !== undefined ? customConfig.hasMilOn : true,
      activeDtcs: customConfig?.activeDtcs || ['P0300', 'P0115'],
      faultInjection: customConfig?.faultInjection || null,
    };
  }

  public get state(): TransportState {
    return this._state;
  }

  public async connect(): Promise<void> {
    this.transitionState('CONNECTING', 'Initializing simulated ELM327 link...');
    await this.delay(100);

    if (this.config.faultInjection === 'UNABLE_TO_CONNECT') {
      this.transitionState('ERROR', 'Simulated failure: UNABLE TO CONNECT to vehicle bus.');
      throw new ObdConnectionError('Simulator injected connection failure.');
    }

    this.transitionState('CONNECTED', 'Virtual link established (CAN 11-bit 500k ISO 15765-4).');
  }

  public async disconnect(): Promise<void> {
    this.transitionState('DISCONNECTED', 'Virtual link closed cleanly.');
  }

  public async send(command: string, timeoutMs = 2500): Promise<string> {
    if (this._state !== 'CONNECTED') {
      throw new ObdConnectionError('Cannot send command: Simulator is disconnected.');
    }

    // 1. Mandatory Read-Only Whitelist Validation
    const sanitized = validateAndSanitizeCommand(command);

    // 2. Fault Injection Handling
    if (this.config.faultInjection === 'TIMEOUT') {
      await this.delay(Math.min(timeoutMs + 50, 500));
      throw new ObdTimeoutError(sanitized, timeoutMs);
    }
    if (this.config.faultInjection === 'BUS_BUSY') {
      throw new ObdProtocolError('Injected CAN bus collision.', 'BUS BUSY');
    }
    if (this.config.faultInjection === 'NO_DATA') {
      return 'NO DATA\r\r>';
    }

    // Realistic small serial transmission latency
    await this.delay(20);
    this.tickCount++;

    // 3. Command Response Emulation
    return this.emulateResponse(sanitized);
  }

  public onStateChange(callback: StateChangeCallback): () => void {
    this.stateListeners.add(callback);
    return () => this.stateListeners.delete(callback);
  }

  public setFaultInjection(fault: SimulatorFaultInjection): void {
    this.config.faultInjection = fault;
  }

  public setMilStatus(milOn: boolean): void {
    this.config.hasMilOn = milOn;
  }

  public setActiveDtcs(dtcs: string[]): void {
    this.config.activeDtcs = dtcs;
  }

  private emulateResponse(cmd: string): string {
    // AT Commands
    switch (cmd) {
      case 'ATZ':
        return 'ELM327 v1.5\r\r>';
      case 'ATE0':
      case 'ATE1':
      case 'ATL0':
      case 'ATL1':
      case 'ATS0':
      case 'ATS1':
      case 'ATH0':
      case 'ATH1':
      case 'ATSP0':
      case 'ATSP6':
        return 'OK\r\r>';
      case 'ATDP':
        return 'ISO 15765-4 (CAN 11/500)\r\r>';
      case 'ATDPN':
        return '6\r\r>';
      case 'ATRV':
        // Battery voltage (14.1V running with alternator active)
        return '14.1V\r\r>';
      case 'ATI':
        return 'ELM327 v1.5 (Automotors Diagnostics Virtual)\r\r>';
      case 'AT@1':
        return 'Automotors Diagnostics Simulator\r\r>';
    }

    // Mode 01: Current Sensor Telemetry
    if (cmd === '0100') {
      // Supported PIDs [01-20]: Returns bitmask supporting 01, 04, 05, 0C, 0D, 0F, 11
      // 01 01 04 05 0C 0D 0F 11 -> Hex mask: BE 3E A8 11
      return '41 00 BE 3E A8 11\r\r>';
    }

    if (cmd === '0101') {
      // Status since DTCs cleared:
      // Byte A: bit 7 = MIL status, bits 0-6 = count
      const dtcCount = this.config.activeDtcs.length;
      const milByte = (this.config.hasMilOn ? 0x80 : 0x00) | (dtcCount & 0x7f);
      const hexMil = milByte.toString(16).padStart(2, '0').toUpperCase();
      return `41 01 ${hexMil} 00 00 00\r\r>`;
    }

    if (cmd === '010C') {
      // RPM: Formula = ((A * 256) + B) / 4
      // Dynamic oscillation between 820 rpm and 2150 rpm
      const baseRpm = 820 + (Math.sin(this.tickCount * 0.4) * 60) + ((this.tickCount % 5) * 250);
      const rawVal = Math.round(baseRpm * 4);
      const a = (rawVal >> 8) & 0xff;
      const b = rawVal & 0xff;
      const hexA = a.toString(16).padStart(2, '0').toUpperCase();
      const hexB = b.toString(16).padStart(2, '0').toUpperCase();
      return `41 0C ${hexA} ${hexB}\r\r>`;
    }

    if (cmd === '010D') {
      // Vehicle Speed: Formula = A km/h
      // Dynamic speed between 0 and 58 km/h
      const speed = Math.max(0, Math.round(35 + Math.sin(this.tickCount * 0.3) * 22));
      const hexA = speed.toString(16).padStart(2, '0').toUpperCase();
      return `41 0D ${hexA}\r\r>`;
    }

    if (cmd === '0105') {
      // Coolant Temp: Formula = A - 40
      // Target: ~89°C (normal operating temperature for H4M)
      const tempC = 89;
      const a = tempC + 40; // 129 -> 0x81
      return `41 05 ${a.toString(16).toUpperCase()}\r\r>`;
    }

    if (cmd === '0104') {
      // Engine Load: Formula = (A * 100) / 255
      // Target: ~28%
      const load = 28;
      const a = Math.round((load * 255) / 100);
      return `41 04 ${a.toString(16).padStart(2, '0').toUpperCase()}\r\r>`;
    }

    if (cmd === '0111') {
      // Throttle Position: Target ~18%
      const a = Math.round((18 * 255) / 100);
      return `41 11 ${a.toString(16).padStart(2, '0').toUpperCase()}\r\r>`;
    }

    if (cmd === '010F') {
      // Intake Air Temp: Formula = A - 40. Target ~28°C
      const a = 28 + 40;
      return `41 0F ${a.toString(16).toUpperCase()}\r\r>`;
    }

    // Mode 03: Request Confirmed Stored DTCs
    if (cmd === '03') {
      if (this.config.activeDtcs.length === 0) {
        return '43 00 00 00 00 00 00\r\r>';
      }
      // Encode active DTCs into 2-byte hex pairs
      const hexPairs = this.config.activeDtcs.map((c) => this.encodeDtc(c)).filter(Boolean);
      return `43 ${hexPairs.join(' ')}\r\r>`;
    }

    // Mode 07: Request Pending DTCs
    if (cmd === '07') {
      return '47 00 00 00 00 00 00\r\r>';
    }

    // Mode 09 PID 02: VIN Query
    if (cmd === '0902') {
      // Multi-frame simulated response for 17-char VIN
      const asciiHex = Array.from(this.config.vin)
        .map((c) => c.charCodeAt(0).toString(16).padStart(2, '0').toUpperCase())
        .join(' ');
      return `49 02 01 ${asciiHex.slice(0, 14)}\r\n49 02 02 ${asciiHex.slice(15)}\r\r>`;
    }

    return 'NO DATA\r\r>';
  }

  private encodeDtc(dtc: string): string {
    const clean = dtc.toUpperCase().trim();
    if (clean.length !== 5) return '00 00';

    const letter = clean.charAt(0);
    let typeBits = 0;
    if (letter === 'C') typeBits = 1;
    else if (letter === 'B') typeBits = 2;
    else if (letter === 'U') typeBits = 3;

    const digit2 = parseInt(clean.charAt(1), 10) & 0x03;
    const digit3 = parseInt(clean.charAt(2), 16) & 0x0f;
    const digit45 = parseInt(clean.slice(3, 5), 16) & 0xff;

    const byteA = (typeBits << 6) | (digit2 << 4) | digit3;
    const byteB = digit45;

    return `${byteA.toString(16).padStart(2, '0').toUpperCase()} ${byteB.toString(16).padStart(2, '0').toUpperCase()}`;
  }

  private transitionState(newState: TransportState, details?: string): void {
    this._state = newState;
    const event: TransportStateChange = {
      state: newState,
      details,
      timestamp: new Date().toISOString(),
    };
    for (const listener of this.stateListeners) {
      try {
        listener(event);
      } catch {
        // Safe callback execution
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
