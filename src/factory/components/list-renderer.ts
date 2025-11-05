// List rendering component
// Handles ordered (ol) and unordered (ul) list generation

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
  comp: any,
  payload: any,
  collectedRefs: Set<string>
): string {
  const ordered = !!comp?.props?.ordered;
  const tag = ordered ? "ol" : "ul";

  const content = (comp.content || [])[0] || {};
  const itemsDef = content.listItems || [];

  // Determine array root from item paths (e.g., "plan.homework[]")
  const rowPath = inferArrayRoot(itemsDef);
  const rows = getByPath(payload, rowPath) || [];

  const chunks: string[] = [];
  chunks.push(`<${tag} class="list">`);

  for (let i = 0; i < rows.length; i++) {
    const itemContent = renderListItem(itemsDef, payload, rowPath, i, collectedRefs);
    if (itemContent) {
      chunks.push(`<li>${itemContent}</li>`);
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
  itemsDef: any[],
  payload: any,
  rowPath: string,
  rowIndex: number,
  collectedRefs: Set<string>
): string {
  const parts: string[] = [];

  for (const def of itemsDef) {
    const path = normalizeRowPath(
      def.outputPath || def.targetPath,
      rowPath,
      rowIndex
    );
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

/**
 * Renders a verbatim value with optional ref footnote
 *
 * @param value - String or {text, ref} object
 * @param collectedRefs - Set to collect refs
 * @returns Escaped HTML with optional footnote link
 */
function renderVerbatimValue(
  value: any,
  collectedRefs: Set<string>
): string | null {
  if (!value) return null;

  if (typeof value === "object" && "text" in value) {
    const verbatim = value as VerbatimValue;
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
