import type { Component } from '../../../derivation/types';
import type { RenderPayload } from '../../../types/payloads';
import { getByPath } from '../../utils/path-resolver';
import { escapeAttr, escapeHtml } from '../../utils/html-escape';
import {
  deriveFieldKey,
  deriveLabel,
  resolveItemText,
  isVerbatimValue,
} from '../shared/content-utils';
import { SIGNATURE_FIELD_CONFIG } from './config';

/**
 * Render the signature block using template-provided fields with fallbacks.
 */
export function renderSignatureSection(
  out: string[],
  comp: Component,
  payload: RenderPayload,
  idPrefix: string,
  collectedRefs: Set<string>
): void {
  const idAttr = comp.id ? ` id="${escapeAttr(idPrefix + comp.id)}"` : '';
  out.push(`<section class="note-signature"${idAttr}>`);

  if (comp.title) {
    out.push(`<h2 class="note-signature-heading">${escapeHtml(comp.title)}</h2>`);
  }

  const signatureData = getByPath(payload, 'signature');
  const sectionChunks: string[] = [];

  for (const item of comp.content ?? []) {
    const key = deriveFieldKey(item);
    const fieldConfig = SIGNATURE_FIELD_CONFIG[key] ?? {};
    const rawValue = resolveItemText(item, payload, collectedRefs);
    if (!rawValue) continue;

    const mode = fieldConfig.mode ?? 'labeled';
    if (mode === 'text') {
      const className = fieldConfig.emphasis === 'italic'
        ? 'note-signature-attestation'
        : 'note-signature-line';
      sectionChunks.push(`<p class="${className}">${rawValue}</p>`);
      continue;
    }

    const label = fieldConfig.label ?? deriveLabel(key);
    sectionChunks.push(`<p class="note-signature-line"><strong>${escapeHtml(label)}:</strong> ${rawValue}</p>`);
  }

  if (sectionChunks.length === 0 && isRecord(signatureData)) {
    appendFallbackSignature(sectionChunks, signatureData);
  }

  sectionChunks.forEach((chunk) => out.push(chunk));
  out.push('</section>');
}

function appendFallbackSignature(chunks: string[], signatureData: unknown): void {
  if (!isRecord(signatureData)) return;

  const renderedBy = extractSignatureValue(signatureData.renderedBy);
  const supervisedBy = extractSignatureValue(signatureData.supervisedBy);
  const attestation = extractSignatureValue(signatureData.attestation);
  const accuracy = extractSignatureValue(signatureData.accuracyStatement);

  if (renderedBy) {
    chunks.push(`<p class="note-signature-line"><strong>Rendering clinician:</strong> ${renderedBy}</p>`);
  }
  if (supervisedBy) {
    chunks.push(`<p class="note-signature-line"><strong>Supervising clinician:</strong> ${supervisedBy}</p>`);
  }
  if (attestation) {
    chunks.push(`<p class="note-signature-attestation">${attestation}</p>`);
  }
  if (accuracy) {
    chunks.push(`<p class="note-signature-attestation">${accuracy}</p>`);
  }
}

function extractSignatureValue(value: unknown): string | null {
  if (typeof value === 'string') {
    return escapeHtml(value);
  }

  if (isVerbatimValue(value)) {
    return escapeHtml(value.text);
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
