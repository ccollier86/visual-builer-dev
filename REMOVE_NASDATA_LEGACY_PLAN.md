# Remove Unnecessary nasData "Legacy" Path - Plan

## Overview

**Problem**: We just built this resolution system and immediately labeled the bypass path as "legacy". This is a brand new library with ONE test run. There is NO legacy to support.

**Solution**: Remove `nasData` input option entirely. The pipeline should ONLY accept `sourceData` and always perform resolution. This is cleaner, simpler, and what the spec intended.

---

## Architecture Principles

- **SOR**: Source data is the ONLY input, resolution is the ONLY path to NAS
- **SOD**: Remove dual-path complexity, one clear responsibility per component
- **DI**: Same dependencies, simpler flow

---

## What We're Removing

### Current (Unnecessarily Complex):
```typescript
// Path 1: sourceData → resolution → NAS (new)
// Path 2: nasData → skip resolution (fake "legacy")
```

### After (Clean & Simple):
```typescript
// ONLY path: sourceData → resolution → NAS
```

---

## Phase 1: Update Pipeline Types

**Domain:** Pipeline type definitions
**Goal:** Remove nasData field, keep only sourceData

### Files to Modify
- `src/pipeline/types.ts`

### Changes

**Remove `nasData?` field entirely:**

```typescript
// BEFORE
export interface PipelineInput {
  template: any;
  sourceData?: any;  // NEW
  nasData?: any;     // ❌ REMOVE THIS - no legacy!
  tokens?: DesignTokens;
  options?: PipelineOptions;
}

// AFTER
export interface PipelineInput {
  template: any;
  sourceData: any;   // ✅ REQUIRED - the only input
  tokens?: DesignTokens;
  options?: PipelineOptions;
}
```

### Completion Criteria
- [ ] `nasData` field removed from PipelineInput
- [ ] `sourceData` is now REQUIRED (not optional)
- [ ] TypeScript compiles
- [ ] No other files modified

---

## Phase 2: Simplify Pipeline Logic

**Domain:** Pipeline orchestration
**Goal:** Remove dual-path logic, always use resolution

### Files to Modify
- `src/pipeline/core/pipeline.ts`

### Changes

**Remove the branching logic (lines 73-108):**

```typescript
// BEFORE (Complex branching)
let resolvedNasData: any;

if (input.sourceData && !input.nasData) {
  // Resolution path
  log(options, 'Step 4.5/9: Resolving NAS data from source...');
  const { createNASBuilder } = await import('../../resolution');
  const nasBuilder = createNASBuilder();
  const resolutionResult = await nasBuilder.build({...});
  resolvedNasData = resolutionResult.nasData;
  // ... warnings
} else if (input.nasData) {
  // "Legacy" path ❌
  resolvedNasData = input.nasData;
  log(options, 'Using pre-resolved NAS data');
} else {
  throw createError('Either sourceData or nasData must be provided', 'resolution');
}

// AFTER (Simple, single path)
log(options, 'Step 4.5/9: Resolving NAS data from source...');

const { createNASBuilder } = await import('../../resolution');
const nasBuilder = createNASBuilder();

const resolutionResult = await nasBuilder.build({
  template: input.template,
  sourceData: input.sourceData,
  nasSchema: nas
});

const nasData = resolutionResult.nasData;

// Log warnings
if (resolutionResult.warnings.length > 0) {
  console.warn(`Resolution warnings (${resolutionResult.warnings.length}):`);
  resolutionResult.warnings.forEach(w => {
    console.warn(`  [${w.componentId}/${w.slotId}] ${w.message}`);
  });
}

log(options, `Resolved ${resolutionResult.resolved.length} fields`);

// Continue with prompt composition using nasData...
```

### Completion Criteria
- [ ] Removed branching logic (if/else for sourceData vs nasData)
- [ ] Single resolution path only
- [ ] No "legacy" references
- [ ] Variable named `nasData` (not `resolvedNasData`)
- [ ] TypeScript compiles
- [ ] Only pipeline.ts modified

---

## Phase 3: Update Tests to Use Source Data

**Domain:** Test fixtures
**Goal:** All tests provide sourceData, none use nasData

### Files to Modify
- `src/tests/test-biopsych-pipeline.ts`

### Changes

**3.1 Remove the old test, keep only sourceData test**

```typescript
// BEFORE: Two test functions
async function main() {
  // Uses nasData ❌
  const result = await runPipeline({
    template: biopsychTemplate,
    nasData: nasData,  // ❌ REMOVE
    options: {...}
  });
}

async function testPipelineWithSourceData() {
  // Uses sourceData ✅
  const result = await runPipeline({
    template: biopsychTemplate,
    sourceData: sourceData,  // ✅ KEEP
    options: {...}
  });
}

// AFTER: Single test function
async function main() {
  console.log('🚀 Starting biopsych intake pipeline test...\n');

  // Create source data from patient info
  const sourceData = {
    patient: {
      name: demoPatient.name,
      dob: demoPatient.dob,
      mrn: demoPatient.mrn
    },
    visit: {
      date: new Date().toISOString().split('T')[0],
      facility: demoFacility,
      provider: demoProvider
    },
    assessments: demoAssessments,
    diagnoses: demoDiagnoses
  };

  const result = await runPipeline({
    template: biopsychTemplate,
    sourceData,  // ✅ Only path
    options: {
      generationOptions: {
        model: 'gpt-5',
        temperature: 0.2
      }
    }
  });

  console.log('✅ Pipeline completed successfully!');
  console.log('HTML length:', result.html.length);
}

main().catch(console.error);
```

