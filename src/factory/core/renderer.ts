// Main factory renderer
// Orchestrates HTML generation from template + validated RPS payload

import type { Component, ContentItem } from "../../derivation/types";
import type { DesignTokens } from "../../tokens/types";
import type { RenderPayload } from "../../types/payloads";
import { escapeHtml, escapeAttr } from "../utils/html-escape";
import { getByPath } from "../utils/path-resolver";
import { renderListComponent } from "../components/list-renderer";
import { renderTableComponent } from "../components/table-renderer";
import { getComponentClass, renderSectionHeading } from "../components/section-renderer";
import type { FactoryInputs, VerbatimValue } from "../types";

type HeaderDisplayMode = "label-value" | "text";

interface HeaderFieldConfig {
  label?: string;
  mode?: HeaderDisplayMode;
}

interface HeaderCardConfig {
  defaultMode: HeaderDisplayMode;
  fields?: Record<string, HeaderFieldConfig>;
}

const DEFAULT_HEADER_CARD_CONFIG: HeaderCardConfig = {
  defaultMode: "label-value",
};

const HEADER_CARD_CONFIG: Record<string, HeaderCardConfig> = {
  "patient-info": {
    defaultMode: "label-value",
    fields: {
      name: { label: "NAME" },
      dob: { label: "DOB" },
      age: { label: "AGE" },
      gender: { label: "SEX" },
      mrn: { label: "MRN" },
    },
  },
  "facility-info": {
    defaultMode: "text",
  },
  "encounter-info": {
    defaultMode: "text",
    fields: {
      provider: { label: "SEEN BY", mode: "label-value" },
      date: { label: "DATE", mode: "label-value" },
      type: { mode: "text" },
      signature: { mode: "text" },
    },
  },
};

type SignatureDisplayMode = "labeled" | "text";

interface SignatureFieldConfig {
  label?: string;
  mode?: SignatureDisplayMode;
  emphasis?: "italic";
}

const SIGNATURE_FIELD_CONFIG: Record<string, SignatureFieldConfig> = {
  renderedBy: { label: "Rendering clinician", mode: "labeled" },
  supervisedBy: { label: "Supervising clinician", mode: "labeled" },
  attestation: { mode: "text", emphasis: "italic" },
  accuracyStatement: { mode: "text" },
};

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
  if (comp.type === "header") {
    renderHeaderSection(out, comp, payload, idPrefix, collectedRefs);
    return;
  }

  if (comp.type === "signatureBlock") {
    renderSignatureSection(out, comp, payload, idPrefix, collectedRefs);
    return;
  }

  const cssClass = getComponentClass(comp, depth);
  const idAttr = comp.id ? ` id="${escapeAttr(idPrefix + comp.id)}"` : "";

  out.push(`<section class="${cssClass}"${idAttr}>`);

  const heading = renderSectionHeading(comp, depth, tokens);
  if (heading && comp.type !== "alertPanel") {
    out.push(heading);
  }

  switch (comp.type) {
    case "paragraph":
    case "section":
    case "footer":
      renderContentItems(out, comp, payload, collectedRefs);
      break;

    case "alertPanel":
      renderAlertPanel(out, comp, payload, collectedRefs, heading);
      break;

    case "list":
      out.push(renderListComponent(comp, payload, collectedRefs));
      break;

    case "table":
      out.push(renderTableComponent(comp, payload, collectedRefs));
      break;

    case "patientBlock":
      renderHeaderCard(out, comp, payload, idPrefix, collectedRefs, "div");
      break;
  }

  if (comp.children) {
    for (const child of comp.children) {
      renderComponent(out, child, payload, tokens, idPrefix, depth + 1, collectedRefs);
    }
  }

  out.push(`</section>`);
}

function renderHeaderSection(
  out: string[],
  comp: Component,
  payload: RenderPayload,
  idPrefix: string,
  collectedRefs: Set<string>
): void {
  const idAttr = comp.id ? ` id="${escapeAttr(idPrefix + comp.id)}"` : "";
  out.push(`<header class="note-header"${idAttr}>`);
  out.push(`<div class="note-header-grid">`);

  for (const child of comp.children ?? []) {
    renderHeaderCard(out, child, payload, idPrefix, collectedRefs);
  }

  out.push(`</div>`);
  out.push(`</header>`);
}

