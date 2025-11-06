/**
 * Validation Domain
 *
 * Provides AJV-based validation for all schema types in the system.
 * Includes custom keywords for clinical documentation requirements.
 *
 * SOR: This is the single source of truth for validation logic.
 * SOD: Each validator has one responsibility - validate one schema type.
 * DI: Validators are pure functions, no external dependencies.
 */

// Core validation setup
export { makeAjvWithTextKeywords } from './core/ajv-setup';
export { addCustomKeywords } from './core/custom-keywords';

// Validators
export { validateNoteTemplate } from './validators/template-validator';
export { validateAIS } from './validators/ais-validator';
export {
  createAIOutputValidator,
  getAIOutputValidator,
  clearAIOutputValidatorCache
} from './validators/ai-output-validator';
export { validateNAS } from './validators/nas-validator';
export { validatePromptBundle } from './validators/prompt-validator';
export { validateRPS } from './validators/rps-validator';
export { validateDesignTokens } from './validators/tokens-validator';
export { lintNoteTemplate } from './lint';

// Types
export type {
  ValidationResult,
  ValidationIssue,
  LintSeverity,
  TemplateLintIssue,
  TemplateLintResult,
} from './types';
