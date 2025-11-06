/**
 * Template Linting - Shared Types and Constants
 *
 * Domain: validation/lint
 * Responsibility: Provide reusable utilities for template lint rules.
 */

import type { TemplateLintIssue, LintSeverity } from '../types';

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

/**
 * Helper for recording lint issues with consistent metadata.
 */
export function reportLintIssue(
  report: (issue: TemplateLintIssue) => void,
  issue: TemplateLintIssue
): void {
  report(issue);
}

export function buildTemplateLintIssue(
  code: string,
  message: string,
  severity: LintSeverity,
  context: LintContext,
  slotId?: string
): TemplateLintIssue {
  const issue: TemplateLintIssue = {
    code,
    message,
    severity,
    componentId: context.componentId,
    path: context.componentPath,
  };

  if (slotId) {
    issue.slotId = slotId;
  }

  return issue;
}