**3.2 Remove nasData fixture creation**

Delete or comment out the manual `nasData` object creation (lines that build the pre-resolved structure). We don't need it anymore.

### Completion Criteria
- [ ] Only one test function (main)
- [ ] Test uses sourceData only
- [ ] No nasData references
- [ ] Manual nasData creation removed
- [ ] Test runs successfully
- [ ] Only test file modified

---

## Phase 4: Clean Up Test Files

**Domain:** Test cleanup
**Goal:** Remove example-nas-data.json if it exists

### Files to Check/Remove
- `src/tests/fixtures/example-nas-data.json` (if exists)
- Any other nasData fixtures

### Changes

**Check if example-nas-data.json exists:**
```bash
ls -la src/tests/fixtures/example-nas-data.json
```

**If it exists, remove it:**
- This was created as an example of pre-resolved data
- No longer needed since we always resolve from source

### Completion Criteria
- [ ] Check for nasData fixture files
- [ ] Remove any found
- [ ] Only source-data.json remains
- [ ] No dead code left

---

## Phase 5: Verify No Dead Code Remains

**Domain:** Codebase cleanup verification
**Goal:** Ensure no nasData references remain anywhere

### Checks to Perform

**1. Grep for nasData references:**
```bash
grep -r "nasData" src/ --exclude-dir=node_modules
```

**2. Check for "legacy" comments:**
```bash
grep -r "legacy" src/ --exclude-dir=node_modules -i
```

**3. Check for "backward compat" comments:**
```bash
grep -r "backward" src/ --exclude-dir=node_modules -i
```

**Expected Results:**
- Zero matches for `nasData`
- Zero matches for "legacy"
- Zero matches for "backward compatible"

### Completion Criteria
- [ ] No nasData references in code
- [ ] No legacy comments
- [ ] No backward compatibility mentions
- [ ] Clean codebase

---

## Phase 6: Update Documentation

**Domain:** Documentation accuracy
**Goal:** Update any docs that mention dual paths

### Files to Check
- `RESOLUTION_DOMAIN_PLAN.md`
- `README.md` (if exists)
- Any other docs

### Changes

**Update plan document to reflect final state:**
- Remove mentions of "backward compatibility"
- Remove mentions of nasData path
- Document that sourceData is the ONLY input

### Completion Criteria
- [ ] Plan updated (or marked as historical)
- [ ] Docs reflect single-path architecture
- [ ] No misleading "legacy" references

---

## Integration Phase

After all phases complete:

### Final Verification

**1. Type Safety**
- [ ] PipelineInput requires sourceData
- [ ] No optional nasData field exists
- [ ] TypeScript enforces single path

**2. Pipeline Simplicity**
- [ ] No branching logic for dual paths
- [ ] Always performs resolution
- [ ] Clear, linear flow

**3. Tests Pass**
- [ ] test-resolution.ts passes
- [ ] test-biopsych-pipeline.ts passes
- [ ] No nasData references in tests

**4. Architecture Compliance**
- [ ] SOR: Source data is the only input
- [ ] SOD: Single responsibility (resolution)
- [ ] DI: Same clean dependencies

**5. No Dead Code**
- [ ] Zero nasData references
- [ ] Zero "legacy" comments
- [ ] Clean, simple codebase

---

## Why This Is Better

### Before (Unnecessarily Complex):
```typescript
// Developer confusion: Which should I use?
await runPipeline({
  template: t,
  sourceData: data,    // This one?
  nasData: resolved    // Or this one?
});

// Pipeline: Complex branching
if (sourceData && !nasData) {
  // Path 1
} else if (nasData) {
  // Path 2
} else {
  // Error
}
```

### After (Clean & Simple):
```typescript
// Developer clarity: Only one way
await runPipeline({
  template: t,
  sourceData: data  // ✅ The only way
});

// Pipeline: Linear flow
const nasData = await resolveNAS(sourceData);
// Continue...
```

---

## Benefits

1. **No Confusion**: One clear path, no decisions needed
2. **Simpler Code**: No branching, no dual paths
3. **Easier to Test**: Only one flow to verify
4. **Honest API**: No fake "legacy" in a new system
5. **Better Onboarding**: New developers see clean, simple code
6. **Matches Spec**: This is what the spec intended
7. **No Technical Debt**: Starting clean

---

## Success Criteria

**All phases complete when:**
- [ ] `nasData` field removed from types
- [ ] Pipeline has single resolution path only
- [ ] Tests use sourceData only
- [ ] No nasData fixture files
- [ ] Zero nasData references in codebase
- [ ] Zero "legacy" mentions
- [ ] Documentation accurate
- [ ] TypeScript compiles
- [ ] All tests pass
- [ ] Architecture is SOR/SOD/DI compliant

---

## Notes

**Why We Made This Mistake:**
- Copied "backward compatibility" pattern from mature systems
- Didn't realize this is a BRAND NEW system
- Over-engineered for non-existent legacy support

**Lesson Learned:**
- Don't add "legacy" paths on day one
- Keep new systems simple
- Add complexity only when actually needed

**The Right Approach:**
- Start with the clean, simple path
- If we LATER need pre-resolved data, add it THEN
- But we won't, because resolution is core to the design
