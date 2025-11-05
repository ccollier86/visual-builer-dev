/**
 * Context Slicer
 *
 * Slims NAS snapshot to only paths mentioned in field dependencies.
 * Reduces token usage by including only referenced data.
 */

import type { FieldGuideEntry } from '../types';

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
  nasSnapshot: any,
  fieldGuide: FieldGuideEntry[]
): any {
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
  const sliced: any = {};

  for (const path of paths) {
    const value = getValueAtPath(nasSnapshot, path);
    if (value !== undefined) {
      setValueAtPath(sliced, path, value);
    }
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
function getValueAtPath(obj: any, path: string): any {
  const segments = parsePath(path);
  let current = obj;

  for (const segment of segments) {
    if (current === undefined || current === null) {
      return undefined;
    }

    if (segment.isArray) {
      // For array paths, return the whole array
      const key = segment.name.replace('[]', '');
      current = current[key];
    } else {
      current = current[segment.name];
    }
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
function setValueAtPath(obj: any, path: string, value: any): void {
  const segments = parsePath(path);
  let current = obj;

  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i];
    const key = segment.isArray ? segment.name.replace('[]', '') : segment.name;

    if (!current[key]) {
      // Determine if next level should be array or object
      const nextSegment = segments[i + 1];
      current[key] = nextSegment.isArray ? [] : {};
    }

    current = current[key];
  }

  // Set final value
  const lastSegment = segments[segments.length - 1];
  const lastKey = lastSegment.isArray
    ? lastSegment.name.replace('[]', '')
    : lastSegment.name;

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

interface PathSegment {
  name: string;
  isArray: boolean;
}
