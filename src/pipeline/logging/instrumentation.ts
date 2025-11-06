/**
 * Pipeline Logging - Instrumentation Adapter
 *
 * Domain: pipeline/logging
 * Responsibility: Emit structured events to the injected logger
 */

import { randomUUID } from 'node:crypto';
import type { NoteTemplate } from '../../derivation/types';
import type { PipelineOptions, PipelineError } from '../types';
import {
  createNoopPipelineLogger,
  type PipelineLogger,
  type PipelineBaseEvent,
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
} from './types';

type LoggerEventMap = {
  onStart: PipelineStartEvent;
  onSchemasDerived: PipelineSchemasEvent;
  onResolution: PipelineResolutionEvent;
  onPromptComposed: PipelinePromptEvent;
  onAIRequest: PipelineAIRequestEvent;
  onAIResponse: PipelineAIResponseEvent;
  onMergeCompleted: PipelineMergeEvent;
  onRender: PipelineRenderEvent;
  onStageTiming: PipelineStageTimingEvent;
  onTokenDiagnostics: PipelineTokenDiagnosticsEvent;
  onComplete: PipelineCompleteEvent;
  onError: PipelineErrorEvent;
};

type LoggerEventPayload<K extends keyof LoggerEventMap> = Omit<LoggerEventMap[K], keyof PipelineBaseEvent>;

interface LoggerContext extends Omit<PipelineBaseEvent, 'timestamp'> {}

const DEFAULT_CAPTURE_PROMPT_METADATA = true;

/**
 * Public instrumentation contract used by the pipeline orchestrator.
 */
export interface PipelineInstrumentation {
  capturePromptMetadata: boolean;
  start(): void;
  schemasDerived(event: LoggerEventPayload<'onSchemasDerived'>): void;
  resolution(event: LoggerEventPayload<'onResolution'>): void;
  promptComposed(event: LoggerEventPayload<'onPromptComposed'>): void;
  aiRequest(event: LoggerEventPayload<'onAIRequest'>): void;
  aiResponse(event: LoggerEventPayload<'onAIResponse'>): void;
  mergeCompleted(event: LoggerEventPayload<'onMergeCompleted'>): void;
  render(event: LoggerEventPayload<'onRender'>): void;
  stageTiming(event: LoggerEventPayload<'onStageTiming'>): void;
  tokenDiagnostics(event: LoggerEventPayload<'onTokenDiagnostics'>): void;
  complete(event: LoggerEventPayload<'onComplete'>): void;
  error(error: PipelineError): void;
}

/**
 * Configuration required to bootstrap instrumentation for a pipeline run.
 */
export interface PipelineInstrumentationConfig {
  template: NoteTemplate;
  options: PipelineOptions;
}

/**
 * Creates an instrumentation adapter that emits structured events to the provided logger.
 */
export function createPipelineInstrumentation(
  config: PipelineInstrumentationConfig
): PipelineInstrumentation {
  const { template, options } = config;
  const logger = options.logger ?? createNoopPipelineLogger();

  const capturePromptMetadata =
    options.capturePromptMetadata ?? DEFAULT_CAPTURE_PROMPT_METADATA;
  const requestId = options.requestId ?? generateRequestId();

  const context: LoggerContext = {
    requestId,
    templateId: template.id,
    templateName: template.name,
    templateVersion: template.version,
  };

  const sanitisedOptions = sanitiseOptionsForLogging(
    options,
    requestId,
    capturePromptMetadata
  );

  const emit = createEmitter(logger, context);

  return {
    capturePromptMetadata,
    start() {
      emit('onStart', { options: sanitisedOptions });
    },
    schemasDerived(event) {
      emit('onSchemasDerived', event);
    },
    resolution(event) {
      emit('onResolution', event);
    },
    promptComposed(event) {
      emit('onPromptComposed', event);
    },
    aiRequest(event) {
      emit('onAIRequest', event);
    },
    aiResponse(event) {
      emit('onAIResponse', event);
    },
    mergeCompleted(event) {
      emit('onMergeCompleted', event);
    },
    render(event) {
      emit('onRender', event);
    },
    stageTiming(event) {
      emit('onStageTiming', event);
    },
    tokenDiagnostics(event) {
      emit('onTokenDiagnostics', event);
    },
    complete(event) {
      emit('onComplete', event);
    },
    error(error) {
      emit('onError', { error });
    },
  };
}

/**
 * Normalises options for downstream logging without mutating caller state.
 */
function sanitiseOptionsForLogging(
  options: PipelineOptions,
  requestId: string,
  capturePromptMetadata: boolean
): PipelineOptions {
  const { logger: _logger, mockGeneration: _mockGeneration, openaiClient: _client, ...rest } = options;
  const sanitised: PipelineOptions = { ...rest };

  if (!sanitised.requestId) {
    sanitised.requestId = requestId;
  }

  if (sanitised.capturePromptMetadata === undefined) {
    sanitised.capturePromptMetadata = capturePromptMetadata;
  }

  return sanitised;
}

/**
 * Generates stable identifiers for pipeline runs.
 */
function generateRequestId(): string {
  try {
    return randomUUID();
  } catch {
    return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }
}

/**
 * Produces a helper that emits events to the injected logger with shared metadata.
 */
function createEmitter(
  logger: PipelineLogger,
  context: LoggerContext
) {
  return function emit<K extends keyof LoggerEventMap>(
    method: K,
    data: LoggerEventPayload<K>
  ): void {
    const handler = logger[method] as ((event: LoggerEventMap[K]) => void) | undefined;
    if (!handler) {
      return;
    }

    try {
      const event = {
        ...context,
        timestamp: new Date().toISOString(),
        ...data,
      } as LoggerEventMap[K];

      handler(event);
    } catch (error) {
      console.warn(`[Pipeline] logger.${String(method)} handler threw`, error);
    }
  };
}
