import type { z } from 'zod';
import type { AIOptions } from './ai-provider.port.ts';

export interface StructuredExtractionPort {
  extract<T>(prompt: string, schema: z.ZodType<T>, options?: AIOptions): Promise<T>;
  isConfigured(): boolean;
}
