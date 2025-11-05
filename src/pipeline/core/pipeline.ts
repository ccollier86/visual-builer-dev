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

import { deriveAIS, deriveNAS, mergeToRPS } from '../../derivation';
import { validateNoteTemplate, validateAIS, getAIOutputValidator } from '../../validation';
import { composePrompt } from '../../composition';
import { createOpenAIClient, generateWithSchema } from '../../integration';
import { compileCSS } from '../../tokens';
import { renderNoteHTML } from '../../factory';
import { mergePayloads, findMergeConflicts } from './merger';
import type { PipelineInput, PipelineOutput, PipelineOptions, PipelineError, PipelineWarnings } from '../types';
import type { DesignTokens, Layout } from '../../tokens';
import type { TemplateStyle } from '../../derivation/types';
import defaultTokensRaw from '../../tokens/defaults/default-tokens.json';

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
  const options = input.options ?? {};
  const validate = options.validateSteps ?? true;

  try {
    const pipelineWarnings: PipelineWarnings = {};
    // Step 1: Validate template
    log(options, 'Step 1/8: Validating note template...');
    const templateResult = validateNoteTemplate(input.template);
    if (!templateResult.ok) {
      throw createError(
        'Template validation failed',
        'template-validation',
        templateResult.errors
      );
    }

    // Step 2: Derive AIS schema (AI Structured Output)
    log(options, 'Step 2/8: Deriving AIS schema...');
    const ais = deriveAIS(input.template);

    // Validate AIS schema structure against meta-schema
    if (validate) {
      const aisSchemaResult = validateAIS(ais);
      if (!aisSchemaResult.ok) {
        throw createError(
          'Derived AIS schema failed validation',
          'ais-schema-validation',
          aisSchemaResult.errors
        );
      }
    }

    // Step 3: Derive NAS schema (Non-AI Snapshot)
    log(options, 'Step 3/8: Deriving NAS schema...');
    const nas = deriveNAS(input.template);

    // Step 4: Merge to RPS schema (Render Payload)
    log(options, 'Step 4/8: Merging to RPS schema...');
    const rps = mergeToRPS(
      ais,
      nas,
      input.template.id,
      input.template.name,
      input.template.version
    );

    // Step 5: Resolve NAS data from source
    log(options, 'Step 5/8: Resolving NAS data from source...');

    const { createNASBuilder } = await import('../../resolution');
    const nasBuilder = createNASBuilder();

    const resolutionResult = await nasBuilder.build({
      template: input.template,
      sourceData: input.sourceData,
      nasSchema: nas
    });

    const resolvedNasData = resolutionResult.nasData;

    // Log warnings
    if (resolutionResult.warnings.length > 0) {
      if (options.guards?.resolution?.failOnWarning) {
        throw createError(
          'Resolution produced warnings',
          'resolution-warnings',
          resolutionResult.warnings
        );
      }

      pipelineWarnings.resolution = resolutionResult.warnings;

      if (options.verbose) {
        console.warn(`Resolution warnings (${resolutionResult.warnings.length}):`);
        resolutionResult.warnings.forEach(w => {
          console.warn(`  [${w.componentId}/${w.slotId}] ${w.message}`);
        });
      }
    }

    log(options, `Resolved ${resolutionResult.resolved.length} fields`);

    // Step 6: Compose prompt bundle
    log(options, 'Step 6/8: Composing prompt bundle...');
    const promptResult = composePrompt({
      template: input.template,
      aiSchema: ais,
      nasSnapshot: resolvedNasData,
    });
    const promptBundle = promptResult.bundle;

    const lintResult = promptResult.lint;

    const lintErrors = lintResult.errors.filter(err => err.check !== 'coverage');

    if (lintErrors.length > 0) {
      throw createError(
        'Prompt bundle validation failed',
        'prompt-lint',
        lintErrors
      );
    }

    if (lintResult.warnings.length > 0) {
      if (options.guards?.promptLint?.failOnWarning) {
        throw createError(
          'Prompt bundle warnings present',
          'prompt-lint-warning',
          lintResult.warnings
        );
      }

      pipelineWarnings.prompt = lintResult.warnings;

      if (options.verbose) {
        console.warn(`Prompt bundle warnings (${lintResult.warnings.length}):`);
        lintResult.warnings.forEach(w => {
          console.warn(`  [${w.check}] ${w.message}`);
        });
      }
    }

    // Step 7: Generate AI output via OpenAI
    log(options, 'Step 7/8: Generating AI output...');

    // Override API key if provided (set temporarily in env)
    const originalKey = process.env.OPENAI_API_KEY;
    if (options.openaiKey) {
      process.env.OPENAI_API_KEY = options.openaiKey;
    }

    const aiOutputValidator = getAIOutputValidator(ais);

    let generation;
    try {
      const client = createOpenAIClient();

      generation = await generateWithSchema(
        client,
        promptBundle,
        aiOutputValidator,
        options.generationOptions
      );
    } finally {
      // Restore original API key
      if (options.openaiKey) {
        if (originalKey) {
          process.env.OPENAI_API_KEY = originalKey;
        } else {
          delete process.env.OPENAI_API_KEY;
        }
      }
    }

    const aiWarnings = generation.warnings ?? [];
    if (aiWarnings.length > 0) {
      if (options.guards?.validation?.failOnWarning) {
        throw createError(
          'AI output produced validation warnings',
          'ai-validation-warning',
          aiWarnings
        );
      }

      pipelineWarnings.validation = aiWarnings;

      if (options.verbose) {
        console.warn(`AI output warnings (${aiWarnings.length}):`);
        aiWarnings.forEach(warning => {
          console.warn(`  [${warning.instancePath || '/'}] ${warning.message}`);
        });
      }
    }

    if (validate) {
      const aisResult = aiOutputValidator(generation.output);
      if (!aisResult.ok) {
        throw createError(
          'AI output validation failed',
          'ai-validation',
          aisResult.errors
        );
      }

       if (aisResult.warnings.length > 0 && !pipelineWarnings.validation) {
         pipelineWarnings.validation = aisResult.warnings;
       }
    }

    // Step 8: Merge AI output + NAS data
    log(options, 'Step 8/8: Merging AI output with NAS data...');

    // Check for conflicts (should never happen with proper schemas)
    if (validate) {
      const conflicts = findMergeConflicts(generation.output, resolvedNasData);
      if (conflicts.length > 0) {
        console.warn('Merge conflicts detected:', conflicts);
      }
    }

    const finalPayload = mergePayloads(generation.output, resolvedNasData);

    // Compile CSS from design tokens
    const baseTokens = cloneTokens(defaultTokensRaw as DesignTokens);
    applyTemplateStyle(baseTokens, input.template.style);
    const tokens = mergeDesignTokens(baseTokens, input.tokens);
    const css = compileCSS(tokens);

    // Render HTML
    const html = renderNoteHTML({
      template: input.template,
      payload: finalPayload,
      tokens,
      options: {
        provenance: options.provenance,
      },
    });

    log(options, 'Pipeline complete!');

    const warnings = Object.keys(pipelineWarnings).length > 0 ? pipelineWarnings : undefined;

    return {
      html,
      css,
      aiOutput: generation.output,
      schemas: { ais, nas, rps },
      usage: generation.usage,
      model: generation.model,
      warnings,
      payload: finalPayload,
      nasSnapshot: resolvedNasData,
    };
  } catch (error) {
    // Re-throw PipelineErrors as-is
    if (error && typeof error === 'object' && 'step' in error) {
      throw error;
    }

    // Wrap other errors
    throw createError(
      'Pipeline execution failed',
      'unknown',
      error
    );
  }
}

/**
 * Create a structured pipeline error for consistent error handling.
 *
 * @param message - Human-readable description of the failure.
 * @param step - Pipeline step identifier where the error originated.
 * @param cause - Optional underlying error that triggered this failure.
 * @returns PipelineError with contextual metadata for upstream callers.
 */
function createError(message: string, step: string, cause?: unknown): PipelineError {
  const error = new Error(message) as PipelineError;
  error.name = 'PipelineError';
  error.step = step;
  error.cause = cause;
  return error;
}

/**
 * Log message if verbose mode enabled
 */
function log(options: PipelineOptions, message: string): void {
  if (options.verbose) {
    console.log(`[Pipeline] ${message}`);
  }
}
