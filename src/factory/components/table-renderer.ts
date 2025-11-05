// Table rendering component
// Generates semantic HTML tables with colgroup, thead, tbody

import type { Component, ContentItem } from '../../derivation/types';
import type { RenderPayload } from '../../types/payloads';

import { escapeHtml, escapeAttr } from '../utils/html-escape';
import {
  getByPath,
  inferArrayRoot,
  normalizeRowPath,
} from '../utils/path-resolver';
import type { VerbatimValue } from '../types';
import {
  buildCellClassList,
  deriveCellRole,
  extractTableItems,
  getTableCellHints,
  groupTableItems,
} from './table/utils';

/**
 * Renders a table component with full structure
 *
 * @param comp - Component definition from template
 * @param payload - RPS-validated payload
 * @param collectedRefs - Set to collect verbatim refs for provenance
 * @returns HTML string for the table
 */
export function renderTableComponent(
  comp: Component,
  payload: RenderPayload,
  collectedRefs: Set<string>
): string {
  const props = (comp.props as Record<string, unknown> | undefined) ?? {};
  const columns = Array.isArray(props.columns) ? (props.columns as string[]) : [];
  const colWidths = Array.isArray(props.colWidths) ? (props.colWidths as string[]) : [];
  const content = (comp.content ?? [])[0];
  const rawTableMap = content?.tableMap
    ? (Array.isArray(content.tableMap)
        ? content.tableMap
        : Object.values(content.tableMap))
    : [];
  const tableMap = rawTableMap as ContentItem[];

  const columnCount = columns.length > 0 ? columns.length : Math.max(tableMap.length, 1);
  const columnGroups = distributeTableMap(tableMap, columnCount, columns);

  // Determine array root from tableMap (e.g., "diagnoses[]")
  const rowPath = inferArrayRoot(tableMap);
  const rowsValue = getByPath(payload, rowPath);
  const rows = Array.isArray(rowsValue) ? rowsValue : [];

  const chunks: string[] = [];
  chunks.push(
    `<table class="table" aria-label="${escapeAttr(comp.title || "Table")}">`
  );

  // Colgroup for column widths
  if (colWidths.length === columns.length && colWidths.length > 0) {
    chunks.push(renderColgroup(colWidths));
  }

  // Table headers
  if (columns.length > 0) {
    chunks.push(renderTableHeaders(columns));
  }

  // Table body
  chunks.push(renderTableRows(rows, columnGroups, columnCount, rowPath, payload, collectedRefs));

  chunks.push(`</table>`);
  return chunks.join("");
}

/**
 * Renders colgroup with column widths
 */
function renderColgroup(colWidths: string[]): string {
  const chunks: string[] = ["<colgroup>"];
  for (const width of colWidths) {
    chunks.push(`<col style="width:${escapeAttr(width)}">`);
  }
  chunks.push("</colgroup>");
  return chunks.join("");
}

/**
 * Renders table headers (thead)
 */
function renderTableHeaders(columns: string[]): string {
  const chunks: string[] = ["<thead><tr>"];
  for (const label of columns) {
    chunks.push(`<th scope="col">${escapeHtml(label)}</th>`);
  }
  chunks.push("</tr></thead>");
  return chunks.join("");
}

/**
 * Renders table body (tbody) with data rows
 */
function renderTableRows(
  rows: unknown[],
  columnGroups: ContentItem[][],
  columnCount: number,
  rowPath: string,
  payload: RenderPayload,
  collectedRefs: Set<string>
): string {
  const chunks: string[] = ["<tbody>"];

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    chunks.push("<tr>");

    const maxColumns = Math.min(columnCount, columnGroups.length || columnCount);

    for (let colIndex = 0; colIndex < maxColumns; colIndex++) {
      const colItems = columnGroups[colIndex] ?? [];
      const cellContent = renderTableCellGroup(
        colItems,
        colIndex,
        payload,
        rowPath,
        rowIndex,
        collectedRefs
      );
      chunks.push(`<td>${cellContent ?? "&nbsp;"}</td>`);
    }

    chunks.push("</tr>");
  }

  chunks.push("</tbody>");
  return chunks.join("");
}

function renderTableCellGroup(
  colItems: ContentItem[],
  columnIndex: number,
  payload: RenderPayload,
  rowPath: string,
  rowIndex: number,
  collectedRefs: Set<string>
): string | null {
  if (!colItems || colItems.length === 0) {
    return null;
  }

  const fragments: string[] = [];
  let primaryRendered = false;

  for (const colDef of colItems) {
    const content = renderTableCell(colDef, payload, rowPath, rowIndex, collectedRefs);
    if (!content) continue;

    const hints = getTableCellHints(colDef);
    const role = getCellRole(hints, primaryRendered);
    const classes = buildClassList(role, hints, columnIndex);
    const classAttr = classes.length > 0 ? ` class="${classes.join(" ")}"` : "";

    fragments.push(`<span${classAttr}>${content}</span>`);
    if (role === "primary") {
      primaryRendered = true;
    }
  }

  if (fragments.length === 0) return null;
  if (fragments.length === 1) return fragments[0];
  return `<div class="note-table-stack">${fragments.join("")}</div>`;
}

/**
 * Renders a single table cell
 */
