import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { NoteTemplate } from '../../derivation/types';
import type { SourceData } from '../../resolution';
import type { DesignTokens } from '../../tokens/types';
import defaultTokensRaw from '../../tokens/defaults/default-tokens.json';
import type { AIPayload } from '../../types/payloads';

const integrationCallLog: unknown[] = [];

// Mock the integration layer so we can assert logging without performing real API calls.
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
        assessment: { summary: 'Mocked assessment summary.' },
      };

      const validation = validator(output);
      if (!validation.ok) {
        throw new Error(
          `Mock generator produced invalid payload: ${JSON.stringify(validation.errors)}`
        );
      }

      integrationCallLog.push({ prompt: _bundle });

      return {
        output,
        usage: {
          promptTokens: 12,
          completionTokens: 6,
          totalTokens: 18,
        },
        model: 'mock-gpt-audit',
        responseId: 'resp-audit-123',
        promptId: 'prompt-audit-456',
        warnings: [],
      };
    },
  };
});

import {
	runPipeline,
	type PipelineLogger,
	type PipelineStartEvent,
	type PipelineSchemasEvent,
	type PipelineResolutionEvent,
	type PipelinePromptEvent,
	type PipelineAIRequestEvent,
	type PipelineAIResponseEvent,
	type PipelineMergeEvent,
	type PipelineRenderEvent,
	type PipelineStageTimingEvent,
	type PipelineTokenDiagnosticsEvent,
	type PipelineCompleteEvent,
	type PipelineErrorEvent,
} from '..';

const template: NoteTemplate = {
  id: 'tmpl-logging',
  name: 'Logging Template',
  version: '1.0.0',
  prompt: {
    system: 'System instructions here.',
    main: 'Summarize key findings.',
    rules: ['Stay concise.'],
  },
  style: {
    font: 'Open Sans',
    color: '#222222',
    accent: '#1155CC',
    spacing: 8,
  },
  layout: [
    {
      id: 'primary-section',
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
        },
      ],
    },
  ],
};

const sourceData: SourceData = {
  patient: {
    name: 'John Smith',
  },
};

const tokens = defaultTokensRaw as DesignTokens;

type LoggerEvent = {
  type: keyof PipelineLogger;
  event:
    | PipelineStartEvent
    | PipelineSchemasEvent
    | PipelineResolutionEvent
    | PipelinePromptEvent
    | PipelineAIRequestEvent
    | PipelineAIResponseEvent
    | PipelineMergeEvent
    | PipelineRenderEvent
    | PipelineStageTimingEvent
    | PipelineTokenDiagnosticsEvent
    | PipelineCompleteEvent
    | PipelineErrorEvent;
};

const recordEvent = <K extends keyof PipelineLogger>(
  events: LoggerEvent[],
  type: K
) =>
  ((payload: Parameters<NonNullable<PipelineLogger[K]>>[0]) => {
    events.push({ type, event: payload as LoggerEvent['event'] });
  }) as PipelineLogger[K];

const originalMockFlag = process.env.PIPELINE_ENABLE_MOCK_AI;

beforeEach(() => {
  integrationCallLog.length = 0;
  if (originalMockFlag === undefined) {
    delete process.env.PIPELINE_ENABLE_MOCK_AI;
  } else {
    process.env.PIPELINE_ENABLE_MOCK_AI = originalMockFlag;
  }
});

