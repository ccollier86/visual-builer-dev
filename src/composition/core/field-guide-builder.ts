/**
 * Field Guide Builder
 *
 * Extracts AI field metadata from template layout to guide LLM generation.
 * Walks template.layout and builds a guide entry for each slot:"ai" item.
 */

import type {
  Component,
  ContentConstraints,
  ContentItem,
  StyleHints,
} from '../../derivation/types';
import type {
  FieldDependency,
  FieldDependencyScope,
  FieldGuideBuildResult,
  FieldGuideEntry,
  FieldConstraints,
  LintIssue,
} from '../types';
import { STYLE_HINT_KEYS, TABLE_CELL_STYLE_KEYS } from './internal/constants';

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
export function buildFieldGuide(layout: Component[]): FieldGuideBuildResult {
  const entries: FieldGuideEntry[] = [];
  const issues: LintIssue[] = [];

  function walkComponent(component: Component): void {
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

  function processContentItem(item: ContentItem): void {
    // Only process AI slots
    if (item.slot !== 'ai') {
      return;
    }

    if (!item.outputPath) {
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
    const dependencyResult = collectDependencies(item);
    if (dependencyResult.dependencies.length > 0) {
      entry.dependencies = dependencyResult.dependencies;
    } else {
      issues.push(createIssue('error', 'field-guide.dependencies', `AI field ${item.id} is missing dependency metadata (aiDeps or source)`, item.outputPath));
    }
    issues.push(...dependencyResult.issues);

    // Map constraints to AIS-compatible format
    if (item.constraints) {
      entry.constraints = mapConstraints(item.constraints);
    }

    // Copy style hints
    if (item.styleHints) {
      const styleResult = sanitizeStyleHints(item.styleHints, item.outputPath);
      if (styleResult.style) {
        entry.style = styleResult.style;
      }
      issues.push(...styleResult.issues);
    }

    // Handle nested items (lists, tables)
    if (item.listItems) {
      for (const listItem of item.listItems) {
        processContentItem(listItem);
      }
    }

    if (item.tableMap) {
      const tableItems = Array.isArray(item.tableMap)
        ? item.tableMap
        : Object.values(item.tableMap);

      for (const tableItem of tableItems) {
        processContentItem(tableItem);
      }
    }

    entries.push(entry);
  }

  // Walk all top-level components
  for (const component of layout) {
    walkComponent(component);
  }

  return { entries, issues };
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
function mapConstraints(constraints: ContentConstraints): FieldConstraints {
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

function collectDependencies(item: ContentItem): {
  dependencies: FieldDependency[];
  issues: LintIssue[];
} {
  const dependencies: FieldDependency[] = [];
  const issues: LintIssue[] = [];
  const seen = new Set<string>();

  const register = (path: string | undefined, scope: FieldDependencyScope): void => {
    const trimmed = (path ?? '').trim();
    if (trimmed.length === 0) {
      return;
    }
    const key = `${scope}:${trimmed}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    dependencies.push({ path: trimmed, scope });
  };

  if (item.aiDeps && item.aiDeps.length > 0) {
    for (const dep of item.aiDeps) {
      register(dep, resolveScope(dep));
    }
  }

  if (item.source && item.source.length > 0) {
    for (const dep of item.source) {
      register(dep, 'source');
    }
  }

  return { dependencies, issues };
}

function resolveScope(path: string | undefined): FieldDependencyScope {
  if (!path) {
    return 'nas';
  }

  const normalized = path.trim().toLowerCase();
  if (normalized.startsWith('source')) {
    return 'source';
  }

  return 'nas';
}

function sanitizeStyleHints(styleHints: StyleHints, outputPath: string): {
  style?: StyleHints;
  issues: LintIssue[];
} {
  const result: StyleHints = {};
  const issues: LintIssue[] = [];

  for (const [key, value] of Object.entries(styleHints)) {
    if (!STYLE_HINT_KEYS.includes(key as (typeof STYLE_HINT_KEYS)[number])) {
      issues.push(createIssue('warning', 'field-guide.style', `Unknown style hint '${key}' ignored for ${outputPath}`, outputPath));
      continue;
    }

    if (key === 'tone') {
      if (typeof value === 'string' && value.trim().length > 0) {
        result.tone = value.trim();
      } else {
        issues.push(createIssue('warning', 'field-guide.style', `tone style hint must be a non-empty string for ${outputPath}`, outputPath));
      }
      continue;
    }

    if (key === 'tableCell') {
      if (value && typeof value === 'object') {
        const cellValue: Record<string, unknown> = {};
        for (const [cellKey, cellVal] of Object.entries(value as Record<string, unknown>)) {
          if (!TABLE_CELL_STYLE_KEYS.includes(cellKey as (typeof TABLE_CELL_STYLE_KEYS)[number])) {
            issues.push(createIssue('warning', 'field-guide.style', `Unknown tableCell style hint '${cellKey}' ignored for ${outputPath}`, outputPath));
            continue;
          }

          if (cellKey === 'columnIndex') {
            if (typeof cellVal === 'number' && Number.isInteger(cellVal)) {
              cellValue.columnIndex = cellVal;
            } else {
              issues.push(createIssue('warning', 'field-guide.style', `tableCell.columnIndex must be an integer for ${outputPath}`, outputPath));
            }
            continue;
          }

          cellValue[cellKey] = cellVal;
        }

        if (Object.keys(cellValue).length > 0) {
          result.tableCell = cellValue;
        }
      } else {
        issues.push(createIssue('warning', 'field-guide.style', `tableCell style hint must be an object for ${outputPath}`, outputPath));
      }
    }
  }

  return {
    style: Object.keys(result).length > 0 ? result : undefined,
    issues,
  };
}

function createIssue(
  severity: LintIssue['severity'],
  check: string,
  message: string,
  path?: string
): LintIssue {
  return {
    severity,
    check,
    message,
    path,
  };
}
