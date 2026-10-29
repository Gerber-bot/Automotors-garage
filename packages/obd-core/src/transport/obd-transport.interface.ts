export type TransportState = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR';

export interface TransportStateChange {
  state: TransportState;
  details?: string;
  timestamp: string;
}

export type StateChangeCallback = (event: TransportStateChange) => void;

/**
 * Universal OBD-II Transport Interface.
 * Decouples physical hardware layer (Serial COM, USB, Bluetooth, WebSockets, or Simulator)
 * from the diagnostic domain and interpretation engine.
 */
export interface ObdTransport {
  readonly transportId: string;
  readonly isSimulated: boolean;
  readonly state: TransportState;

  /**
   * Establishes low-level physical or virtual link to ELM327 adapter.
   */
  connect(): Promise<void>;

  /**
   * Safely closes the communication channel and releases OS file/port locks.
   */
  disconnect(): Promise<void>;

  /**
   * Dispatches a validated command to the adapter and awaits response.
   *
   * @param command - The sanitized AT or OBD command string.
   * @param timeoutMs - Max milliseconds to await terminal response before failing.
   */
  send(command: string, timeoutMs?: number): Promise<string>;

  /**
   * Subscribes to transport connection lifecycle transitions.
   */
  onStateChange(callback: StateChangeCallback): () => void;
}
