import type { z } from 'zod';
import type { AIProviderPort, AIOptions } from '../ports/ai-provider.port.ts';
import type { StructuredExtractionPort } from '../ports/structured-extraction.port.ts';

export class MockAIProvider implements AIProviderPort, StructuredExtractionPort {
  private shouldTimeout: boolean = false;
  private shouldReturnMalformedJson: boolean = false;
  private configured: boolean = true;
  private customCompletionHandler?: (prompt: string) => string;

  public setConfigured(configured: boolean): void {
    this.configured = configured;
  }

  public isConfigured(): boolean {
    return this.configured;
  }

  public setSimulateTimeout(simulate: boolean): void {
    this.shouldTimeout = simulate;
  }

  public setSimulateMalformed(simulate: boolean): void {
    this.shouldReturnMalformedJson = simulate;
  }

  public setCustomCompletion(handler: (prompt: string) => string): void {
    this.customCompletionHandler = handler;
  }

  public async generateCompletion(prompt: string, options?: AIOptions): Promise<string> {
    if (!this.configured) {
      throw new Error('AI Provider is unconfigured.');
    }

    if (this.shouldTimeout) {
      const timeout = options?.timeoutMs ?? 50;
      await new Promise((resolve) => setTimeout(resolve, timeout + 10));
      throw new Error('AI Provider request timed out.');
    }

    if (this.customCompletionHandler) {
      return this.customCompletionHandler(prompt);
    }

    if (this.shouldReturnMalformedJson) {
      return '{ "codesAnalyzed": "not-an-array", "brokenJson": true, ';
    }

    // Default mock response: structured json for OBD2 interpretation
    return JSON.stringify({
      codesAnalyzed: ['P0300'],
      systemicImpact: 'Random or multiple cylinder misfire detected. May cause catalytic converter overheating.',
      urgencyLevel: 'IMMEDIATE_ACTION',
      mechanicChecklist: ['Inspect ignition coils', 'Verify spark plug condition', 'Check fuel pressure'],
      disclaimer: 'AI-assisted technical guidance. Physical diagnosis by certified technician required.',
    });
  }

  public async extract<T>(
    prompt: string,
    schema: z.ZodType<T>,
    options?: AIOptions
  ): Promise<T> {
    if (!this.configured) {
      throw new Error('AI extraction unavailable: provider not configured.');
    }
    const rawJson = await this.generateCompletion(prompt, options);
    try {
      const parsed = JSON.parse(rawJson);
      return schema.parse(parsed);
    } catch (err: unknown) {
      throw new Error(`AI structured extraction schema validation failed: ${(err as Error).message}`);
    }
  }

  public getModelVersion(): string {
    return 'mock-gpt-4o-mini-v1';
  }

  public getProviderName(): string {
    return 'MockAIProvider';
  }
}
