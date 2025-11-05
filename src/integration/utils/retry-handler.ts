/**
 * Retry Handler with Exponential Backoff
 *
 * Wraps API calls with retry logic for transient failures.
 * Handles rate limits (429) and server errors (500-599).
 */

import type { RetryConfig } from '../types';

/**
 * Default retry configuration
 * Exponential backoff: 1s, 2s, 4s
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 8000,
  retryableStatusCodes: [429, 500, 502, 503, 504],
};

/**
 * Determines if an error is retryable
 */
function isRetryableError(error: any): boolean {
  // Network errors
  if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
    return true;
  }

  // Rate limit or server errors
  if (error.status && DEFAULT_RETRY_CONFIG.retryableStatusCodes.includes(error.status)) {
    return true;
  }

  return false;
}

/**
 * Calculates exponential backoff delay
 */
function calculateDelay(attempt: number, baseDelayMs: number, maxDelayMs: number): number {
  const delay = baseDelayMs * Math.pow(2, attempt);
  return Math.min(delay, maxDelayMs);
}

/**
 * Sleeps for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Wraps an async function with retry logic
 *
 * @param fn - Async function to execute with retries
 * @param config - Optional retry configuration (uses defaults if not provided)
 * @returns Result of the function call
 * @throws Last error if all retries exhausted
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: any;

  for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Don't retry if not retryable or max retries reached
      if (!isRetryableError(error) || attempt === finalConfig.maxRetries) {
        break;
      }

      // Calculate and wait for backoff delay
      const delay = calculateDelay(attempt, finalConfig.baseDelayMs, finalConfig.maxDelayMs);
      await sleep(delay);
    }
  }

  // All retries exhausted
  throw new Error(
    `Request failed after ${finalConfig.maxRetries} retries. ` +
    `Last error: ${lastError?.message || 'Unknown error'}`,
    { cause: lastError }
  );
}
