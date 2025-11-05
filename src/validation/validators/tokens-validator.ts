import schema from '../../schemas/design-tokens.schema.json';
import { makeAjvWithTextKeywords } from '../core/ajv-setup';
import type { ValidationResult } from '../types';

/**
 * Validate Design Tokens
 *
 * Design tokens define the visual styling for clinical notes:
 * - Typography (fonts, sizes, line heights)
 * - Colors (text, backgrounds, borders)
 * - Spacing and layout
 * - Print settings (@page, margins)
 * - Table and list styles
 *
 * Used to generate CSS for screen and print media.
 *
 * @param doc - Unknown input to validate
 * @returns ValidationResult with ok status and any errors
 */
export function validateDesignTokens(doc: unknown): ValidationResult {
	const ajv = makeAjvWithTextKeywords();
	const validate = ajv.compile(schema);
	const ok = validate(doc);

	return {
		ok,
		errors: validate.errors ?? [],
	};
}
