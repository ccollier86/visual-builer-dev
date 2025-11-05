/**
 * Pipeline Core - Payload Merger
 *
 * Domain: pipeline/core
 * Responsibility: Merge AI output + NAS data into final RPS payload
 *
 * SOR: Pure function, no state
 * SOD: Only handles merging logic, no validation
 * DI: No dependencies, pure data transformation
 */

/**
 * Deep merge AI output and NAS data into final render payload
 *
 * Algorithm:
 * 1. Start with NAS data as base (non-AI fields)
 * 2. Deep merge AI output on top (AI fields)
 * 3. Handle nested objects and arrays
 * 4. AI values take precedence on conflicts (shouldn't happen with proper schemas)
 *
 * @param aiOutput - AI-generated structured output (matches AIS schema)
 * @param nasData - Non-AI snapshot data (matches NAS schema)
 * @returns Merged payload conforming to RPS schema
 */
export function mergePayloads(aiOutput: any, nasData: any): any {
  // Handle null/undefined cases
  if (!nasData) return aiOutput ?? {};
  if (!aiOutput) return nasData ?? {};

  // Deep merge objects
  if (isPlainObject(aiOutput) && isPlainObject(nasData)) {
    const result: any = { ...nasData };

    for (const key in aiOutput) {
      if (Object.prototype.hasOwnProperty.call(aiOutput, key)) {
        if (key in result) {
          // Recursively merge nested structures
          result[key] = mergePayloads(aiOutput[key], result[key]);
        } else {
          // AI field not in NAS, just add it
          result[key] = aiOutput[key];
        }
      }
    }

    return result;
  }

  // Handle arrays - AI output takes precedence
  if (Array.isArray(aiOutput) && Array.isArray(nasData)) {
    // For arrays, we can't intelligently merge - use AI output
    // (Template should not create conflicts here)
    return aiOutput;
  }

  // For primitives or type conflicts, AI output wins
  return aiOutput;
}

/**
 * Check if value is a plain object (not array, not null, not class instance)
 */
function isPlainObject(value: unknown): value is Record<string, any> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  // Reject arrays
  if (Array.isArray(value)) {
    return false;
  }

  // Accept plain objects and Object.create(null)
  const proto = Object.getPrototypeOf(value);
  return proto === null || proto === Object.prototype;
}

/**
 * Validate that two payloads are mergeable without conflicts
 *
 * A conflict occurs when the same path exists in both payloads
 * with different value types (e.g., string in AI, object in NAS).
 * This should never happen with properly derived AIS/NAS schemas.
 *
 * @param aiOutput - AI output to check
 * @param nasData - NAS data to check
 * @returns Array of conflict paths (empty if no conflicts)
 */
export function findMergeConflicts(
  aiOutput: any,
  nasData: any,
  pathPrefix = ''
): string[] {
  const conflicts: string[] = [];

  if (!isPlainObject(aiOutput) || !isPlainObject(nasData)) {
    return conflicts;
  }

  for (const key in aiOutput) {
    if (!Object.prototype.hasOwnProperty.call(aiOutput, key)) continue;

    const currentPath = pathPrefix ? `${pathPrefix}.${key}` : key;

    if (key in nasData) {
      const aiValue = aiOutput[key];
      const nasValue = nasData[key];

      const aiType = getValueType(aiValue);
      const nasType = getValueType(nasValue);

      if (aiType !== nasType) {
        // Type conflict detected
        conflicts.push(
          `${currentPath} (AI: ${aiType}, NAS: ${nasType})`
        );
      } else if (aiType === 'object' && nasType === 'object') {
        // Recurse into nested objects
        conflicts.push(
          ...findMergeConflicts(aiValue, nasValue, currentPath)
        );
      }
    }
  }

  return conflicts;
}

/**
 * Get semantic type of a value for conflict detection
 */
function getValueType(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'object') return 'object';
  return typeof value;
}
