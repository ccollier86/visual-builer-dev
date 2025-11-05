// Table rendering component
// Generates semantic HTML tables with colgroup, thead, tbody

import type { Component, ContentItem } from '../../derivation/types';
import type { RenderPayload } from '../../types/payloads';

import { escapeHtml, escapeAttr } from "../utils/html-escape";
import {
  getByPath,
  inferArrayRoot,
  normalizeRowPath,
} from "../utils/path-resolver";
import type { VerbatimValue } from "../types";

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
  const tableMap = content?.tableMap ? Object.values(content.tableMap) as ContentItem[] : [];

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
  chunks.push(renderTableRows(rows, tableMap, rowPath, payload, collectedRefs));

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
  tableMap: ContentItem[],
  rowPath: string,
  payload: RenderPayload,
  collectedRefs: Set<string>
): string {
  const chunks: string[] = ["<tbody>"];

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    chunks.push("<tr>");

    for (const colDef of tableMap) {
      const cellContent = renderTableCell(
        colDef,
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
