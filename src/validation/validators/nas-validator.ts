import { makeAjvWithTextKeywords } from '../core/ajv-setup';
import type { ValidationResult } from '../types';
import schema from '../../schemas/non-ai-output.meta.schema.json';

/**
 * Validate a Non-AI Structured Output Schema (NAS)
 *
 * A NAS defines the JSON Schema for non-AI data (lookups, computed values, etc.)
 * It includes:
 * - Field definitions for lookups and computed values
 * - Type constraints
 * - Required properties
 *
 * Used to validate context data passed to prompts and rendering.
 *
 * @param doc - Unknown input to validate
 * @returns ValidationResult with ok status and any errors
 */
export function validateNAS(doc: unknown): ValidationResult {
  const ajv = makeAjvWithTextKeywords();
  const validate = ajv.compile(schema);
  const ok = validate(doc);

  return {
    ok,
    errors: validate.errors ?? [],
    warnings: []
  };
}
