import { makeAjvWithTextKeywords } from '../core/ajv-setup';
import type { ValidationResult } from '../types';
import schema from '../../schemas/render-payload.meta.schema.json';

/**
 * Validate a Render Payload Schema (RPS)
 *
 * An RPS is the merged schema of AIS + NAS, representing all data
 * needed to render a complete clinical note.
 *
 * It includes:
 * - AI-generated content (from AIS)
 * - Non-AI data (from NAS)
 * - Type constraints for all fields
 *
 * Used to validate the final payload before HTML rendering.
 *
 * @param doc - Unknown input to validate
 * @returns ValidationResult with ok status and any errors
 */
export function validateRPS(doc: unknown): ValidationResult {
  const ajv = makeAjvWithTextKeywords();
  const validate = ajv.compile(schema);
  const ok = validate(doc);

  return {
    ok,
    errors: validate.errors ?? [],
    warnings: []
  };
}
