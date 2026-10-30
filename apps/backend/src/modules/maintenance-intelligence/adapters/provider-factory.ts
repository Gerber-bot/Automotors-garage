import type { AIProviderPort } from '../ports/ai-provider.port.ts';
import type { StructuredExtractionPort } from '../ports/structured-extraction.port.ts';
import { MockAIProvider } from './mock-ai.adapter.ts';
import { OpenAIAIAdapter } from './openai-ai.adapter.ts';

export type SupportedAIProvider = 'mock' | 'openai';

export interface ProviderBundle {
  aiProvider: AIProviderPort;
  structuredExtraction: StructuredExtractionPort;
}

export class AIProviderFactory {
  public static create(
    providerType: SupportedAIProvider = 'mock',
    config?: { apiKey?: string; model?: string }
  ): ProviderBundle {
    if (providerType === 'openai') {
      const adapter = new OpenAIAIAdapter(config);
      return {
        aiProvider: adapter,
        structuredExtraction: adapter,
      };
    }

    const mockAi = new MockAIProvider();

    return {
      aiProvider: mockAi,
      structuredExtraction: mockAi,
    };
  }
}
