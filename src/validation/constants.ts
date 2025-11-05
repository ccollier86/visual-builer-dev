/**
 * Validation domain constants.
 *
 * Defines classification metadata for AJV keyword handling so downstream
 * logic can consistently decide whether a violation is treated as an error
 * or downgraded to a warning.
 */

/**
 * Custom text keywords that should be downgraded to warnings when violated.
 *
 * These constraints guide AI behaviour but should not prevent the pipeline
 * from returning results when the model under-shoots targets due to token
 * limits or other variability.
 */
export const SOFT_TEXT_KEYWORDS = [
  'x-minSentences',
  'x-minWords',
] as const;

/**
 * Internal lookup set for fast classification checks.
 */
export const SOFT_TEXT_KEYWORD_SET = new Set<string>(SOFT_TEXT_KEYWORDS);
