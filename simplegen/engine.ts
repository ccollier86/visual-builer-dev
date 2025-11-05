/**
 * SimplGen Engine - Core Functions
 *
 * Three main functions:
 * 1. prefillObject - Fill prop/computed fields from source data
 * 2. buildAiOnlySchema - Create subset schema for AI fields only
 * 3. deepMerge - Merge AI results into prefilled object
 */

import type { BiopsychNote, SourceMapEntry } from './template';

/**
 * Get value from nested object using dot notation path
 */
function getByPath(obj: any, path: string): any {
  const parts = path.split('.');
  let current = obj;

  for (const part of parts) {
    if (current === undefined || current === null) return undefined;
    current = current[part];
  }

  return current;
}

/**
 * Set value in nested object using dot notation path
 */
function setByPath(obj: any, path: string, value: any): void {
  const parts = path.split('.');
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]]) {
      current[parts[i]] = {};
    }
    current = current[parts[i]];
  }

  current[parts[parts.length - 1]] = value;
}

/**
 * Calculate age from date of birth
 */
function calculateAge(dob: string, asOf: Date = new Date()): number {
  const birth = new Date(dob);
  let age = asOf.getFullYear() - birth.getFullYear();
  const monthDiff = asOf.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && asOf.getDate() < birth.getDate())) {
    age--;
  }

  return age;
}

/**
 * Format address from facility object
 */
function formatAddress(facility: any): string {
  const parts = [
    facility.address?.street,
    facility.address?.city,
    facility.address?.state,
    facility.address?.zipCode
  ].filter(Boolean);

  return parts.join(', ');
}

/**
 * Format provider name with credentials
 */
function formatProviderName(provider: any): string {
  return `${provider.name}, ${provider.credentials}`;
}

/**
 * Prefill object with prop and computed fields
 * Leaves AI fields as undefined
 */
export function prefillObject(
  sourceMap: Record<string, SourceMapEntry>,
  data: any
): Partial<BiopsychNote> {
  const result: any = {};

  for (const [path, entry] of Object.entries(sourceMap)) {
    if (entry.source === "ai") {
      // Skip AI fields - they'll be filled by OpenAI
      continue;
    }

    if (entry.source === "prop") {
      // Direct lookup
      const value = getByPath(data, entry.dataPath!);
      if (value !== undefined) {
        setByPath(result, path, value);
      }
    } else if (entry.source === "computed") {
      // Computed values - handle special cases
      let value;

      if (entry.dataPath === "patient.age") {
        value = calculateAge(data.patient.dateOfBirth);
      } else if (entry.dataPath === "patient.pronouns.display") {
        const p = data.patient.pronouns;
        value = `${p.subject}/${p.object}`;
      } else if (entry.dataPath === "facility.address") {
        value = formatAddress(data.facility);
      } else if (entry.dataPath === "provider.name") {
        value = formatProviderName(data.provider);
      } else if (entry.dataPath === "supervisor.name") {
        value = formatProviderName(data.supervisor);
      } else if (entry.dataPath?.startsWith("plan.")) {
        // Plan items are computed in generator.ts - skip here
        continue;
      } else {
        // Generic lookup for other computed fields
        value = getByPath(data, entry.dataPath!);
      }

      if (value !== undefined) {
        setByPath(result, path, value);
      }
    }
  }

  return result;
}

/**
 * Build AI-only schema from source map
 * Returns subset schema containing only AI fields
 */
export function buildAiOnlySchema(
  sourceMap: Record<string, SourceMapEntry>
): any {
  const aiFields: string[] = [];

  // Find all AI fields
  for (const [path, entry] of Object.entries(sourceMap)) {
    if (entry.source === "ai") {
      aiFields.push(path);
    }
  }

  // Build nested schema structure
  const schema: any = {
    type: "object",
    properties: {},
    required: [],
    additionalProperties: false
  };

  for (const path of aiFields) {
    const parts = path.split('.');
    let currentSchema = schema;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;

      if (!currentSchema.properties[part]) {
        if (isLast) {
          // Leaf node - determine type from path
          if (path.includes('interventionsRecommended') ||
              path.includes('coordinationOfCare.items') ||
              path.includes('followUpPlan') ||
              path.includes('crisisSafetyPlan.items')) {
            currentSchema.properties[part] = {
              type: "array",
              items: { type: "string" },
              minItems: 1
            };
          } else if (path === 'assessment.diagnosticImpressions') {
            currentSchema.properties[part] = {
              type: "array",
              items: {
                type: "object",
                properties: {
                  icd10: { type: "string" },
                  dsm5: { type: "string" },
                  description: { type: "string" },
                  criteria: { type: "string" }
                },
                required: ["icd10", "dsm5", "description", "criteria"],
                additionalProperties: false
              },
              minItems: 1
            };
          } else {
            currentSchema.properties[part] = { type: "string" };
          }
        } else {
          // Intermediate node
          currentSchema.properties[part] = {
            type: "object",
            properties: {},
            required: [],
            additionalProperties: false
          };
        }

        if (!currentSchema.required.includes(part)) {
          currentSchema.required.push(part);
        }
      }

      if (!isLast) {
        currentSchema = currentSchema.properties[part];
      }
    }
  }

  return schema;
}

/**
 * Deep merge AI results into prefilled object
 */
export function deepMerge(base: any, overlay: any): any {
  if (!overlay) return base;
  if (!base) return overlay;

  // Handle arrays - overlay replaces base
  if (Array.isArray(overlay)) {
    return overlay;
  }

  // Handle objects - recursive merge
  if (typeof overlay === "object" && typeof base === "object") {
    const result = { ...base };

    for (const key in overlay) {
      if (overlay[key] === undefined) continue;

      if (key in result) {
        result[key] = deepMerge(result[key], overlay[key]);
      } else {
        result[key] = overlay[key];
      }
    }

    return result;
  }

  // Primitives - overlay wins
  return overlay !== undefined ? overlay : base;
}
