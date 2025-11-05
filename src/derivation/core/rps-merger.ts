/**
 * RPS Merger
 *
 * Merges AIS (AI Structured Output) and NAS (Non-AI Structured Output) schemas
 * into the final RPS (Render Payload Schema).
 *
 * Deep merges schema trees, throwing errors on type conflicts.
 */

import type { DerivedSchema, SchemaNode } from '../types';
import { mergeNodes } from '../utils/schema-builder';

/**
 * Merge AIS and NAS schemas into RPS (Render Payload Schema)
 *
 * Algorithm:
 * 1. Start with empty root schema
 * 2. Deep merge AIS and NAS properties
 * 3. For shared object keys: merge properties recursively
 * 4. For arrays: merge items definitions
 * 5. For leaf nodes: keep stricter constraints
 * 6. Union required fields
 * 7. Throw on type conflicts
 *
 * @param ais - The AI Structured Output schema
 * @param nas - The Non-AI Structured Output schema
 * @param templateId - Template ID (for $id generation)
 * @param templateName - Template name (for title)
 * @param templateVersion - Template version
 * @returns The merged RPS schema
 * @throws Error if schemas have type conflicts
 */
export function mergeToRPS(
  ais: DerivedSchema,
  nas: DerivedSchema,
  templateId: string,
  templateName: string,
  templateVersion: string
): DerivedSchema {
  // Build merged properties
  const mergedProperties: Record<string, SchemaNode> = {};
  const mergedRequired: string[] = [];

  // Get all unique property keys from both schemas
  const allKeys = new Set([
    ...Object.keys(ais.properties || {}),
    ...Object.keys(nas.properties || {}),
  ]);

  // Merge each property
  for (const key of allKeys) {
    const aisProperty = ais.properties?.[key];
    const nasProperty = nas.properties?.[key];

    if (aisProperty && nasProperty) {
      // Both have this property - merge them
      mergedProperties[key] = mergeNodes(aisProperty, nasProperty, key);
    } else if (aisProperty) {
      // Only AIS has this property
      mergedProperties[key] = aisProperty;
    } else if (nasProperty) {
      // Only NAS has this property
      mergedProperties[key] = nasProperty;
    }
  }

  // Union required fields from both schemas
  const aisRequired = ais.required || [];
  const nasRequired = nas.required || [];

  for (const field of aisRequired) {
    if (!mergedRequired.includes(field)) {
      mergedRequired.push(field);
    }
  }

  for (const field of nasRequired) {
    if (!mergedRequired.includes(field)) {
      mergedRequired.push(field);
    }
  }

  // Build final RPS schema
  const rps: DerivedSchema = {
    $id: `https://catalyst/generated/render/${templateId}@${templateVersion}.json`,
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    title: `Render Payload — ${templateName} v${templateVersion}`,
    description: `Final payload schema (AIS ∪ NAS) for ${templateName}`,
    type: 'object',
    properties: mergedProperties,
    required: mergedRequired.length > 0 ? mergedRequired : undefined,
    additionalProperties: false,
  };

  return rps;
}

/**
 * Validate that two schemas can be merged (no type conflicts)
 *
 * This is a dry-run of the merge to catch errors early.
 *
 * @param ais - The AI Structured Output schema
 * @param nas - The Non-AI Structured Output schema
 * @returns true if mergeable
 * @throws Error if schemas have type conflicts
 */
export function validateMergeable(ais: DerivedSchema, nas: DerivedSchema): boolean {
  const allKeys = new Set([
    ...Object.keys(ais.properties || {}),
    ...Object.keys(nas.properties || {}),
  ]);

  for (const key of allKeys) {
    const aisProperty = ais.properties?.[key];
    const nasProperty = nas.properties?.[key];

    if (aisProperty && nasProperty) {
      // Try to merge - will throw if incompatible
      mergeNodes(aisProperty, nasProperty, key);
    }
  }

  return true;
}
