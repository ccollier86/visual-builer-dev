# Path Indexed Arrays Support - Fix Plan

## Overview

**Problem:** Template uses indexed array paths like `plan.interventionsRecommended[0]` in listItems, but path-parser.ts only accepts empty brackets `[]`. This causes NAS derivation to fail.

**Root Cause:** Architectural inconsistency between layers:
- ✅ Factory layer (path-resolver.ts) ALREADY supports `[0]`, `[1]` syntax
- ❌ Derivation layer (path-parser.ts) REJECTS indexed paths
- ✅ Schema validation ALLOWS the pattern

**Solution:** Update derivation layer to match factory layer's behavior and align all layers around consistent path notation.

## Architecture Principles Applied

- **SOD (Separation of Duties)**: Each phase touches ONE domain only
- **DI (Dependency Injection)**: No changes to external dependencies, only internal logic
- **Phased Execution**: One domain per phase, review between phases

---

## Phase 1: Contracts Domain

**Domain:** Type definitions and interfaces
**Goal:** Update PathSegment type to support optional index property

### Files to Modify
- `src/derivation/utils/path-parser.ts` (lines 7-10 - PathSegment interface only)

### Changes
1. Add optional `index?: number` property to PathSegment interface
2. Update JSDoc comment to document the new property

### Code Change
```typescript
/**
 * Represents a single segment in a parsed path.
 * - name: The property name (e.g., "homework" from "homework[]" or "homework[0]")
 * - isArray: True if segment represents an array ([] or [n])
 * - index: Optional specific array index (e.g., 0 from "homework[0]")
 */
export interface PathSegment {
  name: string;
  isArray: boolean;
  index?: number;  // NEW: For explicit array indices like [0], [1]
}
```

### Completion Criteria
- [ ] PathSegment interface updated with `index?: number`
- [ ] JSDoc comment documents the new property
- [ ] Code compiles (TypeScript types are valid)
- [ ] No other files modified
- [ ] No implementation logic changed (only type definition)

---

## Phase 2: Derivation Utils Domain

**Domain:** Path parsing utility
**Goal:** Update parsePath() function to recognize and parse indexed array paths

### Files to Modify
- `src/derivation/utils/path-parser.ts` (lines 35-71 - parsePath function only)

### Changes
1. Add regex to detect indexed arrays: `/^([a-zA-Z_][a-zA-Z0-9_-]*)\[(\d+)\]$/`
2. Parse index number and include in PathSegment
3. Preserve existing `[]` (empty bracket) handling
4. Keep existing validation logic

### Code Change
```typescript
return segments.map((segment) => {
  if (!segment) {
    throw new Error(`Invalid path: empty segment in "${path}"`);
  }

  // NEW: Check for indexed array: "key[0]", "key[1]", etc.
  const indexedArrayMatch = segment.match(/^([a-zA-Z_][a-zA-Z0-9_-]*)\[(\d+)\]$/);
  if (indexedArrayMatch) {
    return {
      name: indexedArrayMatch[1],
      isArray: true,
      index: Number(indexedArrayMatch[2])
    };
  }

  // EXISTING: Check for wildcard array: "key[]"
  const isArray = segment.endsWith('[]');
  const name = isArray ? segment.slice(0, -2) : segment;

  if (!name) {
    throw new Error(`Invalid path: array marker without name in "${path}"`);
  }

  // Validate segment name (alphanumeric, underscores, hyphens)
  if (!/^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(name)) {
    throw new Error(
      `Invalid path segment "${segment}" in "${path}". ` +
      'Segments must start with a letter or underscore, ' +
      'followed by letters, numbers, underscores, or hyphens.'
    );
  }

  return { name, isArray };
});
```

### Completion Criteria
- [ ] parsePath() recognizes indexed arrays like `field[0]`, `field[1]`
- [ ] parsePath() still recognizes wildcard arrays like `field[]`
- [ ] Index is extracted and stored as number in PathSegment
- [ ] Existing validation logic unchanged
- [ ] Code compiles
- [ ] No other files modified
- [ ] Only path-parser.ts parsePath() function changed

---

## Phase 3: Derivation Core Domain

**Domain:** NAS schema derivation
**Goal:** Add validation for sequential array indices in listItems

### Files to Modify
- `src/derivation/core/nas-deriver.ts` (lines 186-194 - listItems processing only)

### Changes
1. Collect all indices from listItems with explicit index values
2. Validate indices are sequential starting from 0
3. Throw clear error if gaps exist (e.g., [0], [2] but no [1])
4. Keep existing processContentItem logic unchanged

