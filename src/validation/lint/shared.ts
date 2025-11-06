/**
 * Template Linting - Shared Types and Constants
 *
 * Domain: validation/lint
 * Responsibility: Provide reusable utilities for template lint rules.
 */

export const KNOWN_STYLE_HINT_KEYS = new Set<string>(['tone', 'tableCell']);

/**
 * Traversal context carried while linting nested components.
 */
export interface LintContext {
  /** Dot-notated path representing the current component location. */
  componentPath: string;
  /** Component identifier passed through for diagnostic reporting. */
  componentId: string;
  /** Column labels for the nearest table, used to validate cell mappings. */
  tableColumns?: string[];
}
