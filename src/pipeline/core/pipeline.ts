/**
 * Pipeline Core - Main Orchestrator
 *
 * Domain: pipeline/core
 * Responsibility: Orchestrate end-to-end template → HTML pipeline
 *
 * SOR: This is the single entry point for full note generation
 * SOD: Delegates to domain specialists, only handles orchestration
 * DI: Receives all dependencies via imports, pure functional composition
 */

import { composePrompt } from '../../composition';
import type { LintIssue } from '../../composition/types';
import { deriveAIS, deriveNAS, mergeToRPS } from '../../derivation';
import type { TemplateStyle } from '../../derivation/types';
import { renderNoteHTML } from '../../factory';
import { generateWithSchema } from '../../integration';
import type { GenerationResult, IntegrationDiagnosticsLogger } from '../../integration/types';
import type { DesignTokens, Layout } from '../../tokens';
import { compileCSS } from '../../tokens';
import defaultTokensRaw from '../../tokens/defaults/default-tokens.json';
import type { FactPack } from '../../types/payloads';
import {
	getAIOutputValidator,
	lintNoteTemplate,
	validateAIS,
	validateNoteTemplate,
} from '../../validation';
import { createPipelineInstrumentation } from '../logging';
import type {
	MergeConflictWarning,
	PipelineError,
	PipelineInput,
	PipelineOptions,
	PipelineOutput,
	PipelineWarning,
	PipelineWarnings,
} from '../types';
import { PipelineWarningSeverity } from '../types';
import { createPipelineError, logVerbose, resolveOpenAIClient, timeStage } from './helpers';
import { collectMergeConflicts, mergePayloads } from './merger';
import { isMockGenerationEnabled, resolveMockGeneration } from './mock-generation';
import { diagnoseTokens } from './tokens-diagnostics';
import {
	mapResolutionSeverity,
	mapTemplateSeverity,
	shouldFailGuard,
	shouldFailMerge,
} from './warnings';

function cloneTokens(tokens: DesignTokens): DesignTokens {
	return JSON.parse(JSON.stringify(tokens)) as DesignTokens;
}

function applyTemplateStyle(tokens: DesignTokens, style?: TemplateStyle): void {
	if (!style) return;

	if (style.font) {
		tokens.typography.fontFamily = style.font;
	}

	if (typeof style.spacing === 'number') {
		tokens.spacing.unitPx = style.spacing;
	}

	if (style.color) {
		tokens.color.text = style.color;
	}

	if (style.muted) {
		tokens.color.muted = style.muted;
	}

	if (style.accent) {
		tokens.color.accent = style.accent;
	}

	if (style.tableDensity) {
		tokens.table.density = style.tableDensity;
	}

	if (style.print) {
		tokens.print.pageSize = style.print.size ?? tokens.print.pageSize;
		tokens.print.margin = style.print.margin ?? tokens.print.margin;
		tokens.print.showHeader = style.print.header ?? tokens.print.showHeader;
		tokens.print.showFooter = style.print.footer ?? tokens.print.showFooter;
	}
}

function mergeLayout(base?: Layout, override?: Layout): Layout | undefined {
	if (!base && !override) {
		return undefined;
	}

	const merged: Layout = {
		...(base ?? {}),
		...(override ?? {}),
	};

	if (base?.sectionBanner || override?.sectionBanner) {
		merged.sectionBanner = {
			...(base?.sectionBanner ?? {}),
			...(override?.sectionBanner ?? {}),
		};
	}

	return merged;
}

function mergeDesignTokens(base: DesignTokens, override?: DesignTokens): DesignTokens {
	if (!override) {
		return base;
	}

	return {
		...base,
		...override,
		typography: {
			...base.typography,
			...override.typography,
		},
		color: {
			...base.color,
			...override.color,
		},
		spacing: {
			...base.spacing,
			...override.spacing,
		},
		table: {
			...base.table,
			...override.table,
		},
		list: {
			...(base.list ?? {}),
			...(override.list ?? {}),
		},
		layout: mergeLayout(base.layout, override.layout),
		print: {
			...base.print,
			...override.print,
		},
		brand: {
			...(base.brand ?? {}),
			...(override.brand ?? {}),
		},
		surface: {
			...(base.surface ?? {}),
			...(override.surface ?? {}),
		},
	};
}

/**
 * Run the complete clinical note generation pipeline
 *
 * Steps:
 * 1. Validate template
 * 2. Derive AIS, NAS, RPS schemas
 * 3. Resolve NAS data from source
 * 4. Compose prompt bundle
 * 5. Generate AI output via OpenAI
 * 6. Merge AI + NAS payloads
 * 7. Compile CSS from tokens
 * 8. Render final HTML
 *
 * @param input - Pipeline input configuration
 * @returns Complete pipeline output with HTML, CSS, and metadata
 * @throws {PipelineError} If any step fails
 */
