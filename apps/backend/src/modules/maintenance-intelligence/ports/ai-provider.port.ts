export interface AIOptions {
  readonly timeoutMs?: number;
  readonly maxRetries?: number;
  readonly temperature?: number;
  readonly maxTokens?: number;
  readonly workshopId?: string; // For quota tracking
}

export interface AIProviderPort {
  generateCompletion(prompt: string, options?: AIOptions): Promise<string>;
  getModelVersion(): string;
  getProviderName(): string;
}