describe('runPipeline logging adapter', () => {
  it('emits structured events with a stable request id and audit metadata', async () => {
    const events: LoggerEvent[] = [];

    const logger: PipelineLogger = {
      onStart: recordEvent(events, 'onStart'),
      onSchemasDerived: recordEvent(events, 'onSchemasDerived'),
      onResolution: recordEvent(events, 'onResolution'),
      onPromptComposed: recordEvent(events, 'onPromptComposed'),
      onAIRequest: recordEvent(events, 'onAIRequest'),
      onAIResponse: recordEvent(events, 'onAIResponse'),
      onMergeCompleted: recordEvent(events, 'onMergeCompleted'),
      onRender: recordEvent(events, 'onRender'),
      onStageTiming: recordEvent(events, 'onStageTiming'),
      onTokenDiagnostics: recordEvent(events, 'onTokenDiagnostics'),
      onComplete: recordEvent(events, 'onComplete'),
      onError: recordEvent(events, 'onError'),
    };

    const result = await runPipeline({
      template,
      sourceData,
      tokens,
      options: {
        logger,
        verbose: false,
        generationOptions: {
          model: 'gpt-4o-mini',
          temperature: 0,
        },
      },
    });

    const eventKinds = events.map(e => e.type);
    const primaryEventOrder = eventKinds.filter(
      type => type !== 'onStageTiming' && type !== 'onTokenDiagnostics'
    );
    expect(primaryEventOrder).toEqual([
      'onStart',
      'onSchemasDerived',
      'onResolution',
      'onPromptComposed',
      'onAIRequest',
      'onAIResponse',
      'onMergeCompleted',
      'onRender',
      'onComplete',
    ]);

    expect(eventKinds).toContain('onStageTiming');
    expect(eventKinds).toContain('onTokenDiagnostics');

    const startEvent = events.find(e => e.type === 'onStart')?.event as PipelineStartEvent;
    expect(startEvent).toBeTruthy();
    expect(startEvent.templateId).toBe(template.id);
    expect(startEvent.templateName).toBe(template.name);
    expect(startEvent.options.requestId).toBe(startEvent.requestId);
    expect('logger' in (startEvent.options as Record<string, unknown>)).toBe(false);

    const requestId = startEvent.requestId;
    expect(typeof requestId).toBe('string');
    expect(requestId.length).toBeGreaterThan(0);
    events.forEach(({ event }) => {
      expect(event.requestId).toBe(requestId);
      expect(event.templateName).toBe(template.name);
    });

    const schemasEvent = events.find(e => e.type === 'onSchemasDerived')
      ?.event as PipelineSchemasEvent;
    expect(schemasEvent.aisSchema).toBeDefined();
    expect(schemasEvent.nasSchema).toBeDefined();
    expect(schemasEvent.rpsSchema).toBeDefined();

    const aiRequestEvent = events.find(e => e.type === 'onAIRequest')
      ?.event as PipelineAIRequestEvent;
    expect(aiRequestEvent.model).toBe('gpt-4o-mini');
    expect(aiRequestEvent.generationOptions?.temperature).toBe(0);
    expect(aiRequestEvent.prompt.messages.length).toBeGreaterThan(0);

    const aiResponseEvent = events.find(e => e.type === 'onAIResponse')
      ?.event as PipelineAIResponseEvent;
    expect(aiResponseEvent.result.model).toBe('mock-gpt-audit');
    expect(aiResponseEvent.result.responseId).toBe('resp-audit-123');
    expect(aiResponseEvent.result.promptId).toBe('prompt-audit-456');
    expect(aiResponseEvent.durationMs).toBeGreaterThanOrEqual(0);

    const mergeEvent = events.find(e => e.type === 'onMergeCompleted')
      ?.event as PipelineMergeEvent;
    expect(mergeEvent.finalPayload).toBe(result.payload);
    expect(mergeEvent.tokens.id).toBe(tokens.id);
    expect(Array.isArray(mergeEvent.conflicts)).toBe(true);

    const renderEvent = events.find(e => e.type === 'onRender')
      ?.event as PipelineRenderEvent;
    expect(renderEvent.htmlLength).toBe(result.html.length);
    expect(renderEvent.cssHash).toBe(result.css.hash);

    const stageEvents = events
      .filter(e => e.type === 'onStageTiming')
      .map(e => e.event as PipelineStageTimingEvent);
    const stageNames = stageEvents.map(event => event.stage);
    expect(stageNames).toEqual(
      expect.arrayContaining(['resolveNAS', 'composePrompt', 'generateWithSchema', 'compileCSS', 'renderNoteHTML'])
    );
    stageEvents.forEach(event => {
      expect(event.durationMs).toBeGreaterThanOrEqual(0);
    });

    const tokenEvent = events.find(e => e.type === 'onTokenDiagnostics')
      ?.event as PipelineTokenDiagnosticsEvent;
    expect(tokenEvent).toBeDefined();
    expect(tokenEvent.diagnostics.entries.length).toBeGreaterThan(0);

    const completeEvent = events.find(e => e.type === 'onComplete')
      ?.event as PipelineCompleteEvent;
    expect(completeEvent.durationMs).toBeGreaterThanOrEqual(0);
    expect(completeEvent.warnings).toBeUndefined();

    expect(result.responseId).toBe('resp-audit-123');
    expect(result.promptId).toBe('prompt-audit-456');
    expect(result.tokenDiagnostics?.entries.length).toBeGreaterThan(0);
    expect(events.some(e => e.type === 'onError')).toBe(false);
  });

  it('uses mock generation when the feature flag is enabled', async () => {
    process.env.PIPELINE_ENABLE_MOCK_AI = 'true';

    const events: LoggerEvent[] = [];
    const logger: PipelineLogger = {
      onAIResponse: recordEvent(events, 'onAIResponse'),
    };

    const result = await runPipeline({
      template,
      sourceData,
      tokens,
      options: {
        logger,
        mockGeneration: () => ({
          output: {
            assessment: { summary: 'Fixture summary' },
          },
          usage: {
            promptTokens: 5,
            completionTokens: 10,
          },
          model: 'mock-gpt-fixture',
          responseId: 'resp-mock-001',
        }),
      },
    });

    expect(result.aiResponseMocked).toBe(true);
    expect(result.model).toBe('mock-gpt-fixture');
    expect(result.usage).toEqual({
      promptTokens: 5,
      completionTokens: 10,
      totalTokens: 15,
    });
    const aiOutput = result.aiOutput as Record<string, unknown>;
    const assessment = aiOutput.assessment as { summary: string } | undefined;
    expect(assessment?.summary).toBe('Fixture summary');
    expect(integrationCallLog.length).toBe(0);
    expect(result.tokenDiagnostics?.entries.length).toBeGreaterThan(0);

    const aiResponseEvent = events.find(e => e.type === 'onAIResponse')?.event as PipelineAIResponseEvent;
    expect(aiResponseEvent.mocked).toBe(true);
    expect(aiResponseEvent.result.model).toBe('mock-gpt-fixture');
  });

  it('throws when mock generation is requested without enabling the feature flag', async () => {
    delete process.env.PIPELINE_ENABLE_MOCK_AI;

    await expect(
      runPipeline({
        template,
        sourceData,
        tokens,
        options: {
          mockGeneration: {
            output: {
              assessment: { summary: 'Should not run' },
            },
          },
        },
      })
    ).rejects.toMatchObject({ step: 'mock-generation-disabled' });

    expect(integrationCallLog.length).toBe(0);
  });
});
