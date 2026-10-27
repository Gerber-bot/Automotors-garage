import type { z } from 'zod';
import type { AIProviderPort, AIOptions } from '../ports/ai-provider.port.ts';
import type {
  TranscriptionProviderPort,
  TranscriptionResult,
  TranscriptionOptions,
} from '../ports/transcription.port.ts';
import type { StructuredExtractionPort } from '../ports/structured-extraction.port.ts';

export class MockAIProvider implements AIProviderPort, StructuredExtractionPort {
  private shouldTimeout: boolean = false;
  private shouldReturnMalformedJson: boolean = false;
  private customCompletionHandler?: (prompt: string) => string;

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
    if (this.shouldTimeout) {
      const timeout = options?.timeoutMs ?? 50;
      await new Promise((resolve) => setTimeout(resolve, timeout + 10));
      throw new Error('AI Provider request timed out.');
    }

    if (this.customCompletionHandler) {
      return this.customCompletionHandler(prompt);
    }

    if (this.shouldReturnMalformedJson) {
      return '{ "odometerKm": "not-a-number", "brokenJson": true, ';
    }

    // Default mock response: structured json
    return JSON.stringify({
      odometerKm: 112000,
      workPerformed: ['oil_change', 'oil_filter_replacement'],
      suggestedNextServiceKm: 122000,
      diagnosisNotes: 'Engine running smoothly after service.',
      replacedParts: [{ description: 'Oil filter 5W30', quantity: 1 }],
      requiresConfirmation: true,
      confidence: 0.95,
      rawTranscription: prompt,
    });
  }

  public async extract<T>(
    prompt: string,
    schema: z.ZodType<T>,
    options?: AIOptions
  ): Promise<T> {
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

export class MockTranscriptionProvider implements TranscriptionProviderPort {
  private shouldFail: boolean = false;
  private shouldTimeout: boolean = false;
  private customTranscriptionText?: string;

  public setSimulateFailure(simulate: boolean): void {
    this.shouldFail = simulate;
  }

  public setSimulateTimeout(simulate: boolean): void {
    this.shouldTimeout = simulate;
  }

  public setCustomTranscription(text: string): void {
    this.customTranscriptionText = text;
  }

  public async transcribe(
    audioBuffer: Buffer,
    mimeType: string,
    options?: TranscriptionOptions
  ): Promise<TranscriptionResult> {
    if (this.shouldFail) {
      throw new Error('Transcription engine failed to process audio payload.');
    }

    if (this.shouldTimeout) {
      const timeout = options?.timeoutMs ?? 50;
      await new Promise((resolve) => setTimeout(resolve, timeout + 10));
      throw new Error('Audio transcription timed out.');
    }

    if (audioBuffer.length === 0) {
      throw new Error('Cannot transcribe empty audio buffer.');
    }

    return {
      text: this.customTranscriptionText ?? 'Cambié aceite y filtro a los 112 mil, próximo service a los 122 mil.',
      confidence: 0.98,
      durationSeconds: 4.2,
    };
  }

  public getProviderName(): string {
    return 'MockWhisperProvider';
  }
}
