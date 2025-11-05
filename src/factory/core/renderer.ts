// Main factory renderer
// Orchestrates HTML generation from template + validated RPS payload

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
  chunks.push(`<article class="note" lang="${escapeHtml(lang)}">`);

  // Optional header
  const headerHtml =
    options?.brandOverrides?.headerHtml || tokens?.brand?.headerHtml || "";
  const logoUrl =
    options?.brandOverrides?.logoUrl || tokens?.brand?.logoUrl || "";

  if (headerHtml || logoUrl) {
    chunks.push(`<header class="note-header">`);
    if (logoUrl) {
      chunks.push(`<img alt="Logo" class="note-logo" src="${escapeAttr(logoUrl)}">`);
    }
    if (headerHtml) chunks.push(headerHtml);
    chunks.push(`</header>`);
  }

  // Render layout components
  const layout = template.layout || [];
  for (const component of layout) {
    renderComponent(chunks, component, payload, tokens, idPrefix, 0, collectedRefs);
  }

  // Optional footer
  const footerHtml =
    options?.brandOverrides?.footerHtml || tokens?.brand?.footerHtml || "";
  if (footerHtml) {
    chunks.push(`<footer class="note-footer">${footerHtml}</footer>`);
  }

  // Optional provenance appendix
  if (options?.provenance && collectedRefs.size > 0) {
    chunks.push(renderProvenance(collectedRefs));
  }

  chunks.push(`</article>`);
  return chunks.join("");
}

/**
 * Recursively renders a component and its children
 */
function renderComponent(
  out: string[],
  comp: any,
  payload: any,
  tokens: any,
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
  const children = comp.children || [];
  for (const child of children) {
    renderComponent(out, child, payload, tokens, idPrefix, depth + 1, collectedRefs);
  }

  out.push(`</${tag}>`);
}

/**
 * Renders content items as paragraphs
 */
function renderContentItems(
  out: string[],
  comp: any,
  payload: any,
  collectedRefs: Set<string>
): void {
  const content = comp.content || [];

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
  comp: any,
  payload: any,
  collectedRefs: Set<string>
): void {
  const variant = comp?.props?.variant || "default";
  const content = comp.content || [];

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
  item: any,
  payload: any,
  collectedRefs: Set<string>
): string | null {
  switch (item.slot) {
    case "ai":
      return getByPath(payload, item.outputPath) ?? null;

    case "lookup":
    case "computed":
      return getByPath(payload, item.targetPath) ?? null;

    case "static":
      return getByPath(payload, item.targetPath) ?? item.text ?? null;

    case "verbatim": {
      const value = getByPath(payload, item.targetPath);
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
  value: any,
  collectedRefs: Set<string>
): string | null {
  if (!value) return null;

  if (typeof value === "object" && "text" in value) {
    const verbatim = value as VerbatimValue;
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