function renderHeaderCard(
  out: string[],
  comp: Component,
  payload: RenderPayload,
  idPrefix: string,
  collectedRefs: Set<string>,
  wrapTag: "section" | "div" = "section"
): void {
  if (!comp.content || comp.content.length === 0) {
    return;
  }

  const config = getHeaderCardConfig(comp.id);
  const classNames = ["note-header-card"];
  if (comp.id) {
    classNames.push(`note-header-card--${comp.id.replace(/[^a-z0-9-]/gi, "-").toLowerCase()}`);
  }
  const idAttr = comp.id ? ` id="${escapeAttr(idPrefix + comp.id)}"` : "";

  const cardChunks: string[] = [`<${wrapTag} class="${classNames.join(" ")}"${idAttr}>`];
  if (comp.title) {
    cardChunks.push(`<div class="note-header-title">${escapeHtml(comp.title)}</div>`);
  }

  const metaChunks: string[] = [];
  for (const item of comp.content) {
    const value = resolveItemText(item, payload, collectedRefs);
    if (!value) continue;

    const fieldKey = deriveFieldKey(item);
    const fieldConfig = config.fields?.[fieldKey] ?? {};
    const mode = fieldConfig.mode ?? config.defaultMode;

    if (mode === "text") {
      metaChunks.push(`<dd class="note-header-text">${value}</dd>`);
      continue;
    }

    const label = fieldConfig.label ?? deriveLabel(fieldKey);
    metaChunks.push(`<dt>${escapeHtml(label)}</dt><dd>${value}</dd>`);
  }

  if (metaChunks.length > 0) {
    cardChunks.push(`<dl class="note-header-meta">${metaChunks.join("")}</dl>`);
  }

  cardChunks.push(`</${wrapTag}>`);
  out.push(cardChunks.join(""));
}

function renderSignatureSection(
  out: string[],
  comp: Component,
  payload: RenderPayload,
  idPrefix: string,
  collectedRefs: Set<string>
): void {
  const idAttr = comp.id ? ` id="${escapeAttr(idPrefix + comp.id)}"` : "";
  out.push(`<section class="note-signature"${idAttr}>`);

  if (comp.title) {
    out.push(`<h2 class="note-signature-heading">${escapeHtml(comp.title)}</h2>`);
  }

  const signatureData = getByPath(payload, "signature");
  const sectionChunks: string[] = [];

  for (const item of comp.content ?? []) {
    const key = deriveFieldKey(item);
    const fieldConfig = SIGNATURE_FIELD_CONFIG[key] ?? {};
    const rawValue = resolveItemText(item, payload, collectedRefs);
    if (!rawValue) continue;

    const mode = fieldConfig.mode ?? "labeled";
    if (mode === "text") {
      const className = fieldConfig.emphasis === "italic" ? "note-signature-attestation" : "note-signature-line";
      sectionChunks.push(`<p class="${className}">${rawValue}</p>`);
      continue;
    }

    const label = fieldConfig.label ?? deriveLabel(key);
    sectionChunks.push(`<p class="note-signature-line"><strong>${escapeHtml(label)}:</strong> ${rawValue}</p>`);
  }

  // Fallback: if template lacks entries but payload has signature info
  if (sectionChunks.length === 0 && isRecord(signatureData)) {
    const renderedBy = typeof signatureData.renderedBy === "string" ? escapeHtml(signatureData.renderedBy) : "";
    const supervisedBy = typeof signatureData.supervisedBy === "string" ? escapeHtml(signatureData.supervisedBy) : "";
    const attestation = typeof signatureData.attestation === "string" ? escapeHtml(signatureData.attestation) : "";
    const accuracy = typeof signatureData.accuracyStatement === "string" ? escapeHtml(signatureData.accuracyStatement) : "";

    if (renderedBy) {
      sectionChunks.push(`<p class="note-signature-line"><strong>Rendering clinician:</strong> ${renderedBy}</p>`);
    }
    if (supervisedBy) {
      sectionChunks.push(`<p class="note-signature-line"><strong>Supervising clinician:</strong> ${supervisedBy}</p>`);
    }
    if (attestation) {
      sectionChunks.push(`<p class="note-signature-attestation">${attestation}</p>`);
    }
    if (accuracy) {
      sectionChunks.push(`<p class="note-signature-attestation">${accuracy}</p>`);
    }
  }

  sectionChunks.forEach(chunk => out.push(chunk));
  out.push(`</section>`);
}

function getHeaderCardConfig(componentId: string | undefined): HeaderCardConfig {
  if (!componentId) {
    return DEFAULT_HEADER_CARD_CONFIG;
  }
  const config = HEADER_CARD_CONFIG[componentId];
  if (!config) {
    return DEFAULT_HEADER_CARD_CONFIG;
  }
  return {
    defaultMode: config.defaultMode,
    fields: config.fields ? { ...config.fields } : undefined,
  };
}

function deriveFieldKey(item: ContentItem): string {
  if (item.targetPath) {
    const segments = item.targetPath.split('.');
    return segments[segments.length - 1];
  }
  return item.id;
}

function deriveLabel(key: string): string {
  const normalized = key.replace(/([A-Z])/g, ' $1').replace(/[_.-]+/g, ' ').trim();
  const upper = normalized.toUpperCase();
  return upper.length > 0 ? upper : key.toUpperCase();
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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
  collectedRefs: Set<string>,
  headingHtml?: string
): void {
  const rawVariant = (comp.props as Record<string, unknown> | undefined)?.variant;
  const variant = typeof rawVariant === "string" ? rawVariant : "default";
  const content = comp.content ?? [];

  const chunks: string[] = [`<div class="note-alert note-alert--${escapeAttr(variant)}">`];
  if (headingHtml) {
    chunks.push(headingHtml);
  }

  for (const item of content) {
    const text = resolveItemText(item, payload, collectedRefs);
    if (text == null || text === "") continue;
    chunks.push(`<p>${text}</p>`);
  }

  chunks.push(`</div>`);
  out.push(chunks.join(""));
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
