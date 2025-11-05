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