function renderTableCell(
  colDef: ContentItem,
  payload: RenderPayload,
  rowPath: string,
  rowIndex: number,
  collectedRefs: Set<string>
): string | null {
  const basePath = colDef.outputPath ?? colDef.targetPath;
  if (typeof basePath !== "string" || basePath.length === 0) {
    return null;
  }

  const path =
    rowPath && rowPath.length > 0
      ? normalizeRowPath(basePath, rowPath, rowIndex)
      : basePath;
  const value = getByPath(payload, path);

  if (colDef.slot === "verbatim") {
    return renderVerbatimValue(value, collectedRefs);
  }

  if (value == null) return null;
  return escapeHtml(String(value));
}

function distributeTableMap(
  tableMap: ContentItem[],
  columnCount: number,
  columns: string[]
): ContentItem[][] {
  const safeColumnCount = Math.max(columnCount, 1);
  const groups = Array.from({ length: safeColumnCount }, () => [] as ContentItem[]);
  let previousColumn = 0;

  tableMap.forEach((item, index) => {
    if (!item) return;

    const hints = getTableCellHints(item);
    const resolved = resolveColumnIndex(hints, index, safeColumnCount, columns, previousColumn);
    const columnIndex = clamp(resolved, 0, safeColumnCount - 1);
    groups[columnIndex].push(item);
    previousColumn = columnIndex;
  });

  return groups;
}

function resolveColumnIndex(
  hints: TableCellHints,
  index: number,
  columnCount: number,
  columns: string[],
  previousColumn: number
): number {
  const columnHint = hints.columnIndex ?? hints.column;

  if (typeof columnHint === "number" && Number.isFinite(columnHint)) {
    return Math.trunc(columnHint);
  }

  if (typeof columnHint === "string") {
    const matched = matchColumnByName(columnHint, columns);
    if (matched !== -1) return matched;
  }

  if (typeof hints.columnKey === "string") {
    const matched = matchColumnByName(hints.columnKey, columns);
    if (matched !== -1) return matched;
  }

  if (typeof hints.columnId === "string") {
    const matched = matchColumnByName(hints.columnId, columns);
    if (matched !== -1) return matched;
  }

  if (index < columnCount) {
    return index;
  }

  return previousColumn;
}

function getCellRole(hints: TableCellHints, hasPrimary: boolean): "primary" | "support" {
  if (hints.role === "primary" || hints.role === "support") {
    return hints.role;
  }
  return hasPrimary ? "support" : "primary";
}

function buildClassList(role: "primary" | "support", hints: TableCellHints, columnIndex: number): string[] {
  const classes = new Set<string>();
  classes.add(role === "support" ? "note-table-support" : "note-table-primary");

  if (Array.isArray(hints.className)) {
    hints.className.forEach((cls) => {
      if (typeof cls === "string" && cls.trim().length > 0) {
        classes.add(cls.trim());
      }
    });
  } else if (typeof hints.className === "string" && hints.className.trim().length > 0) {
    classes.add(hints.className.trim());
  }

  const emphasis = typeof hints.emphasis === "string" ? hints.emphasis.toLowerCase() : undefined;
  const hasExplicitStyle = Boolean(
    hints.italic ||
      hints.bold ||
      hints.strong ||
      hints.muted ||
      emphasis ||
      hints.className
  );

  if (hints.italic) classes.add("note-table-italic");
  if (hints.bold) classes.add("note-table-bold");
  if (hints.strong) classes.add("note-table-strong");
  if (hints.muted) classes.add("note-table-muted");

  switch (emphasis) {
    case "muted":
      classes.add("note-table-muted");
      break;
    case "strong":
      classes.add("note-table-strong");
      break;
    case "bold":
      classes.add("note-table-bold");
      break;
    case "italic":
      classes.add("note-table-italic");
      break;
    default:
      break;
  }

  if (!hasExplicitStyle) {
    if (role === "support") {
      classes.add("note-table-muted");
      classes.add("note-table-italic");
    } else {
      if (columnIndex === 0) {
        classes.add("note-table-italic");
        classes.add("note-table-muted");
      } else if (columnIndex === 1) {
        classes.add("note-table-italic");
        classes.add("note-table-bold");
      } else if (columnIndex === 2) {
        classes.add("note-table-strong");
      }
    }
  }

  return Array.from(classes);
}

function getTableCellHints(item: ContentItem): TableCellHints {
  if (!isRecord(item.styleHints)) return {};

  const tableHintsRaw = isRecord(item.styleHints.tableCell)
    ? item.styleHints.tableCell
    : isRecord(item.styleHints.table)
      ? item.styleHints.table
      : undefined;

  if (!isRecord(tableHintsRaw)) return {};
  return tableHintsRaw as TableCellHints;
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
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null;
}

/**
 * Renders a verbatim value with optional ref footnote
 */
function renderVerbatimValue(
  value: unknown,
  collectedRefs: Set<string>
): string | null {
  if (!value) return null;

  if (isVerbatimValue(value)) {
    const verbatim = value;
    let html = escapeHtml(verbatim.text);

    if (verbatim.ref) {
      collectedRefs.add(verbatim.ref);
      const refIndex = Array.from(collectedRefs).indexOf(verbatim.ref) + 1;
      html += `<sup><a href="#src-${refIndex}">[${refIndex}]</a></sup>`;
    }

    return html;
  }

  return escapeHtml(String(value));
}

function isVerbatimValue(value: unknown): value is VerbatimValue {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>).text === 'string'
  );
}
