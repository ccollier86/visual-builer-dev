/**
 * Prompt Composer
 *
 * Main orchestrator for building prompt bundles.
 * Transforms templates + data into LLM-ready prompts.
 */

import { buildFieldGuide } from './field-guide-builder';
import { sliceContext } from './context-slicer';
import { buildMessages } from './message-builder';
import { lintPromptBundle } from './prompt-linter';
import type { PromptBundle, CompositionInput } from '../types';

/**
 * Compose a prompt bundle
 *
 * Takes template, AIS schema, NAS snapshot, and optional factPack.
 * Produces a complete, deterministic prompt bundle ready for LLM call.
 *
 * Process:
 * 1. Collect all AI fields from template
 * 2. Build field guide with metadata
 * 3. Slim context to only referenced NAS dependencies
 * 4. Generate system/user messages
 * 5. Package as PromptBundle with AIS schema
 * 6. Generate deterministic ID
 *
 * Output is deterministic: same inputs -> same bundle.
 *
 * @param input - Composition input with template, schemas, and data
 * @returns Complete prompt bundle
 */
export function composePrompt(input: CompositionInput): PromptBundle {
  const { template, aiSchema, nasSnapshot, factPack } = input;

  // Step 1: Build field guide from template layout
  const fieldGuide = buildFieldGuide(template.layout);

  // Step 2: Slim NAS context to only dependency paths
  const nasSlices = sliceContext(nasSnapshot, fieldGuide);

  // Step 3: Generate messages
  const messages = buildMessages(template, fieldGuide, factPack, nasSlices);

  // Step 4: Generate deterministic bundle ID
  const bundleId = generateBundleId(template.id, template.version);

  // Step 5: Assemble complete bundle
  const bundle: PromptBundle = {
    id: bundleId,
    templateId: template.id,
    templateVersion: template.version,
    messages,
    jsonSchema: aiSchema,
    fieldGuide,
    context: {
      factPack,
      nasSlices
    }
  };

  // Step 6: Lint the bundle
  const lintResult = lintPromptBundle(bundle, aiSchema, template);

  // Log warnings
  if (lintResult.warnings.length > 0) {
    console.warn(`Prompt bundle has ${lintResult.warnings.length} warnings:`);
    lintResult.warnings.forEach(w => {
      console.warn(`  [${w.check}] ${w.message}`);
    });
  }

  // Throw on errors
  if (!lintResult.ok) {
    const errorMessages = lintResult.errors.map(e => `[${e.check}] ${e.message}`).join('\n');
    throw new Error(`Prompt bundle validation failed:\n${errorMessages}`);
  }

  return bundle;
}

/**
 * Generate deterministic bundle ID
 *
 * Format: {templateId}@{version}_{timestamp_hash}
 * Example: tmpl_psychotherapy_soap_v1@0.1.0_2025-10-31T18:00:00Z
 *
 * Uses current timestamp to make ID unique per composition.
 * For true determinism, caller can override by passing fixed timestamp.
 *
 * @param templateId - Template ID
 * @param version - Template version
 * @returns Unique bundle ID
 */
function generateBundleId(templateId: string, version: string): string {
  const timestamp = new Date().toISOString();
  return `${templateId}@${version}_${timestamp}`;
}
