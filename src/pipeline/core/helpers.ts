/**
 * Pipeline Core Helpers
 *
 * Domain: pipeline/core
 * Responsibility: Shared utilities for the pipeline orchestrator
 * that keep the main file focused on orchestration logic.
 */

import type { PipelineError, PipelineOptions } from '../types';

/**
 * Create a structured pipeline error for consistent error handling.
 */
export function createPipelineError(
  message: string,
  step: string,
  cause?: unknown
): PipelineError {
  const error = new Error(message) as PipelineError;
  error.name = 'PipelineError';
  error.step = step;
  error.cause = cause;
  return error;
}

/**
 * Log helper that honours verbose mode.
 */
export function logVerbose(options: PipelineOptions, message: string): void {
  if (options.verbose) {
    console.log(`[Pipeline] ${message}`);
  }
}
