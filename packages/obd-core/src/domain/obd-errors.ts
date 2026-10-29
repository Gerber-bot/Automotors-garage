export class ObdError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ObdError';
  }
}

export class ObdSecurityError extends ObdError {
  public readonly attemptedCommand: string;

  constructor(command: string, reason = 'Read-only security policy prohibits this command.') {
    super(`[OBD SECURITY VIOLATION] Command '${command}' was rejected: ${reason}`);
    this.name = 'ObdSecurityError';
    this.attemptedCommand = command;
  }
}

export class ObdConnectionError extends ObdError {
  constructor(message: string) {
    super(`[OBD CONNECTION ERROR] ${message}`);
    this.name = 'ObdConnectionError';
  }
}

export class ObdTimeoutError extends ObdError {
  public readonly command: string;
  public readonly timeoutMs: number;

  constructor(command: string, timeoutMs: number) {
    super(`[OBD TIMEOUT] Command '${command}' timed out after ${timeoutMs}ms.`);
    this.name = 'ObdTimeoutError';
    this.command = command;
    this.timeoutMs = timeoutMs;
  }
}

export class ObdProtocolError extends ObdError {
  public readonly rawResponse: string;

  constructor(message: string, rawResponse: string) {
    super(`[OBD PROTOCOL ERROR] ${message} (Raw: "${rawResponse}")`);
    this.name = 'ObdProtocolError';
    this.rawResponse = rawResponse;
  }
}

export class ObdDecodeError extends ObdError {
  public readonly rawPayload: string;

  constructor(message: string, rawPayload: string) {
    super(`[OBD DECODE ERROR] ${message} (Payload: "${rawPayload}")`);
    this.name = 'ObdDecodeError';
    this.rawPayload = rawPayload;
  }
}
