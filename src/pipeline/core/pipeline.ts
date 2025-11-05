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
import { validateNoteTemplate, validateAIS } from '../../validation';
import { composePrompt } from '../../composition';
import { createOpenAIClient, generateWithSchema } from '../../integration';
import { compileCSS } from '../../tokens';
import { renderNoteHTML } from '../../factory';
import { mergePayloads, findMergeConflicts } from './merger';
import type { PipelineInput, PipelineOutput, PipelineOptions, PipelineError } from '../types';
import type { DesignTokens } from '../../tokens';
import defaultTokensRaw from '../../tokens/defaults/default-tokens.json';

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
      console.warn(`Resolution warnings (${resolutionResult.warnings.length}):`);
      resolutionResult.warnings.forEach(w => {
        console.warn(`  [${w.componentId}/${w.slotId}] ${w.message}`);
      });
    }

    log(options, `Resolved ${resolutionResult.resolved.length} fields`);

    // Step 6: Compose prompt bundle
    log(options, 'Step 6/8: Composing prompt bundle...');
    const promptBundle = composePrompt({
      template: input.template,
      aiSchema: ais,
      nasSnapshot: resolvedNasData,
    });

    // Step 7: Generate AI output via OpenAI
    log(options, 'Step 7/8: Generating AI output...');

    // Override API key if provided (set temporarily in env)
    const originalKey = process.env.OPENAI_API_KEY;
    if (options.openaiKey) {
      process.env.OPENAI_API_KEY = options.openaiKey;
    }

    let generation;
    try {
      const client = createOpenAIClient();

      // Create validator wrapper that matches expected signature
      const aisValidator = (data: any, schema: any) => validateAIS(data);

      generation = await generateWithSchema(
        client,
        promptBundle,
        aisValidator,
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

    if (validate) {
      const aisResult = validateAIS(generation.output);
      if (!aisResult.ok) {
        throw createError(
          'AI output validation failed',
          'ai-validation',
          aisResult.errors
        );
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
    const tokens = input.tokens ?? (defaultTokensRaw as DesignTokens);
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

    return {
      html,
      css,
      aiOutput: generation.output,
      schemas: { ais, nas, rps },
      usage: generation.usage,
      model: generation.model,
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
 * Create a structured pipeline error
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
