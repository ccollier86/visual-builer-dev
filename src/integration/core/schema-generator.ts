/**
 * Schema-Constrained Generation
 *
 * Calls OpenAI with structured output constraints using response_format.
 * Validates AI output against AIS schema before returning.
 */

import type OpenAI from 'openai';
import type { Response, ResponseCreateParams } from 'openai/resources/responses/responses';
import type { PromptBundle } from '../../composition/types';
import type { GenerationOptions, GenerationResult } from '../types';
import type { SchemaValidator } from '../../validation/types';
import type { AIPayload } from '../../types/payloads';
import { withRetry } from '../utils/retry-handler';
import { DEFAULT_OPTIONS } from '../types';

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
  validator: SchemaValidator,
  options: Partial<GenerationOptions> = {}
): Promise<GenerationResult> {
  const finalOptions = { ...DEFAULT_OPTIONS, ...options };

  // Prepare response_format for OpenAI structured outputs
  const responseFormat = {
    type: 'json_schema' as const,
    name: 'clinical_note',
    strict: true,
    schema: bundle.jsonSchema as unknown as Record<string, unknown>,
  };

  const input: ResponseCreateParams['input'] = bundle.messages.map(message => ({
    role: message.role,
    content: [{ type: 'input_text' as const, text: message.content }],
  }));

  // Call OpenAI API with retry logic
  const requestBody: ResponseCreateParams = {
    model: finalOptions.model,
    input,
    text: { format: responseFormat },
    max_output_tokens: finalOptions.maxTokens,
  };

  if (shouldSendTemperature(finalOptions.model, finalOptions.temperature)) {
    requestBody.temperature = finalOptions.temperature;
  }

  const completion = await withRetry<Response>(
    async () => {
      return (await client.responses.create(requestBody)) as Response;
    },
    { maxRetries: finalOptions.retries }
  );

  // Extract AI output
  const messageContent = extractFirstTextOutput(completion);
  if (!messageContent) {
    throw new Error('OpenAI response missing message content');
  }

  // Parse JSON output
  let aiOutput: AIPayload;
  try {
    aiOutput = JSON.parse(messageContent) as AIPayload;
  } catch (error: unknown) {
    const reason = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(
      `Failed to parse OpenAI response as JSON: ${reason}`,
      { cause: error }
    );
  }

  // Validate against AIS schema
  const validationResult = validator(aiOutput);
  if (validationResult.errors.length > 0) {
    const errorMessages = validationResult.errors
      .map(err => `${err.instancePath}: ${err.message}`)
      .join(', ');

    throw new Error(
      `AI output failed schema validation: ${errorMessages}. ` +
      `This indicates the AI did not follow the schema constraints properly.`
    );
  }

  const validationWarnings = validationResult.warnings;

  // Build result with usage metrics
  const usage = completion.usage;
  if (!usage) {
    throw new Error('OpenAI response missing usage metrics');
  }

  return {
    output: aiOutput,
    usage: {
      promptTokens: usage.input_tokens,
      completionTokens: usage.output_tokens,
      totalTokens: usage.total_tokens,
    },
    model: completion.model,
    warnings: validationWarnings.length > 0 ? validationWarnings : undefined,
  };
}

function extractFirstTextOutput(response: Response): string | null {
  if (typeof response.output_text === 'string' && response.output_text.trim().length > 0) {
    return response.output_text;
  }

  if (Array.isArray(response.output)) {
    for (const item of response.output) {
      if (!item || typeof item !== 'object') continue;

      // Direct text output item
      if ('type' in item && (item as { type?: string }).type === 'output_text' && 'text' in item) {
        const text = (item as { text?: string }).text;
        if (typeof text === 'string' && text.trim().length > 0) {
          return text;
        }
      }

      const contentList = (item as { content?: Array<Record<string, unknown>> }).content;
      if (Array.isArray(contentList)) {
        for (const content of contentList) {
          if (!content) continue;
          const type = typeof content.type === 'string' ? content.type : undefined;
          const text = typeof content.text === 'string' ? content.text : undefined;

          if (type === 'output_text' || type === 'text') {
            if (text && text.trim().length > 0) {
              return text;
            }
          }

          if (type && type.startsWith('json')) {
            // Structured outputs may surface as JSON payloads
            if (typeof content.json === 'string') {
              return content.json;
            }
            if (content.json && typeof content.json === 'object') {
              return JSON.stringify(content.json);
            }
            if (typeof content.output === 'string') {
              return content.output;
            }
          }
        }
      }
    }
  }

  return null;
}

function shouldSendTemperature(model?: string, temperature?: number): boolean {
  if (temperature === undefined || temperature === null) {
    return false;
  }

  if (!model) {
    return true;
  }

  const normalized = model.toLowerCase();

  if (normalized.startsWith('gpt-5')) {
    return false;
  }

  return true;
}
