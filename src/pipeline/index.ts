/**
 * Pipeline Domain - Barrel Export
 *
 * Domain: pipeline
 * Responsibility: Orchestrate end-to-end template → HTML generation
 *
 * This is the main entry point for the complete clinical note generation pipeline.
 * It wires together all domain specialists (derivation, validation, composition,
 * integration, tokens, factory) into a single coherent workflow.
 *
 * Usage:
 * ```typescript
 * import { runPipeline } from './pipeline';
 * import template from './examples/example-template.json';
 * import sourceData from '../tests/fixtures/source-data.json';
 *
 * const result = await runPipeline({ template, sourceData });
 * console.log(result.html); // Final clinical note
 * console.log(result.usage); // Token usage metrics
 * ```
 */

// Core pipeline
export { runPipeline } from './core/pipeline';

// Utilities
export { mergePayloads, findMergeConflicts } from './core/merger';

// Types
export type {
  PipelineInput,
  PipelineOptions,
  PipelineOutput,
  PipelineError,
  PipelineWarnings,
  MockGenerationProvider,
  MockGenerationContext,
  MockGenerationResult,
} from './types';

// Logging
export { createNoopPipelineLogger, createPipelineInstrumentation } from './logging';
export type {
  PipelineLogger,
  PipelineBaseEvent,
  PipelineStartEvent,
  PipelineSchemasEvent,
  PipelineResolutionEvent,
  PipelinePromptEvent,
  PipelineAIRequestEvent,
  PipelineAIResponseEvent,
  PipelineMergeEvent,
  PipelineRenderEvent,
  PipelineCompleteEvent,
  PipelineErrorEvent,
  PipelineInstrumentation,
  PipelineInstrumentationConfig,
} from './logging';
