export interface TranscriptionOptions {
  readonly language?: string; // e.g. "es"
  readonly timeoutMs?: number;
  readonly promptContext?: string; // Mechanic jargon context (e.g. "aceite, bujías, pastillas de freno, odómetro")
}

export interface TranscriptionResult {
  readonly text: string;
  readonly confidence: number;
  readonly durationSeconds?: number;
}

export interface TranscriptionProviderPort {
  transcribe(
    audioBuffer: Buffer,
    mimeType: string,
    options?: TranscriptionOptions
  ): Promise<TranscriptionResult>;
  getProviderName(): string;
}
