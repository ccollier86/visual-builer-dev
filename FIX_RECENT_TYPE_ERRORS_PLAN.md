# Fix Recent Type Errors and Constants Plan

## Overview

**Problem**: Three issues found after recent updates:
1. Invalid model constant in schema-generator (`'gpt-5'` doesn't exist)
2. Type error in nas-builder tableMap iteration (Record vs Array)
3. Type error in test-pipeline design tokens

**Solution**: Fix each issue in isolation following SOR/SOD/DI

---

## Phase 1: Fix Invalid Model Constant

**Domain:** Integration generation options
**Goal:** Remove hardcoded invalid model constant

### Files to Modify
- `src/integration/core/schema-generator.ts`

### Changes

**Replace invalid constant with valid default:**

```typescript
// BEFORE (Line 17-22)
const DEFAULT_OPTIONS: Required<GenerationOptions> = {
  model: 'gpt-5',  // ❌ Invalid - gpt-5 doesn't exist
  temperature: 0.7,
  maxTokens: 4000,
  retries: 3,
};

// AFTER
const DEFAULT_OPTIONS: Required<GenerationOptions> = {
  model: 'gpt-4-turbo',  // ✅ Valid OpenAI model
  temperature: 0.7,
  maxTokens: 4000,
  retries: 3,
};
```

### Completion Criteria
- [ ] Model changed to valid OpenAI model name
- [ ] TypeScript compiles
- [ ] Only schema-generator.ts modified

---

## Phase 2: Fix tableMap Iteration Type Error

**Domain:** Resolution NAS builder
**Goal:** Correct iteration over Record type

### Files to Modify
- `src/resolution/core/nas-builder.ts`

### Changes

**Fix tableMap iteration (Line 80):**

```typescript
// BEFORE
if (item.tableMap) {
  for (const colItem of item.tableMap) {  // ❌ tableMap is Record, not Array
    this.resolveItem(colItem, component.id, context, resolved, warnings);
  }
}

// AFTER
if (item.tableMap) {
  for (const colItem of Object.values(item.tableMap)) {  // ✅ Iterate values
    this.resolveItem(colItem, component.id, context, resolved, warnings);
  }
}
```

### Completion Criteria
- [ ] Use `Object.values()` to iterate Record
- [ ] TypeScript compiles
- [ ] Only nas-builder.ts modified

---

## Phase 3: Fix Test Design Tokens Type

**Domain:** Test fixtures
**Goal:** Match DesignTokens type definition

### Files to Modify
- `src/tests/test-pipeline.ts`

### Changes

**Fix table.density type (Line 70):**

```typescript
// BEFORE
table: {
  density: 'normal',  // ❌ String doesn't match literal union type
  // ...
}

// AFTER
table: {
  density: 'normal' as const,  // ✅ Literal type
  // ...
}
```

OR if the tokens type allows it, just remove quotes and use enum value directly.

### Completion Criteria
- [ ] Type matches DesignTokens definition
- [ ] TypeScript compiles
- [ ] Only test-pipeline.ts modified

---

## Success Criteria

**All phases complete when:**
- [ ] Invalid `'gpt-5'` constant replaced with valid model
- [ ] tableMap iteration uses `Object.values()`
- [ ] Test tokens match type definition
- [ ] TypeScript compiles with no errors
- [ ] All tests still pass
- [ ] Only 3 files modified

---

## Architecture Compliance

- **SOR**: Each constant/type has single source of truth
- **SOD**: Each fix isolated to one file, one responsibility
- **DI**: No new dependencies, just type corrections
