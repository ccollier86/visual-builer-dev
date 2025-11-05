/**
 * Section Rendering Helpers
 *
 * Domain: factory/components/sections
 * Responsibility: Render top-level sections, alerts, and provenance blocks within the note.
 */
import type { Component } from '../../../derivation/types';
import type { DesignTokens } from '../../../tokens/types';
import type { RenderPayload } from '../../../types/payloads';
import { escapeAttr, escapeHtml } from '../../utils/html-escape';
import { getComponentClass, renderSectionHeading } from '../section-renderer';
import { renderListComponent } from '../list-renderer';
import { renderTableComponent } from '../table-renderer';
import { resolveItemText } from '../shared/content-utils';
import { renderHeaderCard } from '../header/renderer';
import { renderSignatureSection } from '../signature/renderer';
import { renderHeaderSection } from '../header/renderer';

/**
 * Render a template component and recursively process its children.
 *
 * @param out - Mutable HTML chunk accumulator.
 * @param comp - Template component definition.
 * @param payload - Fully-resolved render payload.
 * @param tokens - Active design tokens for styling decisions.
 * @param idPrefix - Optional prefix applied to DOM ids for uniqueness.
 * @param depth - Current section depth used for heading semantics.
 * @param collectedRefs - Accumulator for provenance references.
 */
export function renderComponent(
  out: string[],
  comp: Component,
  payload: RenderPayload,
  tokens: DesignTokens,
  idPrefix: string,
  depth: number,
  collectedRefs: Set<string>
): void {
  if (comp.type === 'header') {
    renderHeaderSection(out, comp, payload, idPrefix, collectedRefs);
    return;
  }

  if (comp.type === 'signatureBlock') {
    renderSignatureSection(out, comp, payload, idPrefix, collectedRefs);
    return;
  }

  const cssClass = getComponentClass(comp, depth);
  const idAttr = comp.id ? ` id="${escapeAttr(idPrefix + comp.id)}"` : '';

  out.push(`<section class="${cssClass}"${idAttr}>`);

  const heading = renderSectionHeading(comp, depth, tokens);
  if (heading && comp.type !== 'alertPanel') {
    out.push(heading);
  }

  switch (comp.type) {
    case 'paragraph':
    case 'section':
    case 'footer':
      renderContentItems(out, comp, payload, collectedRefs);
      break;

    case 'alertPanel':
      renderAlertPanel(out, comp, payload, collectedRefs, heading);
      break;

    case 'list':
      out.push(renderListComponent(comp, payload, collectedRefs));
      break;

    case 'table':
      out.push(renderTableComponent(comp, payload, collectedRefs));
      break;

    case 'patientBlock':
      renderHeaderCard(out, comp, payload, idPrefix, collectedRefs, 'div');
      break;
  }

  if (comp.children) {
    for (const child of comp.children) {
      renderComponent(out, child, payload, tokens, idPrefix, depth + 1, collectedRefs);
    }
  }

  out.push('</section>');
}

/**
 * Render paragraph content items within a component.
 *
 * @param out - Mutable HTML chunk accumulator.
 * @param comp - Template component containing content items.
 * @param payload - Fully-resolved render payload.
 * @param collectedRefs - Accumulator for provenance references.
 */
export function renderContentItems(
  out: string[],
  comp: Component,
  payload: RenderPayload,
  collectedRefs: Set<string>
): void {
  const content = comp.content ?? [];

  for (const item of content) {
    if (item.tableMap || item.listItems) continue;

    const text = resolveItemText(item, payload, collectedRefs);
    if (!text) continue;

    out.push(`<p>${text}</p>`);
  }
}

/**
 * Render an alert panel with optional heading and variant styling.
 *
 * @param out - Mutable HTML chunk accumulator.
 * @param comp - Alert panel component definition.
 * @param payload - Fully-resolved render payload.
 * @param collectedRefs - Accumulator for provenance references.
 * @param headingHtml - Optional heading HTML previously generated for the section.
 */
export function renderAlertPanel(
  out: string[],
  comp: Component,
  payload: RenderPayload,
  collectedRefs: Set<string>,
  headingHtml?: string
): void {
  const rawVariant = (comp.props as Record<string, unknown> | undefined)?.variant;
  const variant = typeof rawVariant === 'string' ? rawVariant : 'default';
  const content = comp.content ?? [];

  const chunks: string[] = [`<div class="note-alert note-alert--${variant}">`];
  if (headingHtml) {
    chunks.push(headingHtml);
  }

  for (const item of content) {
    const text = resolveItemText(item, payload, collectedRefs);
    if (!text) continue;
    chunks.push(`<p>${text}</p>`);
  }

  chunks.push('</div>');
  out.push(chunks.join(''));
}

/**
 * Render provenance appendix listing verbatim references.
 *
 * @param collectedRefs - Ordered set of provenance references.
 * @returns HTML string containing the provenance list.
 */
export function renderProvenance(collectedRefs: Set<string>): string {
  const chunks: string[] = ['<aside class="note-provenance">', '<h3>Sources</h3>', '<ol>'];

  let index = 1;
  for (const ref of collectedRefs) {
    chunks.push(`<li id="src-${index}">${escapeHtml(ref)}</li>`);
    index++;
  }

  chunks.push('</ol>', '</aside>');
  return chunks.join('');
}
