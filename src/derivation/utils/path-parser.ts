/**
 * Path Parser Utility
 *
 * Parses outputPath and targetPath strings into structured segments.
 * Handles dot notation and array markers (e.g., "plan.homework[].text")
 */

import type { PathSegment } from '../types';

/**
 * Parse a path string into segments
 *
 * Rules:
 * - Dot segments form nested objects: "plan.nextSteps" -> ["plan", "nextSteps"]
 * - Segment ending with "[]" creates array: "plan.homework[]" -> ["plan", "homework[]"]
 * - After array segment, next segment is in items.properties
 *
 * @param path - The path string (e.g., "plan.homework[].text")
 * @returns Array of path segments with array markers
 * @throws Error if path is invalid
 *
 * @example
 * parsePath("assessment.narrative") -> [
 *   { name: "assessment", isArray: false },
 *   { name: "narrative", isArray: false }
 * ]
 *
 * @example
 * parsePath("plan.homework[].text") -> [
 *   { name: "plan", isArray: false },
 *   { name: "homework", isArray: true },
 *   { name: "text", isArray: false }
 * ]
 */
export function parsePath(path: string): PathSegment[] {
  if (!path || typeof path !== 'string') {
    throw new Error('Path must be a non-empty string');
  }

  // Split on dots
  const segments = path.split('.');

  if (segments.length === 0) {
    throw new Error('Path must contain at least one segment');
  }

  return segments.map((segment) => {
    if (!segment) {
      throw new Error(`Invalid path: empty segment in "${path}"`);
    }

    // Check for indexed array: "key[0]", "key[1]", etc.
    const indexedArrayMatch = segment.match(/^([a-zA-Z_][a-zA-Z0-9_-]*)\[(\d+)\]$/);
    if (indexedArrayMatch) {
      return {
        name: indexedArrayMatch[1],
        isArray: true,
        index: Number(indexedArrayMatch[2])
      };
    }

    // Check if this segment represents a wildcard array: "key[]"
    const isArray = segment.endsWith('[]');
    const name = isArray ? segment.slice(0, -2) : segment;

    if (!name) {
      throw new Error(`Invalid path: array marker without name in "${path}"`);
    }

    // Validate segment name (alphanumeric, underscores, hyphens)
    if (!/^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(name)) {
      throw new Error(
        `Invalid path segment "${segment}" in "${path}". ` +
        'Segments must start with a letter or underscore, ' +
        'followed by letters, numbers, underscores, or hyphens.'
      );
    }

    return { name, isArray };
  });
}

/**
 * Validate that a path is well-formed
 *
 * @param path - The path string to validate
 * @returns true if valid
 * @throws Error with descriptive message if invalid
 */
export function validatePath(path: string): boolean {
  parsePath(path); // Will throw if invalid
  return true;
}

/**
 * Check if a path contains any array segments
 *
 * @param path - The path string to check
 * @returns true if path contains at least one array segment
 */
export function hasArraySegments(path: string): boolean {
  const segments = parsePath(path);
  return segments.some((seg) => seg.isArray);
}

/**
 * Get the leaf segment name from a path
 *
 * @param path - The path string
 * @returns The name of the final segment
 *
 * @example
 * getLeafSegment("plan.homework[].text") -> "text"
 */
export function getLeafSegment(path: string): string {
  const segments = parsePath(path);
  return segments[segments.length - 1].name;
}

/**
 * Get the parent path (all segments except the last)
 *
 * @param path - The path string
 * @returns The parent path, or null if path has only one segment
 *
 * @example
 * getParentPath("plan.homework[].text") -> "plan.homework[]"
 * getParentPath("assessment") -> null
 */
export function getParentPath(path: string): string | null {
  const segments = parsePath(path);

  if (segments.length === 1) {
    return null;
  }

  return segments
    .slice(0, -1)
    .map((seg) => seg.name + (seg.isArray ? '[]' : ''))
    .join('.');
}
