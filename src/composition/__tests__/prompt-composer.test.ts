import { describe, expect, it } from 'bun:test';
import { composePrompt } from '../core/prompt-composer';
import type { CompositionInput } from '../types';

const template = {
  id: 'prompt-test',
  name: 'Prompt Test',
  version: '1.0.0',
  prompt: {
    system: 'You are a helpful clinician assistant.',
    main: 'Draft the assessment section.',
    rules: ['Use concise language.'],
  },
  layout: [
    {
      id: 'assessment-section',
      type: 'section',
      content: [
        {
          id: 'assessment-summary',
          slot: 'ai',
          outputPath: 'assessment.summary',
          aiDeps: ['subjective.mood'],
          guidance: ['Summarize the assessment findings.'],
        },
      ],
    },
  ],
};

const aiSchema = {
  $id: 'https://example.com/ai-schema',
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  type: 'object',
  additionalProperties: false,
  properties: {
    assessment: {
      type: 'object',
      additionalProperties: false,
      properties: {
        summary: { type: 'string' },
      },
    },
  },
};

describe('composePrompt', () => {
  it('returns lint warnings without throwing', () => {
    const input: CompositionInput = {
      template,
      aiSchema,
      nasSnapshot: {},
    };

    const result = composePrompt(input);

    expect(result.bundle.templateId).toBe('prompt-test');
    expect(result.lint.errors).toHaveLength(0);
    expect(result.lint.warnings.length).toBeGreaterThan(0);
  });
});
