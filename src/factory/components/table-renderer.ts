/**
 * Table Rendering Component
 *
 * Domain: factory/components/table-renderer
 * Responsibility: Generate semantic HTML tables from template definitions.
 */

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
  const tableItems = extractTableItems(content?.tableMap);

  const columnCount = columns.length > 0 ? columns.length : Math.max(tableItems.length, 1);
  const columnGroups = groupTableItems(tableItems, columnCount, columns);

  // Determine array root from tableMap (e.g., "diagnoses[]")
  const rowPath = inferArrayRoot(tableItems);
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
 * Render table body rows using grouped column definitions.
 *
 * @param rows - Array of row source data values.
 * @param columnGroups - Columns grouped by template mapping order.
 * @param columnCount - Expected number of visible columns.
 * @param rowPath - Normalized row path for lookup.
 * @param payload - Fully-resolved render payload.
 * @param collectedRefs - Accumulator for provenance references.
 * @returns HTML string representing the table body.
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

/**
 * Render a collection of table cell items as a single column.
 *
 * @param colItems - Content items mapped to this column.
 * @param columnIndex - Index of the column being rendered.
 * @param payload - Fully-resolved render payload.
 * @param rowPath - Normalized row path for lookup.
 * @param rowIndex - Current row index in the source array.
 * @param collectedRefs - Accumulator for provenance references.
 * @returns HTML string for the column cell or null when empty.
 */
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
    const role = deriveCellRole(hints, primaryRendered);
    const classes = buildCellClassList(role, hints, columnIndex);
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
 * Render a single table cell from a content item definition.
 *
 * @param colDef - Content item definition for this cell.
 * @param payload - Fully-resolved render payload.
 * @param rowPath - Normalized row path for lookup.
 * @param rowIndex - Current row index in the source array.
 * @param collectedRefs - Accumulator for provenance references.
 * @returns Escaped HTML string for the cell or null when blank.
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

/**
 * Render a verbatim value with optional reference footnote.
 *
 * @param value - Verbatim or primitive value for the cell.
 * @param collectedRefs - Accumulator for provenance references.
 * @returns Escaped HTML string or null when value is empty.
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
