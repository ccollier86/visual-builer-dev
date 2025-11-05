/**
 * Pipeline Domain Types
 *
 * Types for end-to-end template → HTML pipeline orchestration.
 */

import type { DesignTokens, CompiledCSS } from '../tokens';
import type { GenerationOptions } from '../integration';
import type { ResolutionWarning } from '../resolution';
import type { LintIssue } from '../composition';

/**
 * Input configuration for the complete pipeline
 */
export interface PipelineInput {
  /** Note template (will be validated) */
  template: any;

  /** Raw source data to resolve into NAS */
  sourceData: any;

  /** Design tokens (optional, defaults to system tokens) */
  tokens?: DesignTokens;

  /** Pipeline execution options */
  options?: PipelineOptions;
}

/**
 * Configuration options for pipeline execution
 */
export interface PipelineOptions {
  /** Validate intermediate results at each step (default: true in dev) */
  validateSteps?: boolean;

  /** Include provenance appendix in HTML output */
  provenance?: boolean;

  /** OpenAI API key (overrides OPENAI_API_KEY env var) */
  openaiKey?: string;

  /** AI generation options (model, temperature, etc) */
  generationOptions?: GenerationOptions;

  /** Enable verbose logging for debugging */
  verbose?: boolean;

  /** Guardrail behaviour for warnings surfaced by pipeline stages */
  guards?: PipelineGuardOptions;
}

/**
 * Fine-grained guardrail configuration per pipeline stage.
 */
export interface PipelineGuardOptions {
  resolution?: WarningGuardOptions;
  promptLint?: WarningGuardOptions;
}

/**
 * Warning guard configuration shared across guardable stages.
 */
export interface WarningGuardOptions {
  failOnWarning?: boolean;
}

/**
 * Complete pipeline output with all artifacts
 */
export interface PipelineOutput {
  /** Rendered clinical note HTML */
  html: string;

  /** Compiled CSS (screen + print) */
  css: CompiledCSS;

  /** AI-generated output (for debugging/audit) */
  aiOutput: any;

  /** Derived schemas (for debugging/audit) */
  schemas: {
    ais: any; // AI Structured Output Schema
    nas: any; // Non-AI Structured Output Schema
    rps: any; // Render Payload Schema
  };

  /** Token usage metrics from OpenAI API */
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };

  /** Generation model used */
  model: string;

  /** Collected non-fatal warnings surfaced during execution */
  warnings?: PipelineWarnings;
}

/**
 * Warning collections keyed by pipeline stage.
 */
export interface PipelineWarnings {
  resolution?: ResolutionWarning[];
  prompt?: LintIssue[];
}

/**
 * Error thrown during pipeline execution
 */
export class PipelineError extends Error {
  constructor(
    message: string,
    public step: string,
    public cause?: unknown
  ) {
    super(message);
    this.name = 'PipelineError';
  }
}
