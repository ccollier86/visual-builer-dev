/**
 * Pipeline Domain Types
 *
 * Types for end-to-end template → HTML pipeline orchestration.
 */

import type { LintIssue } from '../composition';
import type { PromptBundle } from '../composition/types';
import type { DerivedSchema, NoteTemplate } from '../derivation/types';
import type { GenerationOptions, GenerationResult } from '../integration';
import type { ResolutionWarning, SourceData } from '../resolution';
import type { CompiledCSS, DesignTokens } from '../tokens';
import type { AIPayload, NasSnapshot, RenderPayload } from '../types/payloads';
import type { TemplateLintIssue, ValidationIssue } from '../validation';
import type { PipelineLogger } from './logging';
import type OpenAI from 'openai';

/**
 * Input configuration for the complete pipeline
 */
export interface PipelineInput {
	/** Note template (will be validated) */
	template: NoteTemplate;

	/** Raw source data to resolve into NAS */
	sourceData: SourceData;

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

	/** Optional structured logger implementation */
	logger?: PipelineLogger;

	/** Provide a request identifier; generated automatically if omitted */
	requestId?: string;

	/** Capture OpenAI prompt metadata (ids, etc.) for audit logging */
	capturePromptMetadata?: boolean;

	/** Optional mock generation provider gated by feature flag */
	mockGeneration?: MockGenerationProvider;

	/** Optional pre-configured OpenAI client (avoids env mutation) */
	openaiClient?: OpenAI;
}

/**
 * Context passed to mock generation providers when synthesising AI output.
 */
export interface MockGenerationContext {
	template: NoteTemplate;
	prompt: PromptBundle;
	options: PipelineOptions;
}

/**
 * Shape of a mock generation result compatible with the integration domain.
 */
export interface MockGenerationResult
  extends Partial<Omit<GenerationResult, 'output' | 'usage' | 'model'>> {
	output: AIPayload;
	usage?: Partial<GenerationResult['usage']>;
	model?: string;
}

/**
 * Provider contract for supplying mock AI generations.
 */
export type MockGenerationProvider =
	| MockGenerationResult
	| ( (context: MockGenerationContext) => Promise<MockGenerationResult> | MockGenerationResult );

/**
 * Fine-grained guardrail configuration per pipeline stage.
 */
export interface PipelineGuardOptions {
	templateLint?: WarningGuardOptions;
	resolution?: WarningGuardOptions;
	promptLint?: WarningGuardOptions;
	validation?: WarningGuardOptions;
	merge?: MergeGuardOptions;
}

/**
 * Warning guard configuration shared across guardable stages.
 */
export interface WarningGuardOptions {
	/** @deprecated use failOnSeverity */
	failOnWarning?: boolean;
	failOnSeverity?: PipelineWarningSeverity;
}

export interface MergeGuardOptions {
	/** When true, conflicting AI/NAS data throws instead of logging */
	strict?: boolean;
	severity?: PipelineWarningSeverity;
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
	aiOutput: AIPayload;

	/** Derived schemas (for debugging/audit) */
	schemas: {
		ais: DerivedSchema; // AI Structured Output Schema
		nas: DerivedSchema; // Non-AI Structured Output Schema
		rps: DerivedSchema; // Render Payload Schema
	};

	/** Token usage metrics from OpenAI API */
	usage: {
		promptTokens: number;
		completionTokens: number;
		totalTokens: number;
	};

	/** Generation model used */
	model: string;

	/** Identifier of the OpenAI response when available */
	responseId?: string;

	/** Identifier of the prompt template recorded by OpenAI */
	promptId?: string;

	/** Indicates whether the AI response originated from a mock provider */
	aiResponseMocked?: boolean;

	/** Optional design-token provenance diagnostics */
	tokenDiagnostics?: TokenDiagnostics;

	/** Collected non-fatal warnings surfaced during execution */
	warnings?: PipelineWarnings;

	/** Optional snapshot of the merged render payload for downstream usage */
	payload?: RenderPayload;
	/** Optional NAS snapshot returned for debugging */
	nasSnapshot?: NasSnapshot;

}

/**
 * Warning collections keyed by pipeline stage.
 */
export interface PipelineWarnings {
	template?: PipelineWarning<TemplateLintIssue>[];
	resolution?: PipelineWarning<ResolutionWarning>[];
	prompt?: PipelineWarning<LintIssue>[];
	validation?: PipelineWarning<ValidationIssue>[];
	merge?: PipelineWarning<MergeConflictWarning>[];
}

export enum PipelineWarningSeverity {
	Info = 'info',
	Warning = 'warning',
	Error = 'error',
}

export interface PipelineWarning<T> {
	issue: T;
	severity: PipelineWarningSeverity;
	code?: string;
	details?: unknown;
	message?: string;
}

export interface MergeConflictWarning {
	path: string;
	expectedType?: string;
	actualType?: string;
	message: string;
	severity: PipelineWarningSeverity;
}

export type TokenValueSource = 'default' | 'template' | 'override';

export interface TokenDiagnosticsEntry {
	path: string;
	source: TokenValueSource;
	severity: PipelineWarningSeverity;
	message?: string;
}

export interface TokenDiagnostics {
	entries: TokenDiagnosticsEntry[];
}

/**
 * Error thrown during pipeline execution
 */
export class PipelineError extends Error {
	constructor(message: string, public step: string, public cause?: unknown) {
		super(message);
		this.name = 'PipelineError';
	}
}
