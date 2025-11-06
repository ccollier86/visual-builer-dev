import type { NoteTemplate, Component, ContentItem } from '../../derivation/types';
import type {
  TemplateLintIssue,
  TemplateLintResult,
  LintSeverity,
} from '../types';

const KNOWN_STYLE_HINT_KEYS = new Set(['tone', 'tableCell']);

interface LintContext {
  componentPath: string;
  componentId: string;
  tableColumns?: string[];
}

export function lintNoteTemplate(template: NoteTemplate): TemplateLintResult {
  const issues: TemplateLintIssue[] = [];

  const report = (issue: TemplateLintIssue) => {
    issues.push(issue);
  };

  const visitComponent = (component: Component, parentPath: string[]) => {
    const componentPathParts = [...parentPath, component.id];
    const componentPath = componentPathParts.join('.');
    const context: LintContext = {
      componentPath,
      componentId: component.id,
    };

    if (component.type === 'table') {
      lintTableComponent(component, context, report);
    }

    if (Array.isArray(component.content)) {
      component.content.forEach(item => lintContentItem(item, component, context, report));
    }

    if (Array.isArray(component.children)) {
      component.children.forEach(child => visitComponent(child, componentPathParts));
    }
  };

  template.layout.forEach(component => visitComponent(component, []));

  const errors = issues.filter(issue => issue.severity === 'error');
  const warnings = issues.filter(issue => issue.severity !== 'error');

  return { issues, errors, warnings };
}

function lintTableComponent(
  component: Component,
  context: LintContext,
  report: (issue: TemplateLintIssue) => void
): void {
  const props = component.props as { columns?: unknown; colWidths?: unknown } | undefined;
  const columns = Array.isArray(props?.columns) ? props?.columns : undefined;

  if (!columns || columns.length === 0) {
    reportIssue(report, 'table.columns.required', 'Table components must declare at least one column in props.columns.', 'error', context);
  }

  const colWidths = Array.isArray(props?.colWidths) ? props?.colWidths : undefined;
  if (columns && colWidths && colWidths.length !== columns.length) {
    reportIssue(
      report,
      'table.colWidths.mismatch',
      `colWidths length (${colWidths.length}) must match columns length (${columns.length}).`,
      'error',
      context
    );
  }

  context.tableColumns = columns;
}

function lintContentItem(
  item: ContentItem,
  component: Component,
  context: LintContext,
  report: (issue: TemplateLintIssue) => void
): void {
  if (item.slot === 'ai') {
    lintAiSlot(item, component, context, report);
  }

  if (item.styleHints && typeof item.styleHints === 'object') {
    lintStyleHints(item.styleHints, context, item.id, report, context.tableColumns);
  }

  if (Array.isArray(item.listItems)) {
    item.listItems.forEach(nested => lintContentItem(nested, component, context, report));
  }

  if (item.tableMap) {
    lintTableMap(item.tableMap, component, context, report);
  }
}

function lintAiSlot(
  item: ContentItem,
  component: Component,
  context: LintContext,
  report: (issue: TemplateLintIssue) => void
): void {
  const hasSource = Array.isArray(item.source) && item.source.length > 0;
  const deps = Array.isArray(item.aiDeps) ? item.aiDeps.filter(Boolean) : [];

  if (!hasSource && deps.length === 0) {
    reportIssue(
      report,
      'ai.deps.required',
      'AI content must specify aiDeps when no source data is declared.',
      'error',
      context,
      item.id
    );
  }

  if (Array.isArray(item.aiDeps)) {
    if (item.aiDeps.length === 0) {
      reportIssue(
        report,
        'ai.deps.empty',
        'aiDeps array must include at least one dependency path.',
        'error',
        context,
        item.id
      );
    }

    const seen = new Set<string>();
    item.aiDeps.forEach((dep, index) => {
      if (typeof dep !== 'string' || dep.trim().length === 0) {
        reportIssue(
          report,
          'ai.deps.invalid',
          `aiDeps[${index}] must be a non-empty string path.`,
          'error',
          context,
          item.id
        );
        return;
      }

      const trimmed = dep.trim();
      if (seen.has(trimmed)) {
        reportIssue(
          report,
          'ai.deps.duplicate',
          `Duplicate dependency '${trimmed}' found in aiDeps.`,
          'warning',
          context,
          item.id
        );
      } else {
        seen.add(trimmed);
      }
    });
  }
}

function lintStyleHints(
  styleHints: Record<string, unknown>,
  context: LintContext,
  slotId: string | undefined,
  report: (issue: TemplateLintIssue) => void,
  columns?: string[]
): void {
  Object.entries(styleHints).forEach(([key, value]) => {
    if (!KNOWN_STYLE_HINT_KEYS.has(key)) {
      reportIssue(
        report,
        'styleHint.unknown',
        `Style hint '${key}' is not recognised; update documentation or remove the hint if unintended.`,
        'warning',
        context,
        slotId
      );
    }

    if (key === 'tableCell' && value && typeof value === 'object') {
      const columnIndex = (value as { columnIndex?: unknown }).columnIndex;
      if (columnIndex !== undefined) {
        if (typeof columnIndex !== 'number' || !Number.isInteger(columnIndex)) {
          reportIssue(
            report,
            'styleHint.tableCell.columnIndex.type',
            'tableCell.columnIndex must be an integer column position.',
            'error',
            context,
            slotId
          );
        } else if (columns && (columnIndex < 0 || columnIndex >= columns.length)) {
          reportIssue(
            report,
            'styleHint.tableCell.columnIndex.range',
            `tableCell.columnIndex ${columnIndex} is outside the configured column range (0-${columns.length - 1}).`,
            'error',
            context,
            slotId
          );
        }
      }
    }
  });
}

function lintTableMap(
  tableMap: ContentItem[] | Record<string, ContentItem>,
  component: Component,
  context: LintContext,
  report: (issue: TemplateLintIssue) => void
): void {
  const cells = Array.isArray(tableMap) ? tableMap : Object.values(tableMap);

  if (context.tableColumns && cells.length !== context.tableColumns.length) {
    reportIssue(
      report,
      'table.map.length',
      `tableMap column count (${cells.length}) must match props.columns length (${context.tableColumns.length}).`,
      'error',
      context,
      component.id
    );
  }

  cells.forEach(cell => lintContentItem(cell, component, context, report));
}

function reportIssue(
  report: (issue: TemplateLintIssue) => void,
  code: string,
  message: string,
  severity: LintSeverity,
  context: LintContext,
  slotId?: string
): void {
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

  report(issue);
}
