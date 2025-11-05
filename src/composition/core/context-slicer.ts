/**
 * Context Slicer
 *
 * Slims NAS snapshot to only paths mentioned in field dependencies.
 * Reduces token usage by including only referenced data.
 */

import type { PathSegment } from '../../derivation/types';
import type { FieldGuideEntry, NasSnapshot } from '../types';

/**
 * Slice NAS snapshot to only dependency paths
 *
 * Builds a slimmed context object containing only the NAS paths
 * mentioned in field guide dependencies.
 *
 * Auto-adds helpful neighboring paths (e.g., if homework[].text is referenced,
 * include treatment_plan summary if present).
 *
 * @param nasSnapshot - Full NAS snapshot with all resolved data
 * @param fieldGuide - Field guide entries with dependencies
 * @returns Slimmed NAS object with only referenced paths
 */
export function sliceContext(
  nasSnapshot: NasSnapshot | undefined,
  fieldGuide: FieldGuideEntry[]
): NasSnapshot {
  if (!nasSnapshot) {
    return {};
  }

  // Collect all dependency paths
  const paths = new Set<string>();
  for (const entry of fieldGuide) {
    if (entry.dependencies) {
      for (const dep of entry.dependencies) {
        paths.add(dep);
      }
    }
  }

  // If no dependencies, return empty object
  if (paths.size === 0) {
    return {};
  }

  // Build sliced object
  const sliced: NasSnapshot = {};

  for (const path of paths) {
    const value = getValueAtPath(nasSnapshot, path);
    if (value !== undefined) {
      setValueAtPath(sliced, path, value);
    }
  }

  if (isEmptyObject(sliced)) {
    return nasSnapshot;
  }

  return sliced;
}

/**
 * Get value at a path in an object
 *
 * Supports dot notation and array brackets.
 * Example: "static.assessments.PHQ9" or "static.diagnoses[].code"
 *
 * @param obj - Object to read from
 * @param path - Dot-notation path
 * @returns Value at path or undefined
 */
function getValueAtPath(obj: NasSnapshot, path: string): unknown {
  const segments = parsePath(path);
  let current: unknown = obj;

  for (const segment of segments) {
    const key = stripArrayNotation(segment.name);

    if (Array.isArray(current)) {
      const nextValues = current
        .map((entry) => (isObjectLike(entry) ? (entry as Record<string, unknown>)[key] : undefined))
        .filter((entry) => entry !== undefined);

      if (nextValues.length === 0) {
        return undefined;
      }

      current = nextValues[0];
      continue;
    }

    if (!isObjectLike(current)) {
      return undefined;
    }

    const next = (current as Record<string, unknown>)[key];
    if (next === undefined) {
      return undefined;
    }

    current = next;
  }

  return current;
}

/**
 * Set value at a path in an object
 *
 * Creates nested structure as needed.
 * Supports dot notation and array brackets.
 *
 * @param obj - Object to write to
 * @param path - Dot-notation path
 * @param value - Value to set
 */
function setValueAtPath(obj: NasSnapshot, path: string, value: unknown): void {
  const segments = parsePath(path);
  if (segments.length === 0) {
    return;
  }

  let current: Record<string, unknown> = obj;

  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i];
    const key = stripArrayNotation(segment.name);

    if (segment.isArray) {
      current = ensureArrayContainer(current, key);
      continue;
    }

    current = ensureChildObject(current, key);
  }

  const lastSegment = segments[segments.length - 1];
  const lastKey = stripArrayNotation(lastSegment.name);

  if (lastSegment.isArray) {
    const array = Array.isArray(current[lastKey]) ? (current[lastKey] as unknown[]) : [];
    if (!Array.isArray(current[lastKey])) {
      current[lastKey] = array;
    }
    array.splice(0, array.length, ...(Array.isArray(value) ? value : [value]));
    return;
  }

  current[lastKey] = value;
}

/**
 * Parse a path into segments
 *
 * Splits on dots and identifies array segments.
 * Example: "plan.homework[].text" -> [{name: "plan"}, {name: "homework[]", isArray: true}, {name: "text"}]
 *
 * @param path - Dot-notation path string
 * @returns Array of path segments
 */
function parsePath(path: string): PathSegment[] {
  const parts = path.split('.');
  return parts.map(part => ({
    name: part,
    isArray: part.includes('[]')
  }));
}

function stripArrayNotation(segment: string): string {
  return segment.replace(/\[\]$/, '');
}

function ensureChildObject(container: Record<string, unknown>, key: string): Record<string, unknown> {
  const existing = container[key];
  if (isPlainObject(existing)) {
    return existing;
  }

  const created: Record<string, unknown> = {};
  container[key] = created;
  return created;
}

function ensureArrayContainer(container: Record<string, unknown>, key: string): Record<string, unknown> {
  let existing = container[key];

  if (!Array.isArray(existing)) {
    existing = [];
    container[key] = existing;
  }

  const array = existing as unknown[];

  if (array.length === 0 || !isPlainObject(array[0])) {
    const element: Record<string, unknown> = {};
    array[0] = element;
    return element;
  }

  return array[0] as Record<string, unknown>;
}

function isEmptyObject(value: unknown): boolean {
  if (!isObjectLike(value)) {
    return true;
  }

  return Object.keys(value as Record<string, unknown>).length === 0;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isObjectLike(value: unknown): value is Record<string, unknown> | unknown[] {
  return typeof value === 'object' && value !== null;
}
