import { makeAjvWithTextKeywords } from '../core/ajv-setup';
import type { ValidationResult } from '../types';
import schema from '../../schemas/note-template.schema.json';

/**
 * Validate a Note Template document
 *
 * A Note Template defines:
 * - Template metadata (id, name, version)
 * - Style/design tokens
 * - Prompt configuration
 * - Layout structure with sections, subsections, and content slots
 *
 * @param doc - Unknown input to validate
 * @returns ValidationResult with ok status and any errors
 */
export function validateNoteTemplate(doc: unknown): ValidationResult {
  const ajv = makeAjvWithTextKeywords();
  const validate = ajv.compile(schema);
  const ok = validate(doc);

  return {
    ok,
    errors: validate.errors ?? [],
    warnings: []
  };
}
