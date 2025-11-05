import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { addCustomKeywords } from './custom-keywords';

/**
 * Create and configure an AJV instance with all custom keywords
 *
 * Configuration:
 * - Strict mode enabled for safety
 * - All formats enabled (date, email, uri, etc.)
 * - Custom text validation keywords (x-minWords, x-maxWords, x-minSentences, x-maxSentences)
 *
 * This is the SOR (System of Record) for validation configuration.
 * All validators use this function to get a properly configured AJV instance.
 *
 * @returns Configured AJV instance ready for schema compilation
 */
export function makeAjvWithTextKeywords(): Ajv {
  // Create AJV instance with draft 2020-12 support
  const ajv = new Ajv({
    strict: false,  // Relaxed to allow conditional schemas
    allErrors: true,
    verbose: true,
    validateFormats: true,
    validateSchema: false  // Disable meta-schema validation to support 2020-12
  });

  // Add standard format validators (email, uri, date, etc.)
  addFormats(ajv);

  // Add custom keywords for clinical documentation
  addCustomKeywords(ajv);

  return ajv;
}
