/**
 * Pipeline Logging - Public API
 *
 * Domain: pipeline/logging
 * Responsibility: Export logging contracts and instrumentation helpers
 */

export {
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

export {
  createPipelineInstrumentation,
  type PipelineInstrumentation,
  type PipelineInstrumentationConfig,
} from './instrumentation';
