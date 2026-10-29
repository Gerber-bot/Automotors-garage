import { ObdSession } from './obd-session.ts';
import { ObdSimulatorTransport, type SimulatorConfig } from '../transport/obd-simulator.transport.ts';
import { WindowsUsbObdTransport } from '../transport/windows-usb.transport.ts';
import type { ObdTransport } from '../transport/obd-transport.interface.ts';
import type {
  DiagnosticRecord,
  ObdTelemetrySnapshot,
  SerialPortInfo,
} from '../domain/obd-types.ts';
import { ObdConnectionError } from '../domain/obd-errors.ts';

export interface StartSessionParams {
  vehicleId: string;
  workshopId: string;
  userId?: string;
  transportType: 'SIMULATED' | 'USB_SERIAL';
  comPort?: string;
  simulatorConfig?: SimulatorConfig;
}

/**
 * High-Level OBD-II Diagnostics Service.
 * Manages active hardware and simulated connections, live telemetry feeds,
 * bounded session lifecycles, and persistent history snapshots.
 */
export class ObdDiagnosticsService {
  private activeSessions: Map<string, ObdSession> = new Map();
  public readonly maxSessionsPerWorkshop: number = 3;
  public readonly sessionTtlMs: number = 300_000; // 5 minutes inactivity timeout

  /**
   * Discovers available USB Serial COM ports on the host system.
   */
  public async getAvailablePorts(): Promise<SerialPortInfo[]> {
    return WindowsUsbObdTransport.listAvailablePorts();
  }

  /**
   * Cleans up sessions that have been idle longer than maxIdleTimeMs.
   */
  public async cleanupAbandonedSessions(maxIdleTimeMs = this.sessionTtlMs): Promise<number> {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, session] of this.activeSessions.entries()) {
      if (now - session.lastAccessedAt.getTime() > maxIdleTimeMs) {
        await session.close().catch(() => {});
        this.activeSessions.delete(key);
        cleanedCount++;
      }
    }
    return cleanedCount;
  }

  /**
   * Initializes and opens a new diagnostic session.
   */
  public async startSession(params: StartSessionParams): Promise<ObdSession> {
    // 1. Clean abandoned sessions first
    await this.cleanupAbandonedSessions();

    const sessionKey = `${params.workshopId}_${params.vehicleId}`;

    // Close any previous active session for this specific vehicle
    const existing = this.activeSessions.get(sessionKey);
    if (existing) {
      await existing.close().catch(() => {});
      this.activeSessions.delete(sessionKey);
    }

    // 2. Enforce resource limit per workshop
    let workshopSessionCount = 0;
    for (const s of this.activeSessions.values()) {
      if (s.workshopId === params.workshopId) {
        workshopSessionCount++;
      }
    }

    if (workshopSessionCount >= this.maxSessionsPerWorkshop) {
      throw new ObdConnectionError(
        `Workshop session quota exceeded. Maximum ${this.maxSessionsPerWorkshop} concurrent OBD sessions allowed.`
      );
    }

    let transport: ObdTransport;
    if (params.transportType === 'SIMULATED') {
      transport = new ObdSimulatorTransport(params.simulatorConfig);
    } else if (params.transportType === 'USB_SERIAL') {
      if (!params.comPort) {
        throw new ObdConnectionError('A COM port must be explicitly selected for USB serial connection.');
      }
      transport = new WindowsUsbObdTransport({ portPath: params.comPort });
    } else {
      throw new ObdConnectionError(`Unsupported transport type: ${params.transportType}`);
    }

    const session = new ObdSession(transport, {
      vehicleId: params.vehicleId,
      workshopId: params.workshopId,
      userId: params.userId,
    });

    await session.initialize();
    this.activeSessions.set(sessionKey, session);
    return session;
  }

  /**
   * Retrieves active session for vehicle.
   */
  public getSession(workshopId: string, vehicleId: string): ObdSession | undefined {
    return this.activeSessions.get(`${workshopId}_${vehicleId}`);
  }

  /**
   * Polls real-time telemetry from active session.
   */
  public async getLiveTelemetry(workshopId: string, vehicleId: string): Promise<ObdTelemetrySnapshot> {
    await this.cleanupAbandonedSessions();
    const session = this.getSession(workshopId, vehicleId);
    if (!session) {
      throw new ObdConnectionError(`No active OBD diagnostic session found for vehicle ${vehicleId}.`);
    }
    return session.captureSnapshot();
  }

  /**
   * Ends an active session and frees physical port.
   */
  public async stopSession(workshopId: string, vehicleId: string): Promise<void> {
    const sessionKey = `${workshopId}_${vehicleId}`;
    const session = this.activeSessions.get(sessionKey);
    if (session) {
      await session.close().catch(() => {});
      this.activeSessions.delete(sessionKey);
    }
  }

  /**
   * Creates a formal, non-destructive Diagnostic Snapshot for Vehicle History.
   *
   * Invariants:
   * 1. Does not overwrite odometer automatically unless explicitly verified.
   * 2. DTC codes are captured as diagnostic findings, NEVER as completed repairs.
   * 3. Origin is unambiguously marked (SIMULATED vs USB_SERIAL_ELM327).
   * 4. Voltage reading is explicitly documented as uncalibrated line voltage, NOT battery SOH/CCA.
   */
  public createDiagnosticRecord(
    snapshot: ObdTelemetrySnapshot,
    vehicleId: string,
    workshopId: string,
    technicianNotes?: string,
    technicianId?: string
  ): DiagnosticRecord {
    const origin = snapshot.isSimulated ? 'SIMULATED' : 'USB_SERIAL_ELM327';

    return {
      id: crypto.randomUUID(),
      vehicleId,
      workshopId,
      technicianId,
      recordedAt: snapshot.timestamp,
      origin,
      telemetry: snapshot,
      technicianNotes,
      isVerified: !snapshot.isSimulated,
      voltageDisclaimer:
        'Tensión de barra analógica informada por el adaptador OBD-II. No constituye una medición certificada de capacidad de arranque (CCA) ni estado de salud (SOH) de la batería.',
    };
  }
}
