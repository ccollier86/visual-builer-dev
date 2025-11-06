/**
 * Template Linting Rules - AI Slots
 *
 * Domain: validation/lint/rules
 * Responsibility: Validate AI content items for dependency metadata.
 */

import type { ContentItem, Component } from '../../../derivation/types';
import type { TemplateLintIssue } from '../../types';
import type { LintContext } from '../shared';
import { buildTemplateLintIssue, reportLintIssue } from '../shared';

type ReportFn = (issue: TemplateLintIssue) => void;

/**
 * Ensure AI slots carry sufficient dependency metadata for downstream composition.
 */
export function lintAiSlot(
  item: ContentItem,
  component: Component,
  context: LintContext,
  report: ReportFn
): void {
  const hasSource = Array.isArray(item.source) && item.source.length > 0;
  const deps = Array.isArray(item.aiDeps) ? item.aiDeps.filter(Boolean) : [];

  if (!hasSource && deps.length === 0) {
    reportLintIssue(
      report,
      buildTemplateLintIssue(
        'ai.deps.required',
        'AI content must specify aiDeps when no source data is declared.',
        'error',
        context,
        item.id
      )
    );
  }

  if (Array.isArray(item.aiDeps)) {
    if (item.aiDeps.length === 0) {
      reportLintIssue(
        report,
        buildTemplateLintIssue(
          'ai.deps.empty',
          'aiDeps array must include at least one dependency path.',
          'error',
          context,
          item.id
        )
      );
    }

    const seen = new Set<string>();
    item.aiDeps.forEach((dep, index) => {
      if (typeof dep !== 'string' || dep.trim().length === 0) {
        reportLintIssue(
          report,
          buildTemplateLintIssue(
            'ai.deps.invalid',
            `aiDeps[${index}] must be a non-empty string path.`,
            'error',
            context,
            item.id
          )
        );
        return;
      }

      const trimmed = dep.trim();
      if (seen.has(trimmed)) {
        reportLintIssue(
          report,
          buildTemplateLintIssue(
            'ai.deps.duplicate',
            `Duplicate dependency '${trimmed}' found in aiDeps.`,
            'warning',
            context,
            item.id
          )
        );
      } else {
        seen.add(trimmed);
      }
    });
  }
}
