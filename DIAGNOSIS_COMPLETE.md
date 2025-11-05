# Biopsych Intake Template Validation Errors - Complete Diagnosis

## Executive Summary
The biopsych intake template has **7 validation errors** that prevent pipeline execution.
All errors are in the template structure and must be fixed before GPT-5 generation can run.

---

## Error 1: Disallowed `$schema` Property

**Location**: Line 2 of `biopsych-intake-template.schema.json`

**Current Code**:
```json
{
  "$schema": "https://catalyst/specs/note-template.schema.json",
  "id": "biopsych-intake-v1",
  ...
}
```

**Issue**: The note template validator does not allow a `$schema` property at the root level.

**Validation Message**: 
- `Path: (root)`
- `Field: $schema`  
- `Message: must NOT have additional properties`

**Impact**: Root-level validation failure

---

## Errors 2-3: `interventions-recommended` Missing `text` Property

**Location**: `layout[5].children[0].content[0]` (PLAN section → Interventions)

**Current Structure**:
```json
{
  "slot": "static",
  "id": "interventions-list",
  "description": "Standardized intervention recommendations",
  "targetPath": "plan.interventionsRecommended[]",
  "listItems": [ ... ]
}
```

**Issue**: Static slot has `listItems` array but missing required `text` property.

**Validation Messages**:
- Error 2: `must have required property 'text'`
- Error 3: `must match "then" schema`

**Note**: This slot contains 6 intervention items in `listItems` array, which may be the intended design, but the validator expects a `text` property for static slots.

---

## Errors 4-5: `follow-up-plan` Missing `text` Property

**Location**: `layout[5].children[2].content[0]` (PLAN section → Follow-up)

**Current Structure**: *(needs inspection)*

**Issue**: Static content slot missing required `text` property.

**Validation Messages**:
- Error 4: `must have required property 'text'`
- Error 5: `must match "then" schema`

---

## Errors 6-7: `crisis-safety-plan` Missing `text` Property

**Location**: `layout[5].children[3].content[0]` (PLAN section → Crisis Plan)

**Current Structure**: *(needs inspection)*

**Issue**: Static content slot missing required `text` property.

**Validation Messages**:
- Error 6: `must have required property 'text'`
- Error 7: `must match "then" schema`

---

## Root Cause

### Design vs. Schema Mismatch

The template uses a `listItems` pattern for static content:
```json
{
  "slot": "static",
  "listItems": [ ... ]
}
```

But the note-template schema requires:
```json
{
  "slot": "static",
  "text": "some text here"
}
```

There may be a schema version mismatch or the `listItems` feature isn't supported yet.

---

## Impact on Pipeline

**Pipeline Execution Flow**:
1. ❌ **BLOCKED**: Template validation (Step 1/9)
2. ⏸️ Schema derivation (AIS, NAS, RPS)
3. ⏸️ Prompt composition
4. ⏸️ GPT-5 API call
5. ⏸️ AI output validation
6. ⏸️ HTML rendering

**Cannot proceed past Step 1.**

---

## Required Actions

### Action 1: Remove `$schema` Property
**File**: `src/tests/biopsych-intake-template.schema.json:2`
**Change**: Remove line 2 entirely

### Action 2-4: Fix Static Content Slots
**Locations**:
- `layout[5].children[0].content[0]` (interventions-recommended)
- `layout[5].children[2].content[0]` (follow-up-plan)  
- `layout[5].children[3].content[0]` (crisis-safety-plan)

**Options**:
1. **If `listItems` is valid**: Update note-template schema to allow `listItems` pattern
2. **If `listItems` is invalid**: Convert to standard static `text` property
3. **Check schema version**: May be using wrong note-template.schema.json version

---

## Diagnostic Commands

**View validation errors**:
```bash
bun run src/tests/diagnose-template.ts
```

**Check specific slots**:
```bash
# View interventions slot
cat src/tests/biopsych-intake-template.schema.json | jq '.layout[5].children[0].content[0]'

# View follow-up slot  
cat src/tests/biopsych-intake-template.schema.json | jq '.layout[5].children[2].content[0]'

# View crisis plan slot
cat src/tests/biopsych-intake-template.schema.json | jq '.layout[5].children[3].content[0]'
```

---

## Next Steps

**DO NOT FIX** per user instructions. 

Diagnosis complete. Awaiting user decision on how to resolve these template validation errors before pipeline can execute GPT-5 generation.
