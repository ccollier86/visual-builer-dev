/**
 * Schema-Constrained Generation
 *
 * Calls OpenAI with structured output constraints using response_format.
 * Validates AI output against AIS schema before returning.
 */

import type OpenAI from 'openai';
import type { PromptBundle } from '../../composition/types';
import type { GenerationOptions, GenerationResult } from '../types';
import type { ValidationResult } from '../../validation/types';
import { withRetry } from '../utils/retry-handler';

/**
 * Default generation options
 */
const DEFAULT_OPTIONS: Required<GenerationOptions> = {
  model: 'gpt-4-turbo',
  temperature: 0.7,
  maxTokens: 4000,
  retries: 3,
};

/**
 * Generates AI output using schema-constrained generation
 *
 * Following SOR principle: PromptBundle is the source of truth for prompt data.
 * Following DI principle: OpenAI client and validator are injected dependencies.
 *
 * @param client - Configured OpenAI client (injected)
 * @param bundle - Complete prompt bundle from composition phase
 * @param validator - Function to validate AI output against AIS schema (injected)
 * @param options - Optional generation parameters
 * @returns Generation result with validated AI output and usage metrics
 * @throws {Error} If API call fails or output validation fails
 */
export async function generateWithSchema(
  client: OpenAI,
  bundle: PromptBundle,
  validator: (data: any, schema: any) => ValidationResult,
  options: Partial<GenerationOptions> = {}
): Promise<GenerationResult> {
  const finalOptions = { ...DEFAULT_OPTIONS, ...options };

  // Prepare response_format for OpenAI structured outputs
  const responseFormat = {
    type: 'json_schema' as const,
    json_schema: {
      name: 'clinical_note',
      strict: true,
      schema: bundle.jsonSchema,
    },
  };

  // Call OpenAI API with retry logic
  const completion = await withRetry(
    async () => {
      return await client.chat.completions.create({
        model: finalOptions.model,
        messages: bundle.messages,
        response_format: responseFormat,
        temperature: finalOptions.temperature,
        max_tokens: finalOptions.maxTokens,
      });
    },
    { maxRetries: finalOptions.retries }
  );

  // Extract AI output
  const messageContent = completion.choices[0]?.message?.content;
  if (!messageContent) {
    throw new Error('OpenAI response missing message content');
  }

  // Parse JSON output
  let aiOutput: any;
  try {
    aiOutput = JSON.parse(messageContent);
  } catch (error: any) {
    throw new Error(
      `Failed to parse OpenAI response as JSON: ${error.message}`,
      { cause: error }
    );
  }

  // Validate against AIS schema
  const validationResult = validator(aiOutput, bundle.jsonSchema);
  if (!validationResult.ok) {
    const errorMessages = validationResult.errors
      .map(err => `${err.instancePath}: ${err.message}`)
      .join(', ');

    throw new Error(
      `AI output failed schema validation: ${errorMessages}. ` +
      `This indicates the AI did not follow the schema constraints properly.`
    );
  }

  // Build result with usage metrics
  const usage = completion.usage;
  if (!usage) {
    throw new Error('OpenAI response missing usage metrics');
  }

  return {
    output: aiOutput,
    usage: {
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens,
    },
    model: completion.model,
  };
}
