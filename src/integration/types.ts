/**
 * Integration Domain Types
 *
 * Types for OpenAI API integration and schema-constrained generation.
 */

/**
 * Configuration options for AI generation
 */
export interface GenerationOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  retries?: number;
}

/**
 * Result from AI generation with usage metrics
 */
export interface GenerationResult {
  output: any; // AI-generated JSON conforming to schema
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
}

/**
 * Retry configuration for API calls
 */
export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryableStatusCodes: number[];
}

/**
 * Default retry configuration
 * Exponential backoff: 1s, 2s, 4s
 * Handles rate limits (429) and server errors (500-599)
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 8000,
  retryableStatusCodes: [429, 500, 502, 503, 504],
};

/**
 * Default generation options
 */
export const DEFAULT_OPTIONS: Required<GenerationOptions> = {
  model: 'gpt-5',
  temperature: 0.7,
  maxTokens: 4000,
  retries: 3,
};