export async function runPipeline(input: PipelineInput): Promise<PipelineOutput> {
	const options: PipelineOptions = input.options ? { ...input.options } : {};
	const validate = options.validateSteps ?? true;

	const instrumentation = createPipelineInstrumentation({
		template: input.template,
		options,
	});

	instrumentation.start();

	const capturePromptMetadata = instrumentation.capturePromptMetadata;
	const startTime = Date.now();

	try {
		const pipelineWarnings: PipelineWarnings = {};
		// Step 1: Validate template
		logVerbose(options, 'Step 1/8: Validating note template...');
		const templateResult = validateNoteTemplate(input.template);
		if (!templateResult.ok) {
			throw createPipelineError(
				'Template validation failed',
				'template-validation',
				templateResult.errors
			);
		}

		const templateLint = lintNoteTemplate(input.template);
		if (templateLint.errors.length > 0) {
			throw createPipelineError('Template lint failed', 'template-lint', templateLint.errors);
		}

		const templateWarnings = templateLint.warnings.map((issue) => ({
			issue,
			severity: mapTemplateSeverity(issue.severity),
			code: issue.code,
		}));

		if (
			templateWarnings.length > 0 &&
			shouldFailGuard(options.guards?.templateLint, templateWarnings)
		) {
			throw createPipelineError(
				'Template lint warnings present',
				'template-lint-warning',
				templateWarnings
			);
		}

		if (templateWarnings.length > 0) {
			pipelineWarnings.template = templateWarnings;
		}

		// Step 2: Derive AIS schema (AI Structured Output)
		logVerbose(options, 'Step 2/8: Deriving AIS schema...');
		const ais = deriveAIS(input.template);

		// Validate AIS schema structure against meta-schema
		if (validate) {
			const aisSchemaResult = validateAIS(ais);
			if (!aisSchemaResult.ok) {
				throw createPipelineError(
					'Derived AIS schema failed validation',
					'ais-schema-validation',
					aisSchemaResult.errors
				);
			}
		}

		// Step 3: Derive NAS schema (Non-AI Snapshot)
		logVerbose(options, 'Step 3/8: Deriving NAS schema...');
		const nas = deriveNAS(input.template);

		// Step 4: Merge to RPS schema (Render Payload)
		logVerbose(options, 'Step 4/8: Merging to RPS schema...');
		const rps = mergeToRPS(
			ais,
			nas,
			input.template.id,
			input.template.name,
			input.template.version
		);

		instrumentation.schemasDerived({
			aisSchema: ais,
			nasSchema: nas,
			rpsSchema: rps,
		});

		// Step 5: Resolve NAS data from source
		logVerbose(options, 'Step 5/8: Resolving NAS data from source...');

		const { createNASBuilder } = await import('../../resolution');
		const nasBuilder = createNASBuilder();

		const resolutionTiming = await timeStage(() =>
			nasBuilder.build({
				template: input.template,
				sourceData: input.sourceData,
				nasSchema: nas,
			})
		);
		const resolutionResult = resolutionTiming.result;
		instrumentation.stageTiming({ stage: 'resolveNAS', durationMs: resolutionTiming.durationMs });

		const resolvedNasData = resolutionResult.nasData;

		instrumentation.resolution({ resolution: resolutionResult });

		const resolutionWarnings = resolutionResult.warnings.map((issue) => ({
			issue,
			severity: mapResolutionSeverity(issue.severity),
			code: issue.reason,
			details: issue.details,
		}));

		const fatalWarnings = resolutionWarnings.filter(
			(warning) => warning.severity === PipelineWarningSeverity.Error
		);
		if (fatalWarnings.length > 0) {
			throw createPipelineError(
				'Resolution produced fatal warnings',
				'resolution-error',
				fatalWarnings
			);
		}

		const nonFatalResolutionWarnings = resolutionWarnings.filter(
			(warning) => warning.severity !== PipelineWarningSeverity.Error
		);

		if (
			nonFatalResolutionWarnings.length > 0 &&
			shouldFailGuard(options.guards?.resolution, nonFatalResolutionWarnings)
		) {
			throw createPipelineError(
				'Resolution produced warnings',
				'resolution-warnings',
				nonFatalResolutionWarnings
			);
		}

		if (nonFatalResolutionWarnings.length > 0) {
			pipelineWarnings.resolution = nonFatalResolutionWarnings;
		}

		logVerbose(options, `Resolved ${resolutionResult.resolved.length} fields`);

		// Step 6: Compose prompt bundle
		logVerbose(options, 'Step 6/8: Composing prompt bundle...');
		const composeTiming = await timeStage(async () =>
			composePrompt({
				template: input.template,
				aiSchema: ais,
				nasSnapshot: resolvedNasData,
				factPack: input.sourceData as FactPack,
			})
		);
		const promptResult = composeTiming.result;
		instrumentation.stageTiming({ stage: 'composePrompt', durationMs: composeTiming.durationMs });
		const promptBundle = promptResult.bundle;

		const lintResult = promptResult.lint;

		const lintErrors = lintResult.errors.filter((err) => err.check !== 'coverage');

		if (lintErrors.length > 0) {
			throw createPipelineError('Prompt bundle validation failed', 'prompt-lint', lintErrors);
		}

		let promptWarnings: PipelineWarning<LintIssue>[] = [];
		if (lintResult.warnings.length > 0) {
			promptWarnings = lintResult.warnings.map((warning) => ({
				issue: warning,
				severity: PipelineWarningSeverity.Warning,
				code: warning.check,
			}));

			if (shouldFailGuard(options.guards?.promptLint, promptWarnings)) {
				throw createPipelineError(
					'Prompt bundle warnings present',
					'prompt-lint-warning',
					promptWarnings
				);
			}

			pipelineWarnings.prompt = promptWarnings;

			if (options.verbose) {
				console.warn(`Prompt bundle warnings (${lintResult.warnings.length}):`);
				lintResult.warnings.forEach((w) => {
					console.warn(`  [${w.check}] ${w.message}`);
				});
			}
		}

		instrumentation.promptComposed({
			prompt: promptBundle,
			warnings: promptWarnings.length > 0 ? promptWarnings : undefined,
		});

		// Step 7: Generate AI output via OpenAI (or approved mock)
		logVerbose(options, 'Step 7/8: Generating AI output...');

		const aiOutputValidator = getAIOutputValidator(ais);
		const mockProvider = options.mockGeneration;
		const mockFeatureEnabled = isMockGenerationEnabled();

		if (mockProvider && !mockFeatureEnabled) {
			throw createPipelineError(
				'Mock generation requested but PIPELINE_ENABLE_MOCK_AI flag is disabled',
				'mock-generation-disabled'
			);
		}

		instrumentation.aiRequest({
			prompt: promptBundle,
			model: options.generationOptions?.model,
			generationOptions: options.generationOptions ? { ...options.generationOptions } : undefined,
		});

		let generation: GenerationResult;
		let aiResponseMocked = false;
		let aiDurationMs: number | undefined;

		const diagnosticsLogger: IntegrationDiagnosticsLogger = {
			warn: (event) => {
				instrumentation.aiDiagnostic({
					code: event.code,
					attempt: event.attempt,
					model: event.model,
					responseId: event.responseId,
					promptId: event.promptId,
					rawPreview: event.rawPreview,
				});
			},
		};

		if (mockProvider && mockFeatureEnabled) {
			logVerbose(options, 'Using mock AI generation result (PIPELINE_ENABLE_MOCK_AI=true)');
			try {
				const mockTiming = await timeStage(() =>
					resolveMockGeneration({
						provider: mockProvider,
						context: {
							template: input.template,
							prompt: promptBundle,
							options,
						},
						options,
					})
				);
				generation = mockTiming.result.generation;
				aiResponseMocked = true;
				aiDurationMs = mockTiming.durationMs;
			} catch (error) {
				throw createPipelineError(
					'Mock generation provider failed',
					'mock-generation-invalid',
					error
				);
			}
		} else {
			const { client } = resolveOpenAIClient(options);
			const generationTiming = await timeStage(() =>
				generateWithSchema(
					client,
					promptBundle,
					aiOutputValidator,
					options.generationOptions,
					diagnosticsLogger
				)
			);
			generation = generationTiming.result;
			aiDurationMs = generationTiming.durationMs;
		}

		if (aiDurationMs !== undefined) {
			instrumentation.stageTiming({ stage: 'generateWithSchema', durationMs: aiDurationMs });
		}

		const aiResultForLogging = capturePromptMetadata
			? generation
			: { ...generation, promptId: undefined, responseId: undefined };

		instrumentation.aiResponse({
			result: aiResultForLogging,
			mocked: aiResponseMocked ? true : undefined,
			durationMs: aiDurationMs,
		});

		const aiWarnings = (generation.warnings ?? []).map((issue) => ({
			issue,
			severity: PipelineWarningSeverity.Warning,
			code: issue.keyword,
			details: issue,
		}));

		if (aiWarnings.length > 0) {
			if (shouldFailGuard(options.guards?.validation, aiWarnings)) {
				throw createPipelineError(
					'AI output produced validation warnings',
					'ai-validation-warning',
					aiWarnings
				);
			}

			pipelineWarnings.validation = aiWarnings;

			if (options.verbose) {
				console.warn(`AI output warnings (${aiWarnings.length}):`);
				aiWarnings.forEach((warning) => {
					const issue = warning.issue;
					console.warn(`  [${issue.instancePath || '/'}] ${issue.message}`);
				});
			}
		}

		if (validate) {
			const aisResult = aiOutputValidator(generation.output);
			if (!aisResult.ok) {
				throw createPipelineError('AI output validation failed', 'ai-validation', aisResult.errors);
			}

			if (aisResult.warnings.length > 0) {
				const structuralWarnings = aisResult.warnings.map((issue) => ({
					issue,
					severity: PipelineWarningSeverity.Warning,
					code: issue.keyword,
				}));
				const existing = pipelineWarnings.validation ?? [];
				const combined = existing.concat(structuralWarnings);
				if (shouldFailGuard(options.guards?.validation, structuralWarnings)) {
					throw createPipelineError(
						'AI output produced validation warnings',
						'ai-validation-warning',
						structuralWarnings
					);
				}
				pipelineWarnings.validation = combined;
			}
		}

		logVerbose(options, 'Step 8/8: Merging AI output with NAS data...');

		const mergeConflicts = collectMergeConflicts(generation.output, resolvedNasData);
		const mergeWarnings: PipelineWarning<MergeConflictWarning>[] = mergeConflicts.map(
			(conflict) => ({
				issue: conflict,
				severity: conflict.severity,
				message: conflict.message,
			})
		);

		if (mergeWarnings.length > 0 && shouldFailMerge(options.guards?.merge, mergeWarnings)) {
			throw createPipelineError('Merge conflicts detected', 'merge-conflict', mergeWarnings);
		}

		if (mergeWarnings.length > 0) {
			pipelineWarnings.merge = mergeWarnings;
			if (options.verbose) {
				console.warn('Merge conflicts detected:', mergeConflicts);
			}
		}

		const finalPayload = mergePayloads(generation.output, resolvedNasData);

		// Compile CSS from design tokens
		const defaultTokens = cloneTokens(defaultTokensRaw as DesignTokens);
		const templateAdjustedTokens = cloneTokens(defaultTokens);
		applyTemplateStyle(templateAdjustedTokens, input.template.style);
		const tokens = mergeDesignTokens(templateAdjustedTokens, input.tokens);
		const tokenDiagnostics = diagnoseTokens(
			defaultTokens,
			templateAdjustedTokens,
			input.tokens,
			tokens
		);

		instrumentation.tokenDiagnostics({ diagnostics: tokenDiagnostics });

		instrumentation.mergeCompleted({
			finalPayload,
			tokens,
			conflicts: mergeConflicts,
		});

		const cssTiming = await timeStage(async () => compileCSS(tokens));
		const css = cssTiming.result;
		instrumentation.stageTiming({ stage: 'compileCSS', durationMs: cssTiming.durationMs });

		const renderTiming = await timeStage(async () =>
			renderNoteHTML({
				template: input.template,
				payload: finalPayload,
				tokens,
				options: {
					provenance: options.provenance,
					styles: {
						inlineScreen: css.screen,
						inlinePrint: css.print,
					},
				},
			})
		);
		const html = renderTiming.result;
		instrumentation.stageTiming({ stage: 'renderNoteHTML', durationMs: renderTiming.durationMs });

		instrumentation.render({
			htmlLength: html.length,
			cssHash: css.hash,
		});

		logVerbose(options, 'Pipeline complete!');

		const warnings = Object.keys(pipelineWarnings).length > 0 ? pipelineWarnings : undefined;

		instrumentation.complete({
			durationMs: Date.now() - startTime,
			warnings,
		});

		return {
			html,
			css,
			aiOutput: generation.output,
			schemas: { ais, nas, rps },
			usage: generation.usage,
			model: generation.model,
			responseId: capturePromptMetadata ? generation.responseId : undefined,
			promptId: capturePromptMetadata ? generation.promptId : undefined,
			aiResponseMocked: aiResponseMocked ? true : undefined,
			warnings,
			payload: finalPayload,
			nasSnapshot: resolvedNasData,
			tokenDiagnostics,
		};
	} catch (error) {
		const pipelineError =
			error && typeof error === 'object' && 'step' in error
				? (error as PipelineError)
				: createPipelineError('Pipeline execution failed', 'unknown', error);

		instrumentation.error(pipelineError);

		throw pipelineError;
	}
}
