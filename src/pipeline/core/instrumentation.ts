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
  type PipelineCompleteEvent,
  type PipelineErrorEvent,
} from '../logging';

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
  complete(event: LoggerEventPayload<'onComplete'>): void;
  error(error: PipelineError): void;
}

export interface InstrumentationConfig {
  template: NoteTemplate;
  options: PipelineOptions;
}

type LoggerEventMap = {
  onStart: PipelineStartEvent;
  onSchemasDerived: PipelineSchemasEvent;
  onResolution: PipelineResolutionEvent;
  onPromptComposed: PipelinePromptEvent;
  onAIRequest: PipelineAIRequestEvent;
  onAIResponse: PipelineAIResponseEvent;
  onMergeCompleted: PipelineMergeEvent;
  onRender: PipelineRenderEvent;
  onComplete: PipelineCompleteEvent;
  onError: PipelineErrorEvent;
};

type LoggerEventPayload<K extends keyof LoggerEventMap> = Omit<LoggerEventMap[K], keyof PipelineBaseEvent>;

const DEFAULT_CAPTURE_PROMPT_METADATA = true;

export function createPipelineInstrumentation(
  config: InstrumentationConfig
): PipelineInstrumentation {
  const { template, options } = config;
  const logger = options.logger ?? createNoopPipelineLogger();

  const capturePromptMetadata =
    options.capturePromptMetadata ?? DEFAULT_CAPTURE_PROMPT_METADATA;
  const requestId = options.requestId ?? generateRequestId();

  const baseContext: Omit<PipelineBaseEvent, 'timestamp'> = {
    requestId,
    templateId: template.id,
    templateName: template.name,
    templateVersion: template.version,
  };

  const sanitizedOptions = sanitizeOptionsForLogging(
    options,
    requestId,
    capturePromptMetadata
  );

  const emit = createEmitter(logger, baseContext);

  return {
    capturePromptMetadata,
    start() {
      emit('onStart', { options: sanitizedOptions });
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
    complete(event) {
      emit('onComplete', event);
    },
    error(error) {
      emit('onError', { error });
    },
  };
}

function createEmitter(
  logger: PipelineLogger,
  baseContext: Omit<PipelineBaseEvent, 'timestamp'>
) {
  return function emit<K extends keyof LoggerEventMap>(
    method: K,
    data: LoggerEventPayload<K>
  ): void {
    const handler = logger[method];
    if (typeof handler !== 'function') {
      return;
    }

    try {
      const event = {
        ...baseContext,
        timestamp: new Date().toISOString(),
        ...data,
      } as LoggerEventMap[K];

      handler(event);
    } catch (error) {
      console.warn(`[Pipeline] logger.${String(method)} handler threw`, error);
    }
  };
}

function sanitizeOptionsForLogging(
  options: PipelineOptions,
  requestId: string,
  capturePromptMetadata: boolean
): PipelineOptions {
  const { logger: _logger, ...rest } = options;
  const sanitized: PipelineOptions = { ...rest };

  if (!sanitized.requestId) {
    sanitized.requestId = requestId;
  }

  if (sanitized.capturePromptMetadata === undefined) {
    sanitized.capturePromptMetadata = capturePromptMetadata;
  }

  return sanitized;
}

function generateRequestId(): string {
  try {
    return randomUUID();
  } catch {
    return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }
}
