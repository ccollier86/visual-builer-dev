// Path resolution utilities
// Resolves dot notation paths in payload objects with array support

/**
 * Gets value from object using dot notation path
 * Supports array indexing: "path[0]" and array wildcards: "path[]"
 *
 * Examples:
 * - "user.name" → obj.user.name
 * - "diagnoses[0].code" → obj.diagnoses[0].code
 * - "homework[]" → obj.homework (array)
 */
export function getByPath(obj: any, dotPath: string): any {
  if (!dotPath) return undefined;
  if (obj == null) return undefined;

  const segments = dotPath.split(".");
  let current = obj;

  for (const segment of segments) {
    if (current == null) return undefined;

    // Check for array index: "key[0]"
    const arrayIndexMatch = segment.match(/^(.+)\[(\d+)\]$/);
    if (arrayIndexMatch) {
      const key = arrayIndexMatch[1];
      const index = Number(arrayIndexMatch[2]);
      current = current[key];
      if (!Array.isArray(current) || current[index] === undefined) {
        return undefined;
      }
      current = current[index];
      continue;
    }

    // Check for array wildcard: "key[]"
    const isArrayWildcard = segment.endsWith("[]");
    if (isArrayWildcard) {
      const key = segment.slice(0, -2);
      current = current[key];
      if (!Array.isArray(current)) return undefined;
      // Return the array itself (for iteration by caller)
      continue;
    }

    // Regular property access
    current = current[segment];
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
export function inferArrayRoot(defs: any[]): string {
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
