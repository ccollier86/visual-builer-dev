/**
 * Schema Generator Tests
 *
 * Domain: integration/__tests__/schema-generator.test
 * Responsibility: Validate generateWithSchema retry and logging behaviour for empty outputs.
 * SOR: Prompt bundle and responses defined within this test file.
 * SOD: Ensures generateWithSchema remains focused on schema-constrained generation.
 * DI: OpenAI client dependency is injected via a stub implementation.
 */

import { describe, expect, it } from 'bun:test';
import type OpenAI from 'openai';
import type { Response } from 'openai/resources/responses/responses';
import { generateWithSchema } from '../core/schema-generator';
import type { PromptBundle } from '../../composition/types';
import type { SchemaValidator } from '../../validation/types';
import type { IntegrationDiagnosticEvent } from '../types';

/**
 * Builds a minimal prompt bundle fixture for tests.
 */
function buildPromptBundle(): PromptBundle {
  return {
    id: 'bundle-1',
    templateId: 'template-1',
    templateVersion: '1.0.0',
    messages: [
      { role: 'system', content: 'System instructions.' },
      { role: 'user', content: 'User prompt content.' },
    ],
    jsonSchema: {} as unknown as PromptBundle['jsonSchema'],
    fieldGuide: [],
    context: {
      nasSlices: {},
    },
  };
}

/**
 * Creates a synthetic OpenAI Response object for unit tests.
 */
function buildResponse(overrides: Partial<Response>): Response {
  const base = {
    id: 'resp-1',
    object: 'response',
    created: Date.now(),
    model: 'gpt-4o-test',
    status: 'completed',
    output: [],
    output_text: '{"ok": true}',
    usage: {
      input_tokens: 10,
      output_tokens: 5,
      total_tokens: 15,
    },
    response_ms: 1000,
    prompt: {
      id: 'prompt-1',
    },
  } as unknown as Response;

  return { ...base, ...overrides };
}

/**
 * Provides a successful schema validator stub for tests.
 */
function createValidator(): SchemaValidator {
  return (data: unknown) => {
    return {
      ok: true,
      errors: [],
      warnings: [],
    };
  };
}

describe('generateWithSchema', () => {
  it('retries once when the first response is missing output_text', async () => {
    const diagnostics: IntegrationDiagnosticEvent[] = [];

    const responses = [
      buildResponse({
        output_text: '',
        output: [],
      }),
      buildResponse({
        id: 'resp-2',
        output_text: '{"mock": true}',
      }),
    ];

    let createCallCount = 0;
    const create = async (): Promise<Response> => {
      createCallCount++;
      const next = responses.shift();
      if (!next) {
        throw new Error('No response available');
      }
      return next;
    };
    const client = { responses: { create } } as unknown as OpenAI;

    const result = await generateWithSchema(
      client,
      buildPromptBundle(),
      createValidator(),
      { retries: 0 },
      {
        warn: (event) => diagnostics.push(event),
      }
    );

    expect(result.output).toEqual({ mock: true });
    expect(diagnostics.length).toBe(1);
    expect(createCallCount).toBe(2);
    expect(diagnostics[0].code).toBe('missing-output');
    expect(diagnostics[0].attempt).toBe(1);
  });

  it('throws after retrying when output_text is still missing', async () => {
    const diagnostics: IntegrationDiagnosticEvent[] = [];

    const responses = [
      buildResponse({ output_text: '' }),
      buildResponse({ output_text: '' }),
    ];

    let createCallCount = 0;
    const create = async (): Promise<Response> => {
      createCallCount++;
      const next = responses.shift();
      if (!next) {
        throw new Error('No response available');
      }
      return next;
    };
    const client = { responses: { create } } as unknown as OpenAI;

    const generationPromise = generateWithSchema(
      client,
      buildPromptBundle(),
      createValidator(),
      { retries: 0 },
      {
        warn: (event) => diagnostics.push(event),
      }
    );

    await expect(generationPromise).rejects.toThrow('OpenAI response missing message content after retry');

    expect(diagnostics.length).toBe(2);
    expect(createCallCount).toBe(2);
    expect(diagnostics.every(event => event.code === 'missing-output')).toBe(true);
  });
});
