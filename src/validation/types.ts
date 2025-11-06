import type { ErrorObject } from 'ajv';

/**
 * Standard validation result format
 * Used across all validators for consistency
 */
export interface ValidationResult {
  ok: boolean;
  errors: ErrorObject[];
  warnings: ErrorObject[];
}

/**
 * Runtime schema validator function signature.
 * Accepts arbitrary data and returns structured validation metadata.
 */
export type SchemaValidator = (data: unknown) => ValidationResult;

/**
 * Common alias for AJV validation issues so downstream domains can
 * depend on validation without importing AJV types directly.
 */
export type ValidationIssue = ErrorObject;

/**
 * Unified severity scale for lint findings surfaced during template validation.
 */
export type LintSeverity = 'error' | 'warning' | 'info';

/**
 * Structured lint issue surfaced while analysing a note template.
 */
export interface TemplateLintIssue {
  code: string;
  message: string;
  severity: LintSeverity;
  componentId?: string;
  slotId?: string;
  path?: string;
}

/**
 * Aggregate lint result containing both blocking errors and advisory warnings.
 */
export interface TemplateLintResult {
  issues: TemplateLintIssue[];
  errors: TemplateLintIssue[];
  warnings: TemplateLintIssue[];
}
