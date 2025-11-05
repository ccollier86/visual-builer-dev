import type { ErrorObject } from 'ajv';

/**
 * Standard validation result format
 * Used across all validators for consistency
 */
export interface ValidationResult {
  ok: boolean;
  errors: ErrorObject[];
}

/**
 * Runtime schema validator function signature.
 * Accepts arbitrary data and returns structured validation metadata.
 */
export type SchemaValidator = (data: unknown) => ValidationResult;
