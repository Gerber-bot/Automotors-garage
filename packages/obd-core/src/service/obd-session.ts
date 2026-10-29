import type { ObdTransport } from '../transport/obd-transport.interface.ts';
import { ObdDecoder } from '../decoder/obd-decoder.ts';
import type {
  ObdTelemetrySnapshot,
  ObdSensorReading,
  ObdDtcCode,
  ObdProtocol,
} from '../domain/obd-types.ts';

export interface SessionOptions {
  vehicleId: string;
  workshopId: string;
  userId?: string;
}

/**
 * Manages an active OBD-II Diagnostic Session over an ObdTransport.
 * Performs ELM327 initialization, PID discovery, DTC reading, and telemetry polling.
 */
export class ObdSession {
  public readonly vehicleId: string;
  public readonly workshopId: string;
  public readonly userId?: string;
  public readonly transport: ObdTransport;
  public lastAccessedAt: Date = new Date();

  private isInitialized = false;
  private protocol: ObdProtocol = 'UNKNOWN';
  private supportedPids: string[] = [];
  private vin?: string;

  constructor(transport: ObdTransport, options: SessionOptions) {
    this.transport = transport;
    this.vehicleId = options.vehicleId;
    this.workshopId = options.workshopId;
    this.userId = options.userId;
  }

  /**
   * Performs standard ELM327 initialization sequence according to SAE J1979 / ISO 15765-4.
   */
  public async initialize(): Promise<void> {
    if (this.transport.state !== 'CONNECTED') {
      await this.transport.connect();
    }

    // Handshake commands
    await this.transport.send('ATZ');   // Reset ELM327
    await this.transport.send('ATE0');  // Echo Off
    await this.transport.send('ATL0');  // Linefeeds Off
    await this.transport.send('ATH0');  // Headers Off
    await this.transport.send('ATSP0'); // Auto protocol select

    // Read protocol
    try {
      const dpRaw = await this.transport.send('ATDP');
      if (dpRaw.includes('CAN')) {
        this.protocol = 'ISO_15765_4_CAN_11BIT_500K';
      } else {
        this.protocol = 'AUTO';
      }
    } catch {
      this.protocol = 'AUTO';
    }

    // Discover supported PIDs [01-20]
    try {
      const pid00Raw = await this.transport.send('0100');
      const lines = ObdDecoder.cleanResponse(pid00Raw);
      if (lines.length > 0 && lines[0]) {
        const bytes = ObdDecoder.extractHexBytes(lines[0]);
        this.supportedPids = ObdDecoder.decodeSupportedPids(bytes, 1);
      }
    } catch {
      this.supportedPids = ['010C', '010D', '0105', '0104'];
    }

    // Attempt to query VIN (Mode 09 PID 02)
    try {
      const vinRaw = await this.transport.send('0902');
      const vinLines = ObdDecoder.cleanResponse(vinRaw);
      this.vin = ObdDecoder.decodeVin(vinLines);
    } catch {
      this.vin = undefined;
    }

    this.isInitialized = true;
  }

  /**
   * Captures a complete real-time telemetry snapshot of sensors and trouble codes.
   */
  public async captureSnapshot(): Promise<ObdTelemetrySnapshot> {
    this.lastAccessedAt = new Date();
    if (!this.isInitialized) {
      await this.initialize();
    }

    // 1. Read MIL Status and DTC count
    let milStatus = false;
    let dtcCount = 0;
    try {
      const milRaw = await this.transport.send('0101');
      const milLines = ObdDecoder.cleanResponse(milRaw);
      if (milLines.length > 0 && milLines[0]) {
        const bytes = ObdDecoder.extractHexBytes(milLines[0]);
        const res = ObdDecoder.decodeMilAndDtcCount(bytes);
        milStatus = res.mil;
        dtcCount = res.count;
      }
    } catch {
      // Fallback
    }

    // 2. Read Voltage
    let voltage = 12.6;
    try {
      const voltRaw = await this.transport.send('ATRV');
      voltage = ObdDecoder.decodeVoltage(voltRaw);
    } catch {
      // Keep default
    }

    // 3. Read Core Powertrain Telemetry (RPM, Speed, Temp, Load)
    let rpm = 0;
    let speed = 0;
    let coolantTemp = 0;
    let engineLoad = 0;
    let throttlePosition = 0;
    let intakeAirTemp = 0;

    try {
      const rpmRaw = await this.transport.send('010C');
      const rpmLines = ObdDecoder.cleanResponse(rpmRaw);
      if (rpmLines[0]) rpm = ObdDecoder.decodeRpm(ObdDecoder.extractHexBytes(rpmLines[0]));
    } catch { /* skip */ }

    try {
      const speedRaw = await this.transport.send('010D');
      const speedLines = ObdDecoder.cleanResponse(speedRaw);
      if (speedLines[0]) speed = ObdDecoder.decodeSpeed(ObdDecoder.extractHexBytes(speedLines[0]));
    } catch { /* skip */ }

    try {
      const tempRaw = await this.transport.send('0105');
      const tempLines = ObdDecoder.cleanResponse(tempRaw);
      if (tempLines[0]) coolantTemp = ObdDecoder.decodeCoolantTemp(ObdDecoder.extractHexBytes(tempLines[0]));
    } catch { /* skip */ }

    try {
      const loadRaw = await this.transport.send('0104');
      const loadLines = ObdDecoder.cleanResponse(loadRaw);
      if (loadLines[0]) engineLoad = ObdDecoder.decodeEngineLoad(ObdDecoder.extractHexBytes(loadLines[0]));
    } catch { /* skip */ }

    try {
      const throttleRaw = await this.transport.send('0111');
      const throttleLines = ObdDecoder.cleanResponse(throttleRaw);
      if (throttleLines[0]) throttlePosition = ObdDecoder.decodeThrottlePosition(ObdDecoder.extractHexBytes(throttleLines[0]));
    } catch { /* skip */ }

    try {
      const iatRaw = await this.transport.send('010F');
      const iatLines = ObdDecoder.cleanResponse(iatRaw);
      if (iatLines[0]) intakeAirTemp = ObdDecoder.decodeIntakeAirTemp(ObdDecoder.extractHexBytes(iatLines[0]));
    } catch { /* skip */ }

    // 4. Read Stored & Pending DTCs
    const dtcList: ObdDtcCode[] = [];
    try {
      const storedRaw = await this.transport.send('03');
      const storedCodes = ObdDecoder.decodeDtcResponse(ObdDecoder.cleanResponse(storedRaw), false);
      dtcList.push(...storedCodes);
    } catch { /* skip */ }

    try {
      const pendingRaw = await this.transport.send('07');
      const pendingCodes = ObdDecoder.decodeDtcResponse(ObdDecoder.cleanResponse(pendingRaw), true);
      for (const p of pendingCodes) {
        if (!dtcList.some((d) => d.code === p.code)) {
          dtcList.push(p);
        }
      }
    } catch { /* skip */ }

    const sensors: ObdSensorReading = {
      rpm,
      speed,
      coolantTemp,
      engineLoad,
      throttlePosition,
      intakeAirTemp,
      adapterVoltage: voltage,
      milStatus,
      dtcCount: Math.max(dtcCount, dtcList.length),
      vin: this.vin,
      supportedPids: this.supportedPids,
    };

    return {
      timestamp: new Date().toISOString(),
      isSimulated: this.transport.isSimulated,
      adapterIdentifier: this.transport.transportId,
      protocol: this.protocol,
      sensors,
      dtcCodes: dtcList,
    };
  }

  public async close(): Promise<void> {
    await this.transport.disconnect();
    this.isInitialized = false;
  }
}
