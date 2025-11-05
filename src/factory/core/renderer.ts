// Main factory renderer
// Orchestrates HTML generation from template + validated RPS payload

import type { Component } from "../../derivation/types";
import type { DesignTokens } from "../../tokens/types";
import type { RenderPayload } from "../../types/payloads";
import { escapeHtml, escapeAttr } from "../utils/html-escape";
import type { FactoryInputs } from "../types";
import {
  renderComponent,
  renderProvenance,
} from "../components/sections/content-sections";

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
