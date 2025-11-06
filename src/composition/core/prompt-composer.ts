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
import type { CompositionInput, CompositionResult, LintIssue, LintResult, PromptBundle } from '../types';

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
export function composePrompt(input: CompositionInput): CompositionResult {
  const { template, aiSchema, nasSnapshot, factPack } = input;

  const fieldGuideResult = buildFieldGuide(template.layout);
  const contextResult = sliceContext(nasSnapshot, fieldGuideResult.entries);

  const messages = buildMessages(template, fieldGuideResult.entries, factPack, contextResult.nasSlices);

  // Step 4: Generate deterministic bundle ID
  const bundleId = generateBundleId(template.id, template.version);

  // Step 5: Assemble complete bundle
  const bundle: PromptBundle = {
    id: bundleId,
    templateId: template.id,
    templateVersion: template.version,
    messages,
    jsonSchema: aiSchema,
    fieldGuide: fieldGuideResult.entries,
    context: {
      factPack,
      nasSlices: contextResult.nasSlices
    }
  };

  // Step 6: Lint the bundle
  const lintResult = lintPromptBundle(bundle, aiSchema, template);
  const lint = mergeLintIssues(fieldGuideResult.issues, contextResult.issues, lintResult);

  return {
    bundle,
    lint,
  };
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

function mergeLintIssues(
  fieldIssues: LintIssue[],
  contextIssues: LintIssue[],
  result: LintResult
): LintResult {
  const issues = [...fieldIssues, ...contextIssues, ...result.issues];
  const errors = issues.filter(issue => issue.severity === 'error');
  const warnings = issues.filter(issue => issue.severity === 'warning');

  return {
    ok: errors.length === 0,
    issues,
    errors,
    warnings,
  };
}
