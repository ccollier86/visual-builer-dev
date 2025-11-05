// Main factory renderer
// Orchestrates HTML generation from template + validated RPS payload

import type { Component, ContentItem } from "../../derivation/types";
import type { DesignTokens } from "../../tokens/types";
import type { RenderPayload } from "../../types/payloads";
import { escapeHtml, escapeAttr } from "../utils/html-escape";
import { getByPath } from "../utils/path-resolver";
import { renderListComponent } from "../components/list-renderer";
import { renderTableComponent } from "../components/table-renderer";
import {
  getComponentClass,
  renderSectionHeading,
  renderPatientBlock,
  renderSignatureBlock,
} from "../components/section-renderer";
import type { FactoryInputs, VerbatimValue } from "../types";

/**
 * Main entry point: Renders complete HTML from template and validated payload
 *
 * @param inputs - Factory inputs (template, payload, tokens, options)
 * @returns Complete HTML document as string
 */
export function renderNoteHTML(inputs: FactoryInputs): string {
  const { template, payload, tokens, options } = inputs;

  const lang = options?.lang || "en";
  const idPrefix = options?.idPrefix || "";
  const collectedRefs = new Set<string>();

  const chunks: string[] = [];
  chunks.push(`<!DOCTYPE html>`);
  chunks.push(`<html lang="${escapeHtml(lang)}">`);
  chunks.push(`<head>`);
  chunks.push(`<meta charset="utf-8">`);
  chunks.push(`<meta name="viewport" content="width=device-width, initial-scale=1.0">`);
  chunks.push(`<title>${escapeHtml(template.name)}</title>`);
  chunks.push(`</head>`);
  chunks.push(`<body class="note-body">`);
  chunks.push(`<div class="note-container">`);
  chunks.push(`<article class="note">`);

  const brandHeader =
    options?.brandOverrides?.headerHtml || tokens?.brand?.headerHtml || "";
  const brandLogo =
    options?.brandOverrides?.logoUrl || tokens?.brand?.logoUrl || "";

  if (brandHeader || brandLogo) {
    chunks.push(`<header class="note-brand-header">`);
    if (brandLogo) {
      chunks.push(
        `<img alt="Logo" class="note-brand-logo" src="${escapeAttr(brandLogo)}">`
      );
    }
    if (brandHeader) {
      chunks.push(brandHeader);
    }
    chunks.push(`</header>`);
  }

  for (const component of template.layout) {
    renderComponent(
      chunks,
      component,
      payload,
      tokens,
      idPrefix,
      0,
      collectedRefs
    );
  }

  const brandFooter =
    options?.brandOverrides?.footerHtml || tokens?.brand?.footerHtml || "";
  if (brandFooter) {
    chunks.push(`<footer class="note-brand-footer">${brandFooter}</footer>`);
  }

  if (options?.provenance && collectedRefs.size > 0) {
    chunks.push(renderProvenance(collectedRefs));
  }

  chunks.push(`</article>`);
  chunks.push(`</div>`);
  chunks.push(`</body>`);
  chunks.push(`</html>`);
  return chunks.join("");
}

/**
 * Recursively renders a component and its children
 */
function renderComponent(
  out: string[],
  comp: Component,
  payload: RenderPayload,
  tokens: DesignTokens,
  idPrefix: string,
  depth: number,
  collectedRefs: Set<string>
): void {
  const tag = "section"; // All components wrapped in section for consistent spacing
  const cssClass = getComponentClass(comp);
  const idAttr = comp.id ? ` id="${escapeAttr(idPrefix + comp.id)}"` : "";

  out.push(`<${tag} class="${cssClass}"${idAttr}>`);

  // Render title/heading
  const heading = renderSectionHeading(comp, depth, tokens);
  if (heading) out.push(heading);

  // Render component body by type
  switch (comp.type) {
    case "paragraph":
    case "section":
    case "header":
    case "footer":
      renderContentItems(out, comp, payload, collectedRefs);
      break;

    case "alertPanel":
      renderAlertPanel(out, comp, payload, collectedRefs);
      break;

    case "list":
      out.push(renderListComponent(comp, payload, collectedRefs));
      break;

    case "table":
      out.push(renderTableComponent(comp, payload, collectedRefs));
      break;

    case "patientBlock":
      out.push(renderPatientBlock(payload));
      break;

    case "signatureBlock":
      out.push(renderSignatureBlock());
      break;
  }

  // Render children (subsections)
  if (comp.children) {
    for (const child of comp.children) {
      renderComponent(out, child, payload, tokens, idPrefix, depth + 1, collectedRefs);
    }
  }

  out.push(`</${tag}>`);
}

/**
 * Renders content items as paragraphs
 */
function renderContentItems(
  out: string[],
  comp: Component,
  payload: RenderPayload,
  collectedRefs: Set<string>
): void {
  const content = comp.content ?? [];

  for (const item of content) {
    // Skip list/table items (handled by component-level renderers)
    if (item.tableMap || item.listItems) continue;

    const text = resolveItemText(item, payload, collectedRefs);
    if (text == null || text === "") continue;

    out.push(`<p>${text}</p>`);
  }
}

/**
 * Renders alert panel with variant styling
 */
function renderAlertPanel(
  out: string[],
  comp: Component,
  payload: RenderPayload,
  collectedRefs: Set<string>
): void {
  const rawVariant = (comp.props as Record<string, unknown> | undefined)?.variant;
  const variant = typeof rawVariant === 'string' ? rawVariant : 'default';
  const content = comp.content ?? [];

  for (const item of content) {
    const text = resolveItemText(item, payload, collectedRefs);
    if (text == null || text === "") continue;

    out.push(`<div class="alert ${escapeAttr(variant)}"><p>${text}</p></div>`);
  }
}

/**
 * Resolves text content from a content item
 */
function resolveItemText(
  item: ContentItem,
  payload: RenderPayload,
  collectedRefs: Set<string>
): string | null {
  switch (item.slot) {
    case "ai": {
      const path = item.outputPath;
      if (!path) {
        return null;
      }
      return extractString(getByPath(payload, path));
    }

    case "lookup":
    case "computed": {
      const path = item.targetPath;
      if (!path) {
        return null;
      }
      return extractString(getByPath(payload, path));
    }

    case "static": {
      const path = item.targetPath;
      const resolved = path ? extractString(getByPath(payload, path)) : null;
      return resolved ?? item.text ?? null;
    }

    case "verbatim": {
      const path = item.targetPath;
      if (!path) {
        return item.text ?? null;
      }
      const value = getByPath(payload, path);
      return renderVerbatimText(value, collectedRefs);
    }

    default:
      return null;
  }
}

/**
 * Renders verbatim value with optional ref footnote
 */
function renderVerbatimText(
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

function extractString(value: unknown): string | null {
  if (typeof value === 'string') {
    return value;
  }
  return null;
}

function isVerbatimValue(value: unknown): value is VerbatimValue {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>).text === 'string'
  );
}

/**
 * Renders provenance appendix with source references
 */
function renderProvenance(collectedRefs: Set<string>): string {
  const chunks: string[] = ['<aside class="note-provenance">', "<h3>Sources</h3>", "<ol>"];

  let index = 1;
  for (const ref of collectedRefs) {
    chunks.push(`<li id="src-${index}">${escapeHtml(ref)}</li>`);
    index++;
  }

  chunks.push("</ol>", "</aside>");
  return chunks.join("");
}
