import type { z } from 'zod';
import type { AIProviderPort, AIOptions } from '../ports/ai-provider.port.ts';
import type { StructuredExtractionPort } from '../ports/structured-extraction.port.ts';

export interface OpenAIConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  defaultTimeoutMs?: number;
  maxMonthlyBudgetPerWorkshop?: number;
  maxMonthlyBudgetPerOwner?: number;
}

export class OpenAIAIAdapter implements AIProviderPort, StructuredExtractionPort {
  private readonly config: OpenAIConfig;
  private readonly workshopUsageCounter = new Map<string, number>();
  private readonly ownerUsageCounter = new Map<string, number>();

  constructor(config: OpenAIConfig = {}) {
    this.config = {
      model: config.model ?? 'gpt-4o-mini',
      defaultTimeoutMs: Math.min(config.defaultTimeoutMs ?? 5000, 10000), // Enforce max 10s
      maxMonthlyBudgetPerWorkshop: config.maxMonthlyBudgetPerWorkshop ?? 1000,
      maxMonthlyBudgetPerOwner: config.maxMonthlyBudgetPerOwner ?? 100,
      ...config,
    };
  }

  public isConfigured(): boolean {
    const key = this.config.apiKey?.trim();
    if (!key) return false;
    if (key.includes('replace_with') || key.includes('your_openai_api_key') || key === 'placeholder') {
      return false;
    }
    return key.startsWith('sk-');
  }

  public getModelVersion(): string {
    return this.config.model ?? 'gpt-4o-mini';
  }

  public getProviderName(): string {
    return 'OpenAIAdapter';
  }

  /**
   * Sanitizes input to protect against PII leakage and prompt injection.
   */
  public sanitizePrompt(input: string): string {
    return input
      .replace(/\b(?:\d{4}[ -]?){3}\d{4}\b/g, '[CREDIT_CARD_REDACTED]')
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL_REDACTED]')
      .replace(/(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{4}/g, '[PHONE_REDACTED]')
      .replace(/<\/?(?:system|user|assistant|untrusted_mechanic_input)>/gi, '');
  }

  /**
   * Enforces tenant and vehicle owner rate limits and budget constraints.
   */
  private checkQuota(options?: AIOptions): void {
    if (options?.userId) {
      const current = this.ownerUsageCounter.get(options.userId) ?? 0;
      if (current >= (this.config.maxMonthlyBudgetPerOwner ?? 100)) {
        throw new Error(`AI budget quota exceeded for vehicle owner '${options.userId}'. Operations operate in deterministic mode.`);
      }
      this.ownerUsageCounter.set(options.userId, current + 1);
    }
    if (options?.workshopId) {
      const current = this.workshopUsageCounter.get(options.workshopId) ?? 0;
      if (current >= (this.config.maxMonthlyBudgetPerWorkshop ?? 1000)) {
        throw new Error(`AI budget quota exceeded for workshop '${options.workshopId}'. Operations operate in deterministic mode.`);
      }
      this.workshopUsageCounter.set(options.workshopId, current + 1);
    }
  }

  /**
   * Generates completion with retries, timeout, and prompt injection defense.
   * Throws if provider is unconfigured — does NOT simulate fake completions.
   */
  public async generateCompletion(prompt: string, options?: AIOptions): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('AI Provider is unconfigured (missing or invalid API key). AI features are disabled to prevent falsified outputs.');
    }

    this.checkQuota(options);

    const sanitized = this.sanitizePrompt(prompt);
    const timeoutMs = Math.min(options?.timeoutMs ?? this.config.defaultTimeoutMs ?? 5000, 10000);
    const maxRetries = options?.maxRetries ?? 2;

    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt <= maxRetries) {
      try {
        return await this.executeWithTimeout(sanitized, timeoutMs);
      } catch (err: unknown) {
        lastError = err as Error;
        attempt++;
        if (attempt <= maxRetries) {
          // Exponential backoff
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 50));
        }
      }
    }

    throw new Error(`AI Provider failed after ${maxRetries} retries: ${lastError?.message}`);
  }

  private async executeWithTimeout(prompt: string, timeoutMs: number): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${this.config.baseUrl ?? 'https://api.openai.com/v1'}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            {
              role: 'system',
              content:
                'You are an expert automotive systems assistant. Analyze maintenance and diagnostic data strictly as requested. Output valid JSON only, without markdown wrappers.',
            },
            {
              role: 'user',
              content: `<vehicle_data>\n${prompt}\n</vehicle_data>`,
            },
          ],
          temperature: 0.1,
          max_tokens: 1500,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`OpenAI HTTP ${response.status}: ${text}`);
      }

      const data = (await response.json()) as any;
      return data.choices?.[0]?.message?.content ?? '';
    } finally {
      clearTimeout(timer);
    }
  }

  public async extract<T>(
    prompt: string,
    schema: z.ZodType<T>,
    options?: AIOptions
  ): Promise<T> {
    if (!this.isConfigured()) {
      throw new Error('AI extraction unavailable: provider not configured.');
    }
    const rawOutput = await this.generateCompletion(prompt, options);
    try {
      const cleaned = rawOutput.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
      const json = JSON.parse(cleaned);
      return schema.parse(json);
    } catch (err: unknown) {
      throw new Error(`Structured extraction validation failed: ${(err as Error).message}`);
    }
  }
}
