/**
 * Pipeline Core Helpers
 *
 * Domain: pipeline/core
 * Responsibility: Shared utilities for the pipeline orchestrator
 * that keep the main file focused on orchestration logic.
 */

import { performance } from 'node:perf_hooks';
import OpenAI from 'openai';
import { createOpenAIClient } from '../../integration';
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

export interface ClientResolution {
	client: OpenAI;
}

/**
 * Resolve the OpenAI client to use for this pipeline run without mutating global state.
 */
export function resolveOpenAIClient(options: PipelineOptions): ClientResolution {
	if (options.openaiClient) {
		return { client: options.openaiClient };
	}

	if (options.openaiKey) {
		return {
			client: new OpenAI({ apiKey: options.openaiKey }),
		};
	}

	return { client: createOpenAIClient() };
}

/**
 * Measure the duration of an async stage, returning both result and timing.
 */
export async function timeStage<T>(fn: () => Promise<T>): Promise<{
	result: T;
	durationMs: number;
}> {
	const start = performance.now();
	const result = await fn();
	return {
		result,
		durationMs: performance.now() - start,
	};
}
