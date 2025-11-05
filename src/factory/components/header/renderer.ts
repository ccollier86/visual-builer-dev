import type { Component } from '../../../derivation/types';
import type { RenderPayload } from '../../../types/payloads';
import { escapeAttr, escapeHtml } from '../../utils/html-escape';
import {
  deriveFieldKey,
  deriveLabel,
  resolveItemText,
} from '../shared/content-utils';
import type { HeaderCardConfig } from './config';
import { getHeaderCardConfig } from './config';

/**
 * Render the top header section using template-defined patient/facility cards.
 */
export function renderHeaderSection(
  out: string[],
  comp: Component,
  payload: RenderPayload,
  idPrefix: string,
  collectedRefs: Set<string>
): void {
  const idAttr = comp.id ? ` id="${escapeAttr(idPrefix + comp.id)}"` : '';
  out.push(`<header class="note-header"${idAttr}>`);
  out.push('<div class="note-header-grid">');

  for (const child of comp.children ?? []) {
    renderHeaderCard(out, child, payload, idPrefix, collectedRefs);
  }

  out.push('</div>');
  out.push('</header>');
}

/**
 * Render an individual header card (patient/facility/encounter blocks).
 */
export function renderHeaderCard(
  out: string[],
  comp: Component,
  payload: RenderPayload,
  idPrefix: string,
  collectedRefs: Set<string>,
  wrapTag: 'section' | 'div' = 'section'
): void {
  if (!comp.content || comp.content.length === 0) {
    return;
  }

  const config: HeaderCardConfig = getHeaderCardConfig(comp.id);
  const classNames = ['note-header-card'];
  if (comp.id) {
    classNames.push(`note-header-card--${comp.id.replace(/[^a-z0-9-]/gi, '-').toLowerCase()}`);
  }

  const idAttr = comp.id ? ` id="${escapeAttr(idPrefix + comp.id)}"` : '';
  const cardChunks: string[] = [`<${wrapTag} class="${classNames.join(' ')}"${idAttr}>`];

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

    if (mode === 'text') {
      metaChunks.push(`<dd class="note-header-text">${value}</dd>`);
      continue;
    }

    const label = fieldConfig.label ?? deriveLabel(fieldKey);
    metaChunks.push(`<dt>${escapeHtml(label)}</dt><dd>${value}</dd>`);
  }

  if (metaChunks.length > 0) {
    cardChunks.push(`<dl class="note-header-meta">${metaChunks.join('')}</dl>`);
  }

  cardChunks.push(`</${wrapTag}>`);
  out.push(cardChunks.join(''));
}
