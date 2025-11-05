// Path resolution utilities
// Resolves dot notation paths in payload objects with array support

/**
 * Gets value from object using dot notation path.
 * Supports array indexing: "path[0]" and array wildcards: "path[]".
 */
export function getByPath(obj: unknown, dotPath: string): unknown {
  if (!dotPath || obj == null) {
    return undefined;
  }

  const segments = dotPath.split('.');
  let current: unknown = obj;

  for (const segment of segments) {
    if (current == null) {
      return undefined;
    }

    const { key, index, isWildcard } = parseSegment(segment);
    current = getProperty(current, key);

    if (current === undefined) {
      return undefined;
    }

    if (isWildcard) {
      if (!Array.isArray(current)) {
        return undefined;
      }
      continue;
    }

    if (index !== undefined) {
      if (!Array.isArray(current) || current[index] === undefined) {
        return undefined;
      }
      current = current[index];
    }
  }

  return current;
}

/**
 * Infers array root path from field definitions
 * Extracts the array path portion (e.g., "plan.homework[]" from "plan.homework[].text")
 *
 * @param defs - Array of field definitions with outputPath or targetPath
 * @returns Array root path with [] marker, or empty string if none found
 */
export function inferArrayRoot(defs: Array<{ outputPath?: string; targetPath?: string }>): string {
  for (const def of defs) {
    const path = (def.outputPath || def.targetPath || "") as string;
    const arrayMarkerIndex = path.indexOf("[]");
    if (arrayMarkerIndex >= 0) {
      return path.slice(0, arrayMarkerIndex + 2);
    }
  }
  return "";
}

/**
 * Replaces array wildcard [] with specific index [n]
 * Used to resolve row-specific paths in lists and tables
 *
 * Example:
 * - normalizeRowPath("homework[].text", "homework[]", 0) → "homework[0].text"
 * - normalizeRowPath("diagnoses[].code", "diagnoses[]", 2) → "diagnoses[2].code"
 */
export function normalizeRowPath(
  path: string,
  arrayRoot: string,
  index: number
): string {
  if (!path) return "";
  const indexedRoot = arrayRoot.replace("[]", `[${index}]`);
  return path.replace(arrayRoot, indexedRoot);
}

function parseSegment(segment: string): { key: string; index?: number; isWildcard: boolean } {
  const arrayIndexMatch = segment.match(/^(.+)\[(\d+)\]$/);
  if (arrayIndexMatch) {
    return { key: arrayIndexMatch[1], index: Number(arrayIndexMatch[2]), isWildcard: false };
  }

  const isWildcard = segment.endsWith('[]');
  const key = isWildcard ? segment.slice(0, -2) : segment;
  return { key, isWildcard };
}

function getProperty(container: unknown, key: string): unknown {
  if (!isObjectLike(container)) {
    return undefined;
  }

  return (container as Record<string, unknown>)[key];
}

function isObjectLike(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
