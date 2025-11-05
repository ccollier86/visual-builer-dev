/**
 * Retry Handler with Exponential Backoff
 *
 * Wraps API calls with retry logic for transient failures.
 * Handles rate limits (429) and server errors (500-599).
 */

import type { RetryConfig } from '../types';
import { DEFAULT_RETRY_CONFIG } from '../types';

/**
 * Determines if an error is retryable
 */
function isRetryableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const record = error as Record<string, unknown>;
  const code = typeof record.code === 'string' ? record.code : undefined;
  if (code === 'ECONNRESET' || code === 'ETIMEDOUT') {
    return true;
  }

  const status = typeof record.status === 'number' ? record.status : undefined;
  if (status && DEFAULT_RETRY_CONFIG.retryableStatusCodes.includes(status)) {
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
  let lastError: unknown;

  for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;

      const retryable = isRetryableError(error);
      if (!retryable) {
        throw normalizeError(error);
      }

      if (attempt === finalConfig.maxRetries) {
        throw new Error(
          `Request failed after ${finalConfig.maxRetries} retries. Last error: ${extractErrorMessage(error) ?? 'Unknown error'}`,
          { cause: normalizeError(error) }
        );
      }

      // Calculate and wait for backoff delay
      const delay = calculateDelay(attempt, finalConfig.baseDelayMs, finalConfig.maxDelayMs);
      await sleep(delay);
    }
  }

  // All retries exhausted
  throw new Error(
    `Request failed after ${finalConfig.maxRetries} retries. ` +
    `Last error: ${extractErrorMessage(lastError) ?? 'Unknown error'}`,
    { cause: normalizeError(lastError) }
  );
}

function normalizeError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  return new Error(typeof error === 'string' ? error : 'Unknown error', { cause: error });
}

function extractErrorMessage(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') {
    return undefined;
  }

  const message = (error as Record<string, unknown>).message;
  return typeof message === 'string' ? message : undefined;
}
