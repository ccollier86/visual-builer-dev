/**
 * Template Linting Rules - Table Components
 *
 * Domain: validation/lint/rules
 * Responsibility: Validate table component metadata and cell mappings.
 */

import type { Component, ContentItem } from '../../../derivation/types';
import type { TemplateLintIssue } from '../../types';
import type { LintContext } from '../shared';
import { buildTemplateLintIssue, reportLintIssue } from '../shared';

type ReportFn = (issue: TemplateLintIssue) => void;
type ContentItemLintFn = (
  item: ContentItem,
  component: Component,
  context: LintContext,
  report: ReportFn
) => void;

/**
 * Validate table metadata for column definitions and column widths.
 */
export function lintTableComponent(
  component: Component,
  context: LintContext,
  report: ReportFn
): string[] | undefined {
  const props = component.props as { columns?: unknown; colWidths?: unknown } | undefined;
  const columns = Array.isArray(props?.columns) ? props.columns : undefined;

  if (!columns || columns.length === 0) {
    reportLintIssue(
      report,
      buildTemplateLintIssue(
        'table.columns.required',
        'Table components must declare at least one column in props.columns.',
        'error',
        context
      )
    );
  }

  const colWidths = Array.isArray(props?.colWidths) ? props.colWidths : undefined;
  if (columns && colWidths && colWidths.length !== columns.length) {
    reportLintIssue(
      report,
      buildTemplateLintIssue(
        'table.colWidths.mismatch',
        `colWidths length (${colWidths.length}) must match columns length (${columns.length}).`,
        'error',
        context
      )
    );
  }

  return columns;
}

/**
 * Validate column mappings inside a tableMap definition.
 */
export function lintTableMap(
  tableMap: ContentItem[] | Record<string, ContentItem>,
  component: Component,
  context: LintContext,
  report: ReportFn,
  lintContentItem: ContentItemLintFn
): void {
  const cells = Array.isArray(tableMap) ? tableMap : Object.values(tableMap);
  const totalColumns = context.tableColumns?.length ?? 0;
  const columnCoverage = totalColumns > 0 ? Array(totalColumns).fill(false) : [];

  cells.forEach((cell, index) => {
    if (totalColumns > 0) {
      const columnIndex = resolveTableColumnIndex(cell, index, context.tableColumns);

      if (columnIndex === undefined) {
        reportLintIssue(
          report,
          buildTemplateLintIssue(
            'table.map.unassigned',
            `Unable to infer column mapping for tableMap item at index ${index}. Provide styleHints.tableCell.columnIndex or column key.`,
            'error',
            context,
            component.id
          )
        );
      } else if (columnIndex < 0 || columnIndex >= totalColumns) {
        reportLintIssue(
          report,
          buildTemplateLintIssue(
            'table.map.index.range',
            `tableMap item at index ${index} maps to column ${columnIndex}, which exceeds configured column range (0-${totalColumns - 1}).`,
            'error',
            context,
            component.id
          )
        );
      } else {
        columnCoverage[columnIndex] = true;
      }
    }

    lintContentItem(cell, component, context, report);
  });

  if (totalColumns > 0) {
    columnCoverage.forEach((hasContent, columnIndex) => {
      if (!hasContent) {
        reportLintIssue(
          report,
          buildTemplateLintIssue(
            'table.column.empty',
            `Column index ${columnIndex} has no mapped content items.`,
            'error',
            context,
            component.id
          )
        );
      }
    });
  }
}

function resolveTableColumnIndex(
  cell: ContentItem,
  index: number,
  columns: string[] | undefined
): number | undefined {
  const hints = extractTableCellHints(cell);

  if (hints) {
    const columnHint =
      hints.columnIndex ?? hints.column ?? hints.columnKey ?? hints.columnId;

    if (typeof columnHint === 'number' && Number.isFinite(columnHint)) {
      return Math.trunc(columnHint);
    }

    if (typeof columnHint === 'string' && columns && columns.length > 0) {
      const normalized = normalizeColumnName(columnHint);
      const match = columns.findIndex(col => normalizeColumnName(col) === normalized);
      if (match !== -1) {
        return match;
      }
    }
  }

  if (!columns || columns.length === 0) {
    return undefined;
  }

  if (index < columns.length) {
    return index;
  }

  return undefined;
}

function extractTableCellHints(cell: ContentItem): Record<string, unknown> | undefined {
  if (!cell.styleHints || typeof cell.styleHints !== 'object') {
    return undefined;
  }

  const raw =
    (cell.styleHints as Record<string, unknown>).tableCell ??
    (cell.styleHints as Record<string, unknown>).table;

  if (!raw || typeof raw !== 'object') {
    return undefined;
  }

  return raw as Record<string, unknown>;
}

function normalizeColumnName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
