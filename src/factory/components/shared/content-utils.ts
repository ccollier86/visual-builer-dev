/**
 * Content Rendering Utilities
 *
 * Domain: factory/components/shared
 * Responsibility: Reusable helpers for resolving template content into HTML-safe strings.
 */
import type { ContentItem } from '../../../derivation/types';
import type { RenderPayload } from '../../../types/payloads';
import { getByPath } from '../../utils/path-resolver';
import { escapeHtml } from '../../utils/html-escape';
import type { VerbatimValue } from '../../types';

/**
 * Resolve text for a template content item using its configured slot strategy.
 *
 * @param item - Template content item definition.
 * @param payload - Fully-resolved render payload.
 * @param collectedRefs - Accumulator for provenance references.
 * @returns Escaped HTML string or null when no value is available.
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
 * Convert verbatim values into escaped HTML with provenance footnotes.
 *
 * @param value - Verbatim value or primitive.
 * @param collectedRefs - Accumulator for provenance references.
 * @returns Escaped HTML string or null when value is empty.
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
 *
 * @param item - Template content item definition.
 * @returns Normalized key suitable for config lookups.
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
 *
 * @param key - Raw field key (camelCase, snake_case, etc.).
 * @returns Uppercase label appropriate for display.
 */
export function deriveLabel(key: string): string {
  const normalized = key.replace(/([A-Z])/g, ' $1').replace(/[_.-]+/g, ' ').trim();
  const upper = normalized.toUpperCase();
  return upper.length > 0 ? upper : key.toUpperCase();
}

/**
 * Safely coerce a value to string when it is already a string.
 *
 * @param value - Unknown value retrieved from payload.
 * @returns String value or null when not a string.
 */
export function extractString(value: unknown): string | null {
  if (typeof value === 'string') {
    return value;
  }
  return null;
}

/**
 * Type guard that verifies whether a value is a VerbatimValue object.
 *
 * @param value - Unknown value retrieved from payload.
 * @returns True when the object matches the VerbatimValue contract.
 */
export function isVerbatimValue(value: unknown): value is VerbatimValue {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>).text === 'string'
  );
}
