import type { ContentItem } from '../../../derivation/types';
import type { ComponentDiagnostic } from '../../types';
import type { TableCellHints } from './types';

/**
 * Normalize the template's tableMap definition to an ordered array.
 */
export function extractTableItems(
  tableMap: ContentItem['tableMap']
): ContentItem[] {
  if (!tableMap) return [];
  return Array.isArray(tableMap) ? tableMap : Object.values(tableMap);
}

/**
 * Distribute table items into column buckets.
 * Falls back to sequential assignment when hints are absent.
 */
export function groupTableItems(
  items: ContentItem[],
  columnCount: number,
  columnLabels: string[]
): ContentItem[][] {
  const safeCount = Math.max(columnCount, 1);
  const groups = Array.from({ length: safeCount }, () => [] as ContentItem[]);
  let previousColumn = 0;

  items.forEach((item, index) => {
    if (!item) return;

    const hints = getTableCellHints(item);
    const resolved = resolveColumnIndex(hints, index, safeCount, columnLabels, previousColumn);
    const columnIndex = clamp(resolved, 0, safeCount - 1);
    groups[columnIndex].push(item);
    previousColumn = columnIndex;
  });

  return groups;
}

/**
 * Resolve role hints with sensible defaults.
 */
export function deriveCellRole(
  hints: TableCellHints,
  hasPrimary: boolean
): 'primary' | 'support' {
  if (hints.role === 'primary' || hints.role === 'support') {
    return hints.role;
  }
  return hasPrimary ? 'support' : 'primary';
}

/**
 * Build CSS class list combining explicit hints with column defaults.
 */
export function buildCellClassList(
  role: 'primary' | 'support',
  hints: TableCellHints,
  columnIndex: number
): string[] {
  const classes = new Set<string>();
  classes.add(role === 'support' ? 'note-table-support' : 'note-table-primary');

  if (Array.isArray(hints.className)) {
    hints.className.forEach((cls) => {
      if (typeof cls === 'string' && cls.trim().length > 0) {
        classes.add(cls.trim());
      }
    });
  } else if (typeof hints.className === 'string' && hints.className.trim().length > 0) {
    classes.add(hints.className.trim());
  }

  const emphasis = typeof hints.emphasis === 'string' ? hints.emphasis.toLowerCase() : undefined;
  const hasExplicitStyle = Boolean(
    hints.italic ||
      hints.bold ||
      hints.strong ||
      hints.muted ||
      emphasis ||
      hints.className
  );

  if (hints.italic) classes.add('note-table-italic');
  if (hints.bold) classes.add('note-table-bold');
  if (hints.strong) classes.add('note-table-strong');
  if (hints.muted) classes.add('note-table-muted');

  switch (emphasis) {
    case 'muted':
      classes.add('note-table-muted');
      break;
    case 'strong':
      classes.add('note-table-strong');
      break;
    case 'bold':
      classes.add('note-table-bold');
      break;
    case 'italic':
      classes.add('note-table-italic');
      break;
    default:
      break;
  }

  if (!hasExplicitStyle) {
    if (role === 'support') {
      classes.add('note-table-muted');
      classes.add('note-table-italic');
    } else {
      if (columnIndex === 0) {
        classes.add('note-table-italic');
        classes.add('note-table-muted');
      } else if (columnIndex === 1) {
        classes.add('note-table-italic');
        classes.add('note-table-bold');
      } else if (columnIndex === 2) {
        classes.add('note-table-strong');
      }
    }
  }

  return Array.from(classes);
}

/**
 * Extract style hints for a table cell.
 */
export function getTableCellHints(item: ContentItem): TableCellHints {
  if (!isRecord(item.styleHints)) return {};

  const tableHintsRaw = isRecord(item.styleHints.tableCell)
    ? item.styleHints.tableCell
    : isRecord(item.styleHints.table)
      ? item.styleHints.table
      : undefined;

  if (!isRecord(tableHintsRaw)) return {};
  return tableHintsRaw as TableCellHints;
}

function resolveColumnIndex(
  hints: TableCellHints,
  index: number,
  columnCount: number,
  columns: string[],
  previousColumn: number
): number {
  const columnHint = hints.columnIndex ?? hints.column;

  if (typeof columnHint === 'number' && Number.isFinite(columnHint)) {
    return Math.trunc(columnHint);
  }

  if (typeof columnHint === 'string') {
    const matched = matchColumnByName(columnHint, columns);
    if (matched !== -1) return matched;
  }

  if (typeof hints.columnKey === 'string') {
    const matched = matchColumnByName(hints.columnKey, columns);
    if (matched !== -1) return matched;
  }

  if (typeof hints.columnId === 'string') {
    const matched = matchColumnByName(hints.columnId, columns);
    if (matched !== -1) return matched;
  }

  if (index < columnCount) {
    return index;
  }

  return previousColumn;
}

function matchColumnByName(name: string, columns: string[]): number {
  if (!name) return -1;
  const target = normalizeColumnName(name);
  for (let i = 0; i < columns.length; i++) {
    if (normalizeColumnName(columns[i]) === target) {
      return i;
    }
  }
  return -1;
}

function normalizeColumnName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null;
}

/**
 * Produce diagnostics when template column hints do not align with provided column labels.
 */
export function collectTableDiagnostics(
  columns: string[],
  columnGroups: ContentItem[][]
): ComponentDiagnostic[] {
  const diagnostics: ComponentDiagnostic[] = [];

  if (columns.length > 0 && columnGroups.length !== columns.length) {
    diagnostics.push({
      code: 'table.columns.mismatch',
      message: `Template declares ${columns.length} columns but ${columnGroups.length} column groups were generated.`,
      severity: 'warning',
    });
  }

  columnGroups.forEach((group, index) => {
    if (group.length === 0) {
      diagnostics.push({
        code: 'table.column.empty',
        message: `Column index ${index} has no mapped content items.`,
        severity: 'warning',
      });
    }
  });

  return diagnostics;
}
