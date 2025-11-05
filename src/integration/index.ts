/**
 * Integration Domain
 *
 * OpenAI SDK integration for schema-constrained generation.
 * Calls OpenAI API with response_format to enforce JSON schema compliance.
 */

// Core functionality
export { createOpenAIClient } from './core/openai-client';
export { generateWithSchema } from './core/schema-generator';

// Utilities
export { withRetry } from './utils/retry-handler';

// Types
export type {
  GenerationOptions,
  GenerationResult,
  RetryConfig,
} from './types';
