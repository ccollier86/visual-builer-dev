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

import type { AIPayload, NasSnapshot, RenderPayload } from '../../types/payloads';
import { PipelineWarningSeverity, type MergeConflictWarning } from '../types';

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
export function mergePayloads(aiOutput: AIPayload, nasData: NasSnapshot): RenderPayload {
  // Handle null/undefined cases
  if (!nasData) return aiOutput ?? {};
  if (!aiOutput) return nasData ?? {};

  // Deep merge objects
  if (isPlainObject(aiOutput) && isPlainObject(nasData)) {
    const result: RenderPayload = { ...nasData };

    for (const key in aiOutput) {
      if (Object.prototype.hasOwnProperty.call(aiOutput, key)) {
      if (key in result) {
        const existing = result[key];
        const incoming = aiOutput[key];

        if (isPlainObject(incoming) && isPlainObject(existing)) {
          result[key] = mergePayloads(incoming as AIPayload, existing as NasSnapshot);
          continue;
        }

        if (Array.isArray(incoming) && Array.isArray(existing)) {
          result[key] = mergeArrays(incoming as unknown[], existing as unknown[]) as unknown as RenderPayload;
          continue;
        }
      }

      // AI field not in NAS or overwrite with incoming value
      result[key] = aiOutput[key];
      }
    }

    return result;
  }

  // Handle arrays - AI output takes precedence
  if (Array.isArray(aiOutput) && Array.isArray(nasData)) {
    return mergeArrays(aiOutput as unknown[], nasData as unknown[]) as unknown as RenderPayload;
  }

  // For primitives or type conflicts, AI output wins
  return aiOutput;
}

/**
 * Check if value is a plain object (not array, not null, not class instance)
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
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
export function collectMergeConflicts(
	aiOutput: AIPayload,
	nasData: NasSnapshot,
	pathPrefix = ''
): MergeConflictWarning[] {
	const conflicts: MergeConflictWarning[] = [];

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
				conflicts.push({
					path: currentPath,
					expectedType: nasType,
					actualType: aiType,
					message: 'AI output type differs from NAS data.',
					severity: PipelineWarningSeverity.Error,
				});
			} else if (aiType === 'object' && nasType === 'object') {
				if (isPlainObject(aiValue) && isPlainObject(nasValue)) {
					conflicts.push(
						...collectMergeConflicts(
							aiValue as AIPayload,
							nasValue as NasSnapshot,
							currentPath
						)
					);
				}
			} else if (aiType === 'array' && nasType === 'array') {
				// arrays get overwritten; record informational entry
				conflicts.push({
					path: currentPath,
					message: 'AI array overwrote NAS array.',
					severity: PipelineWarningSeverity.Warning,
				});
			}
		}
	}

	return conflicts;
}

/**
 * Backwards compatible conflict detector returning string paths.
 * @deprecated Use collectMergeConflicts for structured diagnostics.
 */
export function findMergeConflicts(
	aiOutput: AIPayload,
	nasData: NasSnapshot,
	pathPrefix = ''
): string[] {
	return collectMergeConflicts(aiOutput, nasData, pathPrefix).map((conflict) =>
		conflict.actualType && conflict.expectedType
			? `${conflict.path} (AI: ${conflict.actualType}, NAS: ${conflict.expectedType})`
			: `${conflict.path}: ${conflict.message}`
	);
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

function mergeArrays(incoming: unknown[], existing: unknown[]): unknown[] {
  const incomingObjects = incoming.every(isPlainObject);
  const existingObjects = existing.every(isPlainObject);

  if (incomingObjects && existingObjects) {
    const maxLength = Math.max(existing.length, incoming.length);
    const merged: unknown[] = [];

    for (let i = 0; i < maxLength; i++) {
      const baseItem = existing[i];
      const incomingItem = incoming[i];

      if (isPlainObject(baseItem) && isPlainObject(incomingItem)) {
        merged[i] = mergePayloads(incomingItem as AIPayload, baseItem as NasSnapshot);
      } else if (incomingItem === undefined) {
        merged[i] = baseItem;
      } else if (baseItem === undefined) {
        merged[i] = incomingItem;
      } else {
        merged[i] = incomingItem;
      }
    }

    return merged;
  }

  // Default: use AI output array
  return incoming;
}
