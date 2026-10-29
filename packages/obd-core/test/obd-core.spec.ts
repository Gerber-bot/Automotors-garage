import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import {
  validateAndSanitizeCommand,
  ObdSecurityError,
  ObdProtocolError,
  ObdDecoder,
  decodeRawDtcBytes,
  ObdSimulatorTransport,
  WindowsUsbObdTransport,
  ObdDiagnosticsService,
} from '../src/index.ts';

describe('OBD-II Core Diagnostics Test Suite', () => {
  describe('1. Read-Only Security Policy & Command Whitelist', () => {
    it('allows valid AT commands and standard Mode 01/03/07/09 queries', () => {
      assert.equal(validateAndSanitizeCommand('ATZ'), 'ATZ');
      assert.equal(validateAndSanitizeCommand('ate0'), 'ATE0');
      assert.equal(validateAndSanitizeCommand('01 0C'), '010C');
      assert.equal(validateAndSanitizeCommand('01 0D'), '010D');
      assert.equal(validateAndSanitizeCommand('03'), '03');
      assert.equal(validateAndSanitizeCommand('07'), '07');
      assert.equal(validateAndSanitizeCommand('09 02'), '0902');
      assert.equal(validateAndSanitizeCommand('ATRV'), 'ATRV');
    });

    it('strictly blocks Mode 04 (Clear DTCs / Reset MIL)', () => {
      assert.throws(
        () => validateAndSanitizeCommand('04'),
        (err: unknown) => {
          assert.ok(err instanceof ObdSecurityError);
          assert.ok(err.message.includes('04'));
          return true;
        }
      );
      assert.throws(
        () => validateAndSanitizeCommand('04 00'),
        (err: unknown) => err instanceof ObdSecurityError
      );
    });

    it('strictly blocks Mode 08 (Actuator Drive & Component Control)', () => {
      assert.throws(
        () => validateAndSanitizeCommand('08 01 02'),
        (err: unknown) => err instanceof ObdSecurityError
      );
    });

    it('strictly blocks UDS write routines (0x2F, 0x31, 0x34, 0x36)', () => {
      assert.throws(
        () => validateAndSanitizeCommand('2F 01 03'),
        (err: unknown) => err instanceof ObdSecurityError
      );
      assert.throws(
        () => validateAndSanitizeCommand('31 01 AA'),
        (err: unknown) => err instanceof ObdSecurityError
      );
    });

    it('rejects unauthorized or arbitrary commands', () => {
      assert.throws(
        () => validateAndSanitizeCommand('FORMAT C:'),
        (err: unknown) => err instanceof ObdSecurityError
      );
      assert.throws(
        () => validateAndSanitizeCommand('CUSTOM_WRITE_RAM'),
        (err: unknown) => err instanceof ObdSecurityError
      );
    });
  });

  describe('2. Response Decoding & Unit Conversions', () => {
    it('decodes Engine RPM (01 0C) correctly', () => {
      // 0x1A = 26, 0xF8 = 248 -> ((26 * 256) + 248) / 4 = 1726 RPM
      const bytes = ['41', '0C', '1A', 'F8'];
      const rpm = ObdDecoder.decodeRpm(bytes);
      assert.equal(rpm, 1726);
    });

    it('decodes Vehicle Speed (01 0D) correctly', () => {
      // 0x37 = 55 km/h
      const bytes = ['41', '0D', '37'];
      const speed = ObdDecoder.decodeSpeed(bytes);
      assert.equal(speed, 55);
    });

    it('decodes Coolant Temperature (01 05) with -40 offset', () => {
      // 0x81 = 129 -> 129 - 40 = 89 °C
      const bytes = ['41', '05', '81'];
      const temp = ObdDecoder.decodeCoolantTemp(bytes);
      assert.equal(temp, 89);

      // Freezing check: 0x28 = 40 -> 40 - 40 = 0 °C
      assert.equal(ObdDecoder.decodeCoolantTemp(['41', '05', '28']), 0);
    });

    it('decodes Calculated Engine Load (01 04) correctly', () => {
      // 0x48 = 72 -> (72 * 100) / 255 = 28%
      const bytes = ['41', '04', '48'];
      const load = ObdDecoder.decodeEngineLoad(bytes);
      assert.equal(load, 28);
    });

    it('decodes Adapter Voltage from ATRV response', () => {
      assert.equal(ObdDecoder.decodeVoltage('14.2V'), 14.2);
      assert.equal(ObdDecoder.decodeVoltage('12.6 V\r\r>'), 12.6);
      assert.equal(ObdDecoder.decodeVoltage('13.8V'), 13.8);
    });

    it('decodes MIL Status and DTC count from PID 01 01', () => {
      // Byte A: 0x82 -> bit 7 is 1 (MIL ON), bits 0-6 = 2 (2 DTCs)
      const bytes = ['41', '01', '82', '00', '00', '00'];
      const status = ObdDecoder.decodeMilAndDtcCount(bytes);
      assert.equal(status.mil, true);
      assert.equal(status.count, 2);

      // MIL OFF with 0 DTCs: 0x00
      const clean = ObdDecoder.decodeMilAndDtcCount(['41', '01', '00', '00', '00', '00']);
      assert.equal(clean.mil, false);
      assert.equal(clean.count, 0);
    });

    it('decodes Raw 2-Byte DTCs into SAE Standard Formats (P, C, B, U)', () => {
      // 0x03 0x00 -> P0300
      assert.equal(decodeRawDtcBytes('03', '00'), 'P0300');
      // 0x01 0x15 -> P0115
      assert.equal(decodeRawDtcBytes('01', '15'), 'P0115');
      // Chassis code: 0x40 0x35 -> C0035
      assert.equal(decodeRawDtcBytes('40', '35'), 'C0035');
      // Network code: 0xC1 0x00 -> U0100
      assert.equal(decodeRawDtcBytes('C1', '00'), 'U0100');
      // Empty slot (00 00)
      assert.equal(decodeRawDtcBytes('00', '00'), null);
    });

    it('decodes Mode 03 response lines into verified DTC objects', () => {
      const lines = ['43 03 00 01 15 00 00'];
      const dtcs = ObdDecoder.decodeDtcResponse(lines, false);
      assert.equal(dtcs.length, 2);
      assert.equal(dtcs[0]?.code, 'P0300');
      assert.equal(dtcs[0]?.system, 'POWERTRAIN');
      assert.equal(dtcs[0]?.severity, 'HIGH');
      assert.equal(dtcs[1]?.code, 'P0115');
    });

    it('decodes Mode 09 02 Vehicle Identification Number (VIN)', () => {
      // 93Y4SRH15LL000001 (Renault Logan Argentina 2020)
      const asciiVin = '93Y4SRH15LL000001';
      const hexTokens = Array.from(asciiVin).map((c) => c.charCodeAt(0).toString(16).toUpperCase());
      const lines = [
        `49 02 01 ${hexTokens.slice(0, 5).join(' ')}`,
        `49 02 02 ${hexTokens.slice(5, 11).join(' ')}`,
        `49 02 03 ${hexTokens.slice(11).join(' ')}`,
      ];
      const vin = ObdDecoder.decodeVin(lines);
      assert.equal(vin, '93Y4SRH15LL000001');
    });

    it('detects ELM327 protocol and hardware bus errors', () => {
      assert.throws(
        () => ObdDecoder.cleanResponse('UNABLE TO CONNECT\r\r>'),
        (err: unknown) => err instanceof ObdProtocolError
      );
      assert.throws(
        () => ObdDecoder.cleanResponse('BUS BUSY\r\r>'),
        (err: unknown) => err instanceof ObdProtocolError
      );
      assert.throws(
        () => ObdDecoder.cleanResponse('CAN ERROR\r\r>'),
        (err: unknown) => err instanceof ObdProtocolError
      );
    });
  });

  describe('3. OBD-II Simulator (Renault Logan 1.6 2020)', () => {
    it('initializes simulator and identifies all telemetry as simulated', async () => {
      const simulator = new ObdSimulatorTransport({
        vehicleModel: 'Renault Logan 1.6 2020 (H4M)',
        activeDtcs: ['P0300', 'P0115'],
      });

      assert.equal(simulator.isSimulated, true);
      assert.equal(simulator.state, 'DISCONNECTED');

      await simulator.connect();
      assert.equal(simulator.state, 'CONNECTED');

      const atz = await simulator.send('ATZ');
      assert.ok(atz.includes('ELM327'));

      const atrv = await simulator.send('ATRV');
      assert.ok(atrv.includes('14.1V'));

      const rpmResp = await simulator.send('01 0C');
      const rpm = ObdDecoder.decodeRpm(ObdDecoder.extractHexBytes(rpmResp));
      assert.ok(rpm >= 700 && rpm <= 3000, `RPM must be in normal operating range: ${rpm}`);

      const dtcResp = await simulator.send('03');
      const dtcs = ObdDecoder.decodeDtcResponse(ObdDecoder.cleanResponse(dtcResp));
      assert.equal(dtcs.length, 2);
      assert.ok(dtcs.some((d) => d.code === 'P0300'));
      assert.ok(dtcs.some((d) => d.code === 'P0115'));

      await simulator.disconnect();
      assert.equal(simulator.state, 'DISCONNECTED');
    });

    it('handles simulated fault injection properly', async () => {
      const simulator = new ObdSimulatorTransport({
        faultInjection: 'NO_DATA',
      });
      await simulator.connect();

      const resp = await simulator.send('01 0C');
      assert.ok(resp.includes('NO DATA'));

      await simulator.disconnect();
    });
  });

  describe('4. Windows USB Transport & Device Selection', () => {
    it('enumerates available COM ports without auto-connecting to arbitrary devices', async () => {
      const ports = await WindowsUsbObdTransport.listAvailablePorts();
      assert.ok(Array.isArray(ports));
      assert.ok(ports.length >= 1);
      assert.ok(ports.some((p) => p.path === 'COM3'));
    });

    it('rejects invalid or empty COM port names', () => {
      assert.throws(() => new WindowsUsbObdTransport({ portPath: '' }));
      assert.throws(() => new WindowsUsbObdTransport({ portPath: '   ' }));
    });
  });

  describe('5. Diagnostics Service & Vehicle History Snapshots', () => {
    it('runs end-to-end simulated session and produces non-destructive history record', async () => {
      const service = new ObdDiagnosticsService();
      const vehicleId = 'd0000000-0000-4000-8000-000000000001';
      const workshopId = 'a0000000-0000-4000-8000-000000000001';

      // Start session
      const session = await service.startSession({
        vehicleId,
        workshopId,
        transportType: 'SIMULATED',
      });

      assert.ok(session);
      assert.equal(session.transport.isSimulated, true);

      // Poll live snapshot
      const snapshot = await service.getLiveTelemetry(workshopId, vehicleId);
      assert.ok(snapshot.sensors.rpm > 0);
      assert.ok(snapshot.sensors.adapterVoltage >= 12.0);
      assert.equal(snapshot.isSimulated, true);
      assert.equal(snapshot.dtcCodes.length, 2);

      // Create history diagnostic record
      const record = service.createDiagnosticRecord(
        snapshot,
        vehicleId,
        workshopId,
        'Escaneo preventivo de rutina en Renault Logan 1.6'
      );

      assert.ok(record.id);
      assert.equal(record.vehicleId, vehicleId);
      assert.equal(record.workshopId, workshopId);
      assert.equal(record.origin, 'SIMULATED');
      assert.equal(record.isVerified, false, 'Simulated diagnostics must never be marked as verified');
      assert.equal(record.telemetry.sensors.rpm, snapshot.sensors.rpm);

      // Clean shutdown
      await service.stopSession(workshopId, vehicleId);
      assert.equal(service.getSession(workshopId, vehicleId), undefined);
    });
  });
});
