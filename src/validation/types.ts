import type { ErrorObject } from 'ajv';

/**
 * Standard validation result format
 * Used across all validators for consistency
 */
export interface ValidationResult {
  ok: boolean;
  errors: ErrorObject[];
}
