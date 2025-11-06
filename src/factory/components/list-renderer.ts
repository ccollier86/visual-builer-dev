// List rendering component
// Handles ordered (ol) and unordered (ul) list generation

import type { Component, ContentItem } from '../../derivation/types';
import type { RenderPayload } from '../../types/payloads';
import type { ComponentDiagnostic } from '../types';

import { escapeHtml } from "../utils/html-escape";
import {
  getByPath,
  inferArrayRoot,
  normalizeRowPath,
} from "../utils/path-resolver";
import type { VerbatimValue } from "../types";

/**
 * Renders a list component (ol or ul)
 *
 * @param comp - Component definition from template
 * @param payload - RPS-validated payload
 * @param collectedRefs - Set to collect verbatim refs for provenance
 * @returns HTML string for the list
 */
export function renderListComponent(
  comp: Component,
  payload: RenderPayload,
  collectedRefs: Set<string>
): string {
  const props = (comp.props as Record<string, unknown> | undefined) ?? {};
  const ordered = Boolean(props.ordered);
  const tag = ordered ? "ol" : "ul";

  const content = comp.content ?? [];
  const listContainer = content[0];
  const itemsDef = listContainer?.listItems ?? [];

  // Determine array root from item paths (e.g., "plan.homework[]")
  const rowPath = inferArrayRoot(itemsDef);
  const rowsValue = rowPath ? getByPath(payload, rowPath) : undefined;
  const rows = Array.isArray(rowsValue) ? rowsValue : [];
  const listDiagnostics = collectListDiagnostics(comp.id, rowPath, itemsDef, rows.length);
  if (listDiagnostics.length > 0) {
    logListDiagnostics(listDiagnostics);
  }

  const chunks: string[] = [];
  chunks.push(`<${tag} class="list">`);

  if (rowPath && rows.length > 0) {
    for (let i = 0; i < rows.length; i++) {
      const itemContent = renderListItem(itemsDef, payload, rowPath, i, collectedRefs);
      if (itemContent) {
        chunks.push(`<li>${itemContent}</li>`);
      }
    }
  } else {
    for (const item of content) {
      const rendered = renderExplicitListItem(item, payload, collectedRefs);
      if (rendered) {
        chunks.push(`<li>${rendered}</li>`);
      }
    }
  }

  chunks.push(`</${tag}>`);
  return chunks.join("");
}

/**
 * Renders content for a single list item
 *
 * @param itemsDef - Array of content item definitions for list items
 * @param payload - RPS payload
 * @param rowPath - Array root path (e.g., "homework[]")
 * @param rowIndex - Current row index
 * @param collectedRefs - Set to collect verbatim refs
 * @returns Rendered item content
 */
function renderListItem(
  itemsDef: ContentItem[],
  payload: RenderPayload,
  rowPath: string,
  rowIndex: number,
  collectedRefs: Set<string>
): string {
  const parts: string[] = [];

  for (const def of itemsDef) {
    const basePath = def.outputPath ?? def.targetPath;
    if (!basePath) {
      continue;
    }

    const path =
      rowPath && rowPath.length > 0
        ? normalizeRowPath(basePath, rowPath, rowIndex)
        : basePath;
    const value = getByPath(payload, path);

    if (def.slot === "verbatim") {
      const rendered = renderVerbatimValue(value, collectedRefs);
      if (rendered) parts.push(rendered);
    } else if (value != null) {
      parts.push(escapeHtml(String(value)));
    }
  }

  return parts.join(" ").trim();
}

function renderExplicitListItem(
  def: ContentItem,
  payload: RenderPayload,
  collectedRefs: Set<string>
): string | null {
  if (def.slot === 'verbatim') {
    return renderVerbatimValue(getValueForItem(def, payload), collectedRefs);
  }

  const value = getValueForItem(def, payload);

  if (value != null) {
    return escapeHtml(String(value));
  }

  if (def.slot === 'static' && typeof def.text === 'string') {
    return escapeHtml(def.text);
  }

  return null;
}

function getValueForItem(def: ContentItem, payload: RenderPayload): unknown {
  const path = def.outputPath ?? def.targetPath ?? def.lookup;
  if (path) {
    return getByPath(payload, path);
  }
  return undefined;
}

/**
 * Renders a verbatim value with optional ref footnote
 *
 * @param value - String or {text, ref} object
 * @param collectedRefs - Set to collect refs
 * @returns Escaped HTML with optional footnote link
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
      // Get index for footnote (refs are collected in order)
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

/**
 * Analyse list definitions for missing item mappings relative to the resolved rows.
 */
function collectListDiagnostics(
  componentId: string | undefined,
  rowPath: string,
  itemsDef: ContentItem[],
  rowCount: number
): ComponentDiagnostic[] {
  const diagnostics: ComponentDiagnostic[] = [];

  if (rowPath && itemsDef.length === 0) {
    diagnostics.push({
      code: 'list.items.missing',
      message: `List component resolving "${rowPath}" has no item definitions.`,
      severity: 'warning',
    });
  }

  if (rowPath && rowCount === 0) {
    diagnostics.push({
      code: 'list.rows.empty',
      message: `List component resolving "${rowPath}" generated zero rows from the payload.`,
      severity: 'warning',
    });
  }

  if (componentId) {
    diagnostics.forEach((diag) => {
      diag.message = `[${componentId}] ${diag.message}`;
    });
  }

  return diagnostics;
}

/**
 * Log list diagnostics to aid template authors in debugging configuration gaps.
 */
function logListDiagnostics(diagnostics: ComponentDiagnostic[]): void {
  diagnostics.forEach((diagnostic) => {
    console.warn(`List renderer warning (${diagnostic.code}): ${diagnostic.message}`);
  });
}
