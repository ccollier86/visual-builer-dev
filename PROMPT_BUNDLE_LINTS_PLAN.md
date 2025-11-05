# Prompt Bundle Custom Lints Implementation Plan

## Overview

**Problem**: Spec (Doc 3, lines 225-295) defines custom lints for prompt bundles, but they're not implemented anywhere.

**Solution**: Add a linting function to composition domain that validates prompt bundles beyond JSON Schema.

---

## Architecture Principles

- **SOR**: Prompt bundle is validated once at composition time
- **SOD**: One file = lint logic only, no composition or generation
- **DI**: Linter receives bundle + dependencies, no hard-coded logic

---

## Phase 1: Create Lint Types

**Domain:** Composition contracts
**Goal:** Define lint result types

### Files to Create
- `src/composition/core/prompt-linter.ts` (NEW)

### Changes

**Define lint result types:**

```typescript
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
```

### Completion Criteria
- [ ] Types defined
- [ ] Clean interfaces
- [ ] TypeScript compiles
- [ ] No implementation yet

---

## Phase 2: Implement Lint Checks

**Domain:** Composition validation
**Goal:** Implement the 5 custom lints from spec

### Files to Modify
- `src/composition/core/prompt-linter.ts` (CONTINUE)

### Changes

**Implement linting function:**

```typescript
import type { LintIssue, LintResult } from './prompt-linter';

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
        if (fgSet.size !== aisSet.size || ![...fgSet].every(v => aisSet.has(v))) {
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
```

### Completion Criteria
- [ ] All 5 lint checks implemented
- [ ] Helper functions work correctly
- [ ] Returns LintResult with errors and warnings
- [ ] TypeScript compiles
- [ ] No external dependencies
- [ ] Only prompt-linter.ts modified

---

## Phase 3: Integrate Linting into Composition

**Domain:** Prompt composition
**Goal:** Call linting after bundle creation

### Files to Modify
- `src/composition/core/prompt-composer.ts`

### Changes

**Add linting step after bundle creation:**

```typescript
import { lintPromptBundle } from './prompt-linter';

// In composePrompt function, after bundle is created:

// Lint the bundle
const lintResult = lintPromptBundle(bundle, aiSchema, template);

// Log warnings
if (lintResult.warnings.length > 0) {
  console.warn(`Prompt bundle has ${lintResult.warnings.length} warnings:`);
  lintResult.warnings.forEach(w => {
    console.warn(`  [${w.check}] ${w.message}`);
  });
}

// Throw on errors
if (!lintResult.ok) {
  const errorMessages = lintResult.errors.map(e => `[${e.check}] ${e.message}`).join('\n');
  throw new Error(`Prompt bundle validation failed:\n${errorMessages}`);
}

return bundle;
```

### Completion Criteria
- [ ] lintPromptBundle called after bundle creation
- [ ] Warnings logged to console
- [ ] Errors throw exception
- [ ] Bundle still returned if valid
- [ ] TypeScript compiles
- [ ] Only prompt-composer.ts modified

---

## Phase 4: Export Linting Function

**Domain:** Composition barrel export
**Goal:** Make linting available for testing

### Files to Modify
- `src/composition/index.ts`

### Changes

**Add to exports:**

```typescript
export { lintPromptBundle } from './core/prompt-linter';
export type { LintResult, LintIssue } from './core/prompt-linter';
```

### Completion Criteria
- [ ] lintPromptBundle exported
- [ ] Types exported
- [ ] TypeScript compiles
- [ ] Only index.ts modified

---

## Phase 5: Test Linting

**Domain:** Testing
**Goal:** Verify linting catches issues

### Files to Create
- `src/tests/test-prompt-linting.ts` (NEW)

### Changes

**Create simple test:**

```typescript
import { lintPromptBundle } from '../composition';

console.log('🧪 Testing Prompt Bundle Linting\n');

// Test 1: Valid bundle
const validBundle = {
  messages: [
    { role: 'system', content: 'Test' },
    { role: 'user', content: 'Test' }
  ],
  fieldGuide: [
    { path: 'subjective.summary' }
  ],
  jsonSchema: {
    properties: {
      subjective: {
        type: 'object',
        properties: {
          summary: { type: 'string' }
        }
      }
    }
  },
  context: {
    nasSlices: {}
  }
};

const validTemplate = {
  layout: [
    {
      id: 'test',
      type: 'section',
      content: [
        { slot: 'ai', id: 'test1', outputPath: 'subjective.summary' }
      ]
    }
  ]
};

const result1 = lintPromptBundle(validBundle, validBundle.jsonSchema, validTemplate);
console.log('Valid bundle:', result1.ok ? '✅ PASS' : '❌ FAIL');
console.log('  Errors:', result1.errors.length);
console.log('  Warnings:', result1.warnings.length);

// Test 2: Invalid bundle (missing AI item)
const invalidTemplate = {
  layout: [
    {
      id: 'test',
      type: 'section',
      content: [
        { slot: 'ai', id: 'test1', outputPath: 'subjective.summary' },
        { slot: 'ai', id: 'test2', outputPath: 'assessment.narrative' }
      ]
    }
  ]
};

const result2 = lintPromptBundle(validBundle, validBundle.jsonSchema, invalidTemplate);
console.log('\nInvalid bundle (coverage):', result2.ok ? '❌ FAIL' : '✅ PASS');
console.log('  Errors:', result2.errors.length);
if (result2.errors.length > 0) {
  console.log('  Error:', result2.errors[0].message);
}

console.log('\n✅ Linting tests complete!');
```

### Completion Criteria
- [ ] Test file created
- [ ] Tests valid bundle (passes)
- [ ] Tests invalid bundle (fails correctly)
- [ ] Can run: `bun run src/tests/test-prompt-linting.ts`
- [ ] All checks execute
- [ ] Only test file created

---

## Integration Phase

After all phases complete:

### Final Verification

**1. All Lint Checks Work**
- [ ] Coverage check catches mismatches
- [ ] Path validity catches missing paths
- [ ] Constraint harmony catches mismatches
- [ ] Dependencies check catches missing deps
- [ ] Message roles check catches wrong order

**2. Integration Works**
- [ ] Linting runs automatically in composition
- [ ] Warnings logged to console
- [ ] Errors throw exceptions
- [ ] Valid bundles pass through

**3. Architecture Compliance**
- [ ] SOR: Linting happens once at composition
- [ ] SOD: Linter has one job (validate bundle)
- [ ] DI: Linter receives bundle + dependencies

**4. No Regressions**
- [ ] Existing tests still pass
- [ ] Pipeline still works
- [ ] TypeScript compiles

---

## Success Criteria

**All phases complete when:**
- [ ] prompt-linter.ts implements all 5 checks
- [ ] prompt-composer.ts calls linting
- [ ] Warnings logged, errors throw
- [ ] Linting exported from composition
- [ ] Test demonstrates functionality
- [ ] TypeScript compiles
- [ ] All tests pass
- [ ] Follows SOR/SOD/DI

---

## Notes

**Why This Is Right:**
- Linting in composition (where bundle is created) not validation (which is generic)
- Catches template authoring errors early
- Helps developers write correct templates
- Matches spec requirements exactly

**Design Decisions:**
- Warnings for constraint mismatches (might be intentional)
- Errors for coverage/path/role issues (definitely wrong)
- Helper functions for schema traversal (reusable)
- Simple, clear error messages
