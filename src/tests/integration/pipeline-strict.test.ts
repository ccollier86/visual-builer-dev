import { describe, expect, it } from 'bun:test';
import type { NoteTemplate } from '../../derivation/types';
import type { DesignTokens } from '../../tokens/types';
import defaultTokensRaw from '../../tokens/defaults/default-tokens.json';

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
    const fakeOpenAIClient = {
      responses: {
        create: async () => ({
          id: 'resp-integration-001',
          object: 'response',
          created: Date.now(),
          model: 'mock-gpt',
          status: 'completed',
          output: [],
          output_text: JSON.stringify({
            assessment: { summary: 'Patient Jane Doe presents with stable mood.' },
          }),
          usage: {
            input_tokens: 10,
            output_tokens: 5,
            total_tokens: 15,
          },
          prompt: {},
        }),
      },
    } as const;

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
        openaiClient: fakeOpenAIClient as any,
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