### Code Change
```typescript
// Process list items if present
if (item.listItems) {
  // NEW: Validate sequential indices for indexed listItems
  const indices: number[] = [];

  for (const listItem of item.listItems) {
    if (!listItem.targetPath) continue;

    const segments = parsePath(listItem.targetPath);
    const lastSegment = segments[segments.length - 1];

    if (lastSegment.index !== undefined) {
      indices.push(lastSegment.index);
    }
  }

  // Validate sequential indices if any explicit indices found
  if (indices.length > 0) {
    indices.sort((a, b) => a - b);
    for (let i = 0; i < indices.length; i++) {
      if (indices[i] !== i) {
        throw new Error(
          `listItems array indices must be sequential starting from 0. ` +
          `Found index ${indices[i]} but expected ${i} at path ${item.targetPath}`
        );
      }
    }
  }

  // EXISTING: Process each list item
  for (const listItem of item.listItems) {
    processContentItem(listItem, currentPath, schema);
  }
}
```

### Completion Criteria
- [ ] Collects indices from listItems targetPaths
- [ ] Validates indices are sequential (0, 1, 2, ...)
- [ ] Throws clear error for gaps or wrong order
- [ ] Existing processContentItem calls unchanged
- [ ] Code compiles
- [ ] No other files modified
- [ ] Only nas-deriver.ts listItems section changed

---

## Phase 4: Integration Testing Domain

**Domain:** End-to-end verification
**Goal:** Verify biopsych pipeline runs successfully with indexed paths

### Test Commands
```bash
# Validate template still passes
bun run src/tests/diagnose-template.ts

# Run full pipeline
bun run src/tests/test-biopsych-pipeline.ts
```

### Expected Results
1. Template validation passes ✅
2. NAS derivation succeeds (no path parser error) ✅
3. Pipeline executes through all steps ✅
4. GPT-5 generation completes ✅
5. Render step produces output ✅

### Completion Criteria
- [ ] diagnose-template.ts shows "✅ Template validation PASSED"
- [ ] No "Invalid path segment" errors in pipeline
- [ ] Pipeline reaches GPT-5 generation step
- [ ] Pipeline completes successfully OR fails at expected step (API key, etc.)
- [ ] No errors in NAS derivation phase
- [ ] Indexed paths like `[0]`, `[1]` are accepted

---

## Integration Phase

### Final Verification
After all phases complete:

**1. Consistency Check**
- [ ] Derivation layer now matches factory layer behavior
- [ ] Both support `field[]` (wildcard) and `field[0]` (indexed)
- [ ] Schema validation and path parsing are aligned

**2. Template Works**
- [ ] biopsych-intake-template.schema.json validates successfully
- [ ] listItems with indexed targetPaths are processed
- [ ] No architectural conflicts between layers

**3. No Regressions**
- [ ] Existing wildcard array paths `[]` still work
- [ ] Non-array paths still work
- [ ] All existing tests pass (if any)

**4. Documentation**
- [ ] PathSegment interface documented
- [ ] parsePath() behavior documented with examples

---

## Error Handling Strategy

### If Phase 1 Fails
- TypeScript compilation error → Fix type definition
- Review Phase 1 again before proceeding

### If Phase 2 Fails
- Regex doesn't match correctly → Adjust pattern
- Breaks existing functionality → Add test cases
- Review Phase 2 again before proceeding

### If Phase 3 Fails
- Validation logic too strict → Adjust criteria
- Performance issues with large arrays → Optimize
- Review Phase 3 again before proceeding

### If Phase 4 Fails
**Expected failures (NOT fix plan issues):**
- Missing OpenAI API key → User needs to provide
- GPT-5 API error → External service issue

**Unexpected failures (fix plan issues):**
- Still getting path parser error → Go back to Phase 2
- New errors in derivation → Go back to Phase 3
- Type errors → Go back to Phase 1

---

## Notes

**Why This Approach:**
1. **Aligns with factory layer** - path-resolver.ts already has this logic
2. **Minimal changes** - Only 3 files touched, each in separate phase
3. **Non-breaking** - Existing `[]` notation still works
4. **Clear responsibilities** - Each phase has one job

**Alternative Considered (Rejected):**
- Change template to use implicit indices → More complex, less explicit
- Remove `listItems` feature → Breaking change, removes useful capability
- Add separate notation → Confusing to have two ways to express same thing

**Decision Rationale:**
The template author's approach is intuitive and matches the factory layer. The derivation layer should support the same notation for consistency.
