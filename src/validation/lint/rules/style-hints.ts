/**
 * Template Linting Rules - Style Hints
 *
 * Domain: validation/lint/rules
 * Responsibility: Validate style hint vocabulary and table cell metadata.
 */

import type { Component } from '../../../derivation/types';
import type { TemplateLintIssue } from '../../types';
import type { LintContext } from '../shared';
import { KNOWN_STYLE_HINT_KEYS, buildTemplateLintIssue, reportLintIssue } from '../shared';

type ReportFn = (issue: TemplateLintIssue) => void;

export function lintStyleHints(
  styleHints: Record<string, unknown>,
  context: LintContext,
  slotId: string | undefined,
  report: ReportFn,
  columns?: string[]
): void {
  Object.entries(styleHints).forEach(([key, value]) => {
    if (!KNOWN_STYLE_HINT_KEYS.has(key)) {
      reportLintIssue(
        report,
        buildTemplateLintIssue(
          'styleHint.unknown',
          `Style hint '${key}' is not recognised; update documentation or remove the hint if unintended.`,
          'warning',
          context,
          slotId
        )
      );
      return;
    }

    if (key === 'tableCell' && typeof value === 'object' && value !== null) {
      lintTableCellHints(value as Record<string, unknown>, context, slotId, report, columns);
    }
  });
}

function lintTableCellHints(
  hints: Record<string, unknown>,
  context: LintContext,
  slotId: string | undefined,
  report: ReportFn,
  columns?: string[]
): void {
  if (typeof hints.columnIndex === 'number' && !Number.isInteger(hints.columnIndex)) {
    reportLintIssue(
      report,
      buildTemplateLintIssue(
        'table.cell.columnIndex.integer',
        `tableCell.columnIndex must be an integer when provided.`,
        'error',
        context,
        slotId
      )
    );
  }

  if (Array.isArray(columns) && typeof hints.columnIndex === 'number') {
    if (hints.columnIndex < 0 || hints.columnIndex >= columns.length) {
      reportLintIssue(
        report,
        buildTemplateLintIssue(
          'table.cell.columnIndex.range',
          `tableCell.columnIndex ${hints.columnIndex} is outside the configured column range (0-${columns.length - 1}).`,
          'error',
          context,
          slotId
        )
      );
    }
  }
}
