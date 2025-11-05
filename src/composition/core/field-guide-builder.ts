/**
 * Field Guide Builder
 *
 * Extracts AI field metadata from template layout to guide LLM generation.
 * Walks template.layout and builds a guide entry for each slot:"ai" item.
 */

import type { FieldGuideEntry, FieldConstraints } from '../types';

/**
 * Build field guide from template layout
 *
 * Walks all components and contentItems to find AI fields.
 * For each AI field, extracts:
 * - path (from outputPath)
 * - description
 * - guidance[] (optional hints)
 * - dependencies (from aiDeps[] or auto-inferred from source[])
 * - constraints (from constraints object)
 * - style (from styleHints)
 *
 * @param layout - Template layout array
 * @returns Array of field guide entries in layout order
 */
export function buildFieldGuide(layout: any[]): FieldGuideEntry[] {
  const entries: FieldGuideEntry[] = [];

  function walkComponent(component: any): void {
    // Process content items
    if (component.content) {
      for (const item of component.content) {
        processContentItem(item);
      }
    }

    // Recurse into children
    if (component.children) {
      for (const child of component.children) {
        walkComponent(child);
      }
    }
  }

  function processContentItem(item: any): void {
    // Only process AI slots
    if (item.slot !== 'ai') {
      return;
    }

    // Build field guide entry
    const entry: FieldGuideEntry = {
      path: item.outputPath
    };

    // Add optional fields
    if (item.description) {
      entry.description = item.description;
    }

    if (item.guidance && item.guidance.length > 0) {
      entry.guidance = item.guidance;
    }

    // Dependencies: use aiDeps if provided, else fall back to source[]
    if (item.aiDeps && item.aiDeps.length > 0) {
      entry.dependencies = item.aiDeps;
    } else if (item.source && item.source.length > 0) {
      entry.dependencies = item.source;
    }

    // Map constraints to AIS-compatible format
    if (item.constraints) {
      entry.constraints = mapConstraints(item.constraints);
    }

    // Copy style hints
    if (item.styleHints) {
      entry.style = item.styleHints;
    }

    // Handle nested items (lists, tables)
    if (item.listItems) {
      for (const listItem of item.listItems) {
        processContentItem(listItem);
      }
    }

    if (item.tableMap) {
      for (const tableItem of item.tableMap) {
        processContentItem(tableItem);
      }
    }

    entries.push(entry);
  }

  // Walk all top-level components
  for (const component of layout) {
    walkComponent(component);
  }

  return entries;
}

/**
 * Map template constraints to field constraints
 *
 * Converts template constraint format to AIS schema format.
 * Adds 'x-' prefix to custom constraints.
 *
 * @param constraints - Template constraints object
 * @returns Field constraints object
 */
function mapConstraints(constraints: any): FieldConstraints {
  const mapped: FieldConstraints = {};

  if (constraints.enum) {
    mapped.enum = constraints.enum;
  }

  if (constraints.pattern) {
    mapped.pattern = constraints.pattern;
  }

  if (constraints.minWords !== undefined) {
    mapped['x-minWords'] = constraints.minWords;
  }

  if (constraints.maxWords !== undefined) {
    mapped['x-maxWords'] = constraints.maxWords;
  }

  if (constraints.minSentences !== undefined) {
    mapped['x-minSentences'] = constraints.minSentences;
  }

  if (constraints.maxSentences !== undefined) {
    mapped['x-maxSentences'] = constraints.maxSentences;
  }

  return mapped;
}
