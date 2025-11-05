# Template Validation Errors - Diagnosis

## Summary
The biopsych intake template has **7 validation errors** preventing pipeline execution.

## Error 1: Additional Property `$schema`
**Location**: Root level of template
**Issue**: Template includes a `$schema` property that's not allowed by the note-template schema
**Message**: "must NOT have additional properties"

This is likely a leftover JSON schema property that shouldn't be in the note template.

## Errors 2-7: Missing `text` Property in Static Content Slots
**Locations**:
- `/layout/5/children/0/content/0`
- `/layout/5/children/2/content/0`
- `/layout/5/children/3/content/0`

**Issue**: Static content slots are missing the required `text` property
**Message**: "must have required property 'text'"

Layout section 5 is likely the **PLAN** section based on typical note structure.

These content slots are using `slot: "static"` but missing the `text` field that must contain the static text to display.

## Root Cause Analysis

1. **`$schema` property**: Template JSON file has a schema reference at root level that violates the note-template schema definition

2. **Static slots without text**: Three static content slots in the PLAN section were defined with:
   - `slot: "static"`
   - `id: "..."`
   - `description: "..."`
   
   But missing:
   - `text: "the actual static content here"`

## Impact
Template fails validation at pipeline step 1, preventing:
- Schema derivation (AIS, NAS, RPS)
- Prompt composition
- GPT-5 generation
- HTML rendering

Pipeline cannot proceed past template validation.

## Next Steps
To fix these errors:
1. Remove `$schema` property from root of biopsych-intake-template.schema.json
2. Add `text` property to 3 static content slots in PLAN section (layout[5])
