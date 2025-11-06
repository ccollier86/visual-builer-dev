/**
 * Pipeline Logging - Type Contracts
 *
 * Domain: pipeline/logging
 * Responsibility: Define structured logging events and logger contract
 */

import type { PromptBundle } from '../../composition/types';
import type { DesignTokens } from '../../tokens/types';
import type { GenerationOptions, GenerationResult } from '../../integration/types';
import type { ResolutionResult } from '../../resolution/contracts/types';
import type { PipelineOptions, PipelineWarnings, PipelineError } from '../types';

/**
 * Structured logger contract for pipeline lifecycle events.
 */
export interface PipelineLogger {
  onStart?(event: PipelineStartEvent): void;
  onSchemasDerived?(event: PipelineSchemasEvent): void;
  onResolution?(event: PipelineResolutionEvent): void;
  onPromptComposed?(event: PipelinePromptEvent): void;
  onAIRequest?(event: PipelineAIRequestEvent): void;
  onAIResponse?(event: PipelineAIResponseEvent): void;
  onMergeCompleted?(event: PipelineMergeEvent): void;
  onRender?(event: PipelineRenderEvent): void;
  onComplete?(event: PipelineCompleteEvent): void;
  onError?(event: PipelineErrorEvent): void;
}

/**
 * Base metadata shared across all pipeline logging events.
 */
export interface PipelineBaseEvent {
  requestId: string;
  templateId: string;
  templateName: string;
  templateVersion: string;
  timestamp: string;
}

export interface PipelineStartEvent extends PipelineBaseEvent {
  options: PipelineOptions;
}

export interface PipelineSchemasEvent extends PipelineBaseEvent {
  aisSchema: unknown;
  nasSchema: unknown;
  rpsSchema: unknown;
}

export interface PipelineResolutionEvent extends PipelineBaseEvent {
  resolution: ResolutionResult;
}

export interface PipelinePromptEvent extends PipelineBaseEvent {
  prompt: PromptBundle;
  warnings: PipelineWarnings['prompt'] | undefined;
}

export interface PipelineAIRequestEvent extends PipelineBaseEvent {
  prompt: PromptBundle;
  model: string | undefined;
  generationOptions: Partial<GenerationOptions> | undefined;
}

export interface PipelineAIResponseEvent extends PipelineBaseEvent {
  result: GenerationResult;
  mocked?: boolean;
}

export interface PipelineMergeEvent extends PipelineBaseEvent {
  finalPayload: unknown;
  tokens: DesignTokens;
}

export interface PipelineRenderEvent extends PipelineBaseEvent {
  htmlLength: number;
  cssHash: string;
}

export interface PipelineCompleteEvent extends PipelineBaseEvent {
  durationMs: number;
  warnings?: PipelineWarnings;
}

export interface PipelineErrorEvent extends PipelineBaseEvent {
  error: PipelineError;
}

const NOOP_LOGGER: PipelineLogger = Object.freeze({});

/**
 * Provides a do-nothing logger implementation for callers who opt out of instrumentation.
 */
export function createNoopPipelineLogger(): PipelineLogger {
  return NOOP_LOGGER;
}
