import type { ContentItem } from '../../../derivation/types';
import type { RenderPayload } from '../../../types/payloads';
import { getByPath } from '../../utils/path-resolver';
import { escapeHtml } from '../../utils/html-escape';
import type { VerbatimValue } from '../../types';

/**
 * Resolve text content for a component item by following its configured slot.
 */
export function resolveItemText(
  item: ContentItem,
  payload: RenderPayload,
  collectedRefs: Set<string>
): string | null {
  switch (item.slot) {
    case 'ai': {
      const path = item.outputPath;
      if (!path) return null;
      return extractString(getByPath(payload, path));
    }

    case 'lookup':
    case 'computed': {
      const path = item.targetPath;
      if (!path) return null;
      return extractString(getByPath(payload, path));
    }

    case 'static': {
      const path = item.targetPath;
      const resolved = path ? extractString(getByPath(payload, path)) : null;
      return resolved ?? item.text ?? null;
    }

    case 'verbatim': {
      const path = item.targetPath;
      if (!path) return item.text ?? null;
      const value = getByPath(payload, path);
      return renderVerbatimText(value, collectedRefs);
    }

    default:
      return null;
  }
}

/**
 * Convert verbatim values into escaped HTML with provenance references.
 */
export function renderVerbatimText(
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

/**
 * Derive a stable key for a content item using its target path or id.
 */
export function deriveFieldKey(item: ContentItem): string {
  if (item.targetPath) {
    const segments = item.targetPath.split('.');
    return segments[segments.length - 1];
  }
  return item.id;
}

/**
 * Convert a slot key into a human-readable label.
 */
export function deriveLabel(key: string): string {
  const normalized = key.replace(/([A-Z])/g, ' $1').replace(/[_.-]+/g, ' ').trim();
  const upper = normalized.toUpperCase();
  return upper.length > 0 ? upper : key.toUpperCase();
}

export function extractString(value: unknown): string | null {
  if (typeof value === 'string') {
    return value;
  }
  return null;
}

export function isVerbatimValue(value: unknown): value is VerbatimValue {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>).text === 'string'
  );
}
