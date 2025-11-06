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
const MAX_EMPTY_OUTPUT_ATTEMPTS = 2;

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

  let completion: Response | null = null;
  let messageContent: string | null = null;

  for (let attempt = 0; attempt < MAX_EMPTY_OUTPUT_ATTEMPTS; attempt++) {
    const current = await withRetry<Response>(
      async () => {
        return (await client.responses.create(requestBody)) as Response;
      },
      { maxRetries: finalOptions.retries }
    );

    validateResponseStatus(current);
    const refusalMessage = extractRefusal(current);
    if (refusalMessage) {
      throw new Error(`OpenAI refused to complete the request: ${refusalMessage}`);
    }

    const extracted = extractFirstTextOutput(current);
    if (extracted && extracted.trim().length > 0) {
      completion = current;
      messageContent = extracted;
      break;
    }

    logMissingOutputAttempt(attempt, current, finalOptions.model);

    if (attempt === MAX_EMPTY_OUTPUT_ATTEMPTS - 1) {
      throw new Error(
        'OpenAI response missing message content after retry. Check previous logs for raw completion preview.'
      );
    }
  }

  if (!completion || !messageContent) {
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
    responseId: typeof completion.id === 'string' ? completion.id : undefined,
    promptId: completion.prompt?.id ?? undefined,
    warnings: validationWarnings.length > 0 ? validationWarnings : undefined,
  };
}

function validateResponseStatus(response: Response): void {
  switch (response.status) {
    case 'completed':
      return;
    case 'incomplete': {
      const reason = response.incomplete_details?.reason;
      if (reason === 'max_output_tokens') {
        throw new Error(
          'OpenAI response truncated: reached max_output_tokens. Consider raising the token limit or simplifying the prompt.'
        );
      }
      if (reason === 'content_filter') {
        throw new Error(
          'OpenAI halted generation due to content filtering. Review the input data for disallowed content.'
        );
      }
      throw new Error(
        `OpenAI response incomplete: ${reason ?? 'unknown reason'}.`
      );
    }
    default:
      throw new Error(`OpenAI response returned unexpected status: ${response.status}`);
  }
}

function extractRefusal(response: Response): string | null {
  if (!Array.isArray(response.output)) {
    return null;
  }

  for (const block of response.output) {
    if (!block || typeof block !== 'object') continue;
    const contentList = (block as { content?: Array<Record<string, unknown>> }).content;
    if (!Array.isArray(contentList)) continue;

    for (const content of contentList) {
      if (!content) continue;
      if (content.type === 'refusal' && typeof content.refusal === 'string') {
        return content.refusal;
      }
    }
  }

  return null;
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

function logMissingOutputAttempt(attempt: number, response: Response, model?: string): void {
  const attemptNumber = attempt + 1;
  const meta = {
    attempt: attemptNumber,
    status: response.status,
    model,
    responseId: typeof response.id === 'string' ? response.id : undefined,
    promptId: response.prompt?.id ?? undefined,
  };

  let rawPreview: string;
  try {
    const serialised = JSON.stringify(response, null, 2);
    rawPreview =
      serialised.length > 4000 ? `${serialised.slice(0, 4000)}… (truncated)` : serialised;
  } catch {
    rawPreview = '[unserialisable response payload]';
  }

  console.warn(
    `[Integration] OpenAI response missing output_text (attempt ${attemptNumber}). Metadata: ${JSON.stringify(meta)}`
  );
  console.warn(`[Integration] Raw completion preview:\n${rawPreview}`);
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
