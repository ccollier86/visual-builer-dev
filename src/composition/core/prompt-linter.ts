/**
 * Result of a single lint check
 */
export interface LintIssue {
  severity: 'error' | 'warning';
  check: string;           // Which check failed
  message: string;         // Human-readable description
  path?: string;           // Specific path if applicable
}

/**
 * Complete lint result
 */
export interface LintResult {
  ok: boolean;             // True if no errors
  issues: LintIssue[];     // All issues found
  errors: LintIssue[];     // Just errors
  warnings: LintIssue[];   // Just warnings
}

/**
 * Lint a prompt bundle for issues beyond JSON Schema validation
 *
 * Responsibility: ONE - Validate bundle semantics per spec
 *
 * Implements checks from Doc 3, lines 225-295:
 * 1. Coverage: fieldGuide matches AI item count
 * 2. Path validity: paths exist in AIS
 * 3. Constraint harmony: constraints match AIS
 * 4. Dependencies resolvable: deps exist in context
 * 5. Message roles: system then user
 */
export function lintPromptBundle(
  bundle: any,
  aiSchema: any,
  template: any
): LintResult {
  const issues: LintIssue[] = [];

  // Check 1: Coverage - fieldGuide.length === AI items count
  const aiItemsCount = countAIItems(template);
  if (bundle.fieldGuide.length !== aiItemsCount) {
    issues.push({
      severity: 'error',
      check: 'coverage',
      message: `Field guide has ${bundle.fieldGuide.length} entries but template has ${aiItemsCount} AI items`
    });
  }

  // Check 2: Path validity - every fieldGuide.path exists in AIS
  for (const fg of bundle.fieldGuide) {
    if (!pathExistsInSchema(aiSchema, fg.path)) {
      issues.push({
        severity: 'error',
        check: 'path-validity',
        message: `Field guide path not in AIS: ${fg.path}`,
        path: fg.path
      });
    }
  }

  // Check 3: Constraint harmony - fieldGuide constraints match AIS
  for (const fg of bundle.fieldGuide) {
    const aisNode = getSchemaNode(aiSchema, fg.path);
    if (fg.constraints && aisNode) {
      // Check pattern
      if (fg.constraints.pattern && aisNode.pattern) {
        if (fg.constraints.pattern !== aisNode.pattern) {
          issues.push({
            severity: 'warning',
            check: 'constraint-harmony',
            message: `Pattern mismatch at ${fg.path}: field guide has "${fg.constraints.pattern}", AIS has "${aisNode.pattern}"`,
            path: fg.path
          });
        }
      }
      // Check enum
      if (fg.constraints.enum && aisNode.enum) {
        const fgSet = new Set(fg.constraints.enum);
        const aisSet = new Set(aisNode.enum);
        const fgArray = Array.from(fgSet);
        if (fgSet.size !== aisSet.size || !fgArray.every(v => aisSet.has(v))) {
          issues.push({
            severity: 'warning',
            check: 'constraint-harmony',
            message: `Enum mismatch at ${fg.path}`,
            path: fg.path
          });
        }
      }
    }
  }

  // Check 4: Dependencies resolvable - each dependency exists in context.nasSlices
  for (const fg of bundle.fieldGuide) {
    if (fg.dependencies) {
      for (const dep of fg.dependencies) {
        if (!pathResolvable(bundle.context?.nasSlices, dep)) {
          issues.push({
            severity: 'warning',
            check: 'dependencies',
            message: `Dependency not in context: ${dep} (required by ${fg.path})`,
            path: fg.path
          });
        }
      }
    }
  }

  // Check 5: Message roles - system then user
  if (bundle.messages.length < 2) {
    issues.push({
      severity: 'error',
      check: 'message-roles',
      message: 'Bundle must have at least 2 messages (system and user)'
    });
  } else {
    if (bundle.messages[0]?.role !== 'system') {
      issues.push({
        severity: 'error',
        check: 'message-roles',
        message: `First message must be system role, got: ${bundle.messages[0]?.role}`
      });
    }
    if (bundle.messages[1]?.role !== 'user') {
      issues.push({
        severity: 'error',
        check: 'message-roles',
        message: `Second message must be user role, got: ${bundle.messages[1]?.role}`
      });
    }
  }

  // Separate errors and warnings
  const errors = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');

  return {
    ok: errors.length === 0,
    issues,
    errors,
    warnings
  };
}

// Helper: Count AI items in template
function countAIItems(template: any): number {
  let count = 0;

  const walkLayout = (components: any[]) => {
    for (const comp of components) {
      if (comp.content) {
        for (const item of comp.content) {
          if (item.slot === 'ai') count++;

          // Check nested listItems
          if (item.listItems) {
            for (const listItem of item.listItems) {
              if (listItem.slot === 'ai') count++;
            }
          }

          // Check nested tableMap
          if (item.tableMap) {
            for (const colItem of item.tableMap) {
              if (colItem.slot === 'ai') count++;
            }
          }
        }
      }

      if (comp.children) {
        walkLayout(comp.children);
      }
    }
  };

  walkLayout(template.layout || []);
  return count;
}

// Helper: Check if path exists in schema
function pathExistsInSchema(schema: any, path: string): boolean {
  const segments = path.split('.');
  let current = schema.properties || {};

  for (const segment of segments) {
    // Handle array notation: "field[]" or "field[].subfield"
    const cleanSegment = segment.replace(/\[\]$/, '');

    if (!current[cleanSegment]) {
      return false;
    }

    current = current[cleanSegment];

    // If array, descend into items
    if (current.type === 'array' && current.items) {
      current = current.items.properties || {};
    } else {
      current = current.properties || {};
    }
  }

  return true;
}

// Helper: Get schema node at path
function getSchemaNode(schema: any, path: string): any {
  const segments = path.split('.');
  let current = schema.properties || {};

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const cleanSegment = segment.replace(/\[\]$/, '');

    if (!current[cleanSegment]) {
      return null;
    }

    current = current[cleanSegment];

    // Last segment - return the node
    if (i === segments.length - 1) {
      return current;
    }

    // Navigate deeper
    if (current.type === 'array' && current.items) {
      current = current.items.properties || {};
    } else {
      current = current.properties || {};
    }
  }

  return current;
}

// Helper: Check if path is resolvable in context
function pathResolvable(context: any, path: string): boolean {
  if (!context) return false;

  const segments = path.split('.');
  let current = context;

  for (const segment of segments) {
    const cleanSegment = segment.replace(/\[\]$/, '');

    if (current[cleanSegment] === undefined) {
      return false;
    }

    current = current[cleanSegment];
  }

  return true;
}
