/**
 * Mock Generation Helpers
 *
 * Domain: pipeline/core
 * Responsibility: Provide feature-gated utilities for supplying mock AI outputs
 * without bloating the main pipeline orchestrator.
 */

import { DEFAULT_OPTIONS, type GenerationResult } from '../../integration/types';
import type {
  MockGenerationContext,
  MockGenerationProvider,
  MockGenerationResult,
  PipelineOptions,
} from '../types';

const MOCK_ENV_FLAG = 'PIPELINE_ENABLE_MOCK_AI';

/**
 * Determine whether mock AI generations are permitted for the current process.
 */
export function isMockGenerationEnabled(): boolean {
  const flag = process.env[MOCK_ENV_FLAG];
  if (!flag) {
    return false;
  }

  const value = flag.trim().toLowerCase();
  return value === '1' || value === 'true' || value === 'yes';
}

interface ResolveInput {
  provider: MockGenerationProvider;
  context: MockGenerationContext;
  options: PipelineOptions;
}

/**
 * Evaluate a mock generation provider and normalise the result to the integration contract.
 */
export async function resolveMockGeneration(
  input: ResolveInput
): Promise<{ generation: GenerationResult; mocked: true }> {
  const { provider, context, options } = input;
  const resolved =
    typeof provider === 'function'
      ? await provider(context)
      : provider;

  if (!resolved || typeof resolved !== 'object') {
    throw createMockGenerationError('Mock generation provider returned an invalid result', resolved);
  }

  const result = resolved as MockGenerationResult;
  const output = result.output;

  if (!output || typeof output !== 'object') {
    throw createMockGenerationError('Mock generation provider must supply an output payload', resolved);
  }

  const usage = normaliseUsage(result.usage);
  const defaultModel = options.generationOptions?.model ?? DEFAULT_OPTIONS.model;

  return {
    generation: {
      output,
      usage,
      model: result.model ?? defaultModel,
      responseId: result.responseId,
      promptId: result.promptId,
      warnings: result.warnings,
    },
    mocked: true,
  };
}

function normaliseUsage(
  usage?: Partial<GenerationResult['usage']>
): GenerationResult['usage'] {
  if (!usage) {
    return {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    };
  }

  const promptTokens = usage.promptTokens ?? 0;
  const completionTokens = usage.completionTokens ?? 0;
  const totalTokens = usage.totalTokens ?? promptTokens + completionTokens;

  return {
    promptTokens,
    completionTokens,
    totalTokens,
  };
}

function createMockGenerationError(message: string, cause: unknown): Error {
  const error = new Error(message);
  (error as Error & { cause?: unknown }).cause = cause;
  return error;
}
