import { describe, expect, it, mock } from 'bun:test';
import type { NoteTemplate } from '../../derivation/types';
import type { DesignTokens } from '../../tokens/types';
import defaultTokensRaw from '../../tokens/defaults/default-tokens.json';
import type { AIPayload } from '../../types/payloads';

// Mock the integration layer so the pipeline never calls the real OpenAI client.
mock.module('../../integration', () => {
  return {
    createOpenAIClient: () => ({}),
    generateWithSchema: async (
      _client: unknown,
      _bundle: unknown,
      validator: (data: AIPayload) => { ok: boolean; errors: unknown[]; warnings: unknown[] },
      _options?: unknown
    ) => {
      const output: AIPayload = {
        assessment: { summary: 'Patient Jane Doe presents with stable mood.' },
      };

      const validation = validator(output);
      if (!validation.ok) {
        throw new Error(
          `Mock generator produced invalid payload: ${JSON.stringify(validation.errors)}`
        );
      }

      return {
        output,
        usage: {
          promptTokens: 10,
          completionTokens: 5,
          totalTokens: 15,
        },
        model: 'mock-gpt',
        warnings: [],
      };
    },
  };
});

import { runPipeline } from '../../pipeline';
import type { SourceData } from '../../resolution';

const template: NoteTemplate = {
  id: 'tmpl-integration',
  name: 'Integration Template',
  version: '1.0.0',
  style: {
    font: 'Inter',
    color: '#111111',
    accent: '#3366FF',
    spacing: 8,
    print: {
      size: 'Letter',
      margin: '0.75in',
    },
  },
  prompt: {
    system: 'You are a diligent clinical assistant.',
    main: 'Summarize the assessment section.',
    rules: ['Use patient name when available.'],
  },
  layout: [
    {
      id: 'assessment-section',
      type: 'section',
      content: [
        {
          id: 'patient-name',
          slot: 'lookup',
          targetPath: 'patient.name',
          lookup: 'patient.name',
        },
        {
          id: 'assessment-summary',
          slot: 'ai',
          outputPath: 'assessment.summary',
          aiDeps: ['patient.name'],
          guidance: ['Provide a brief assessment summary referencing the patient by name.'],
        },
      ],
    },
  ],
};

const sourceData: SourceData = {
  patient: {
    name: 'Jane Doe',
  },
};

const tokens = defaultTokensRaw as DesignTokens;

describe('Pipeline integration (strict mode)', () => {
  it('runs end-to-end with strict guards and produces merged payload', async () => {
    const result = await runPipeline({
      template,
      sourceData,
      tokens,
      options: {
        validateSteps: true,
        guards: {
          resolution: { failOnWarning: true },
          promptLint: { failOnWarning: true },
        },
        verbose: true,
      },
    });

    expect(result.warnings).toBeUndefined();
    const assessment = result.payload?.assessment as Record<string, unknown> | undefined;
    expect(assessment).toBeDefined();
    const summary =
      assessment && typeof assessment.summary === 'string'
        ? assessment.summary
        : undefined;
    expect(summary).toBe('Patient Jane Doe presents with stable mood.');
    expect(result.nasSnapshot?.patient).toBeDefined();
    expect(result.html).toContain('Jane Doe');
    expect(result.model).toBe('mock-gpt');
  });
});
