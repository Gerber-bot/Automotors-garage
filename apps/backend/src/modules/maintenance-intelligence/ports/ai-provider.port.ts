export interface AIOptions {
  readonly timeoutMs?: number;
  readonly maxRetries?: number;
  readonly temperature?: number;
  readonly maxTokens?: number;
  readonly workshopId?: string; // For workshop quota tracking
  readonly userId?: string;     // For individual vehicle owner quota tracking
}

export interface AIProviderPort {
  generateCompletion(prompt: string, options?: AIOptions): Promise<string>;
  getModelVersion(): string;
  getProviderName(): string;
  isConfigured(): boolean;
}
