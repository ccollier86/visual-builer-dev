import { makeAjvWithTextKeywords } from '../core/ajv-setup';
import type { ValidationResult } from '../types';
import schema from '../../schemas/structured-output.meta.schema.json';

/**
 * Validate an AI-generated Structured Output Schema (AIS)
 *
 * An AIS defines the JSON Schema for AI-generated content.
 * It includes:
 * - OpenAI-compatible structured output schema
 * - Field guidance and constraints
 * - Required properties
 *
 * Used as response_format for OpenAI API calls.
 *
 * @param doc - Unknown input to validate
 * @returns ValidationResult with ok status and any errors
 */
export function validateAIS(doc: unknown): ValidationResult {
  const ajv = makeAjvWithTextKeywords();
  const validate = ajv.compile(schema);
  const ok = validate(doc);

  return {
    ok,
    errors: validate.errors ?? []
  };
}
