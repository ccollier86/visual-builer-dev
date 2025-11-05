# Comprehensive Code Review

**Date:** 2025-11-05
**Reviewer:** Claude (Serena-assisted systematic review)
**Scope:** Entire codebase - looking for legacy code, dead code, unused code, undocumented items

---

## Review Process

Going through each file systematically to identify:
- ❌ Legacy code (outdated patterns)
- 🗑️ Dead code (unreachable/unused)
- 📝 Undocumented (missing docs)
- ⚠️ Issues requiring attention

---

## DERIVATION DOMAIN

### ✅ `src/derivation/types.ts`
- **Status:** Clean, well-documented
- **Exports:** DerivedSchema, PathSegment, ContentConstraints, SchemaNode, CUSTOM_STRING_CONSTRAINTS, CustomStringConstraintKey, SchemaPropertyMetadata, AddPropertyOptions, DuplicatePathErrorContext, NoteTemplate, Component, ContentItem, ListProps, TableProps, ComponentProps
- **Issues:**
  - ⚠️ `styleHints?: any;` (line 163) - Should be typed
- **Note:** PathSegment is also defined in `src/composition/core/context-slicer.ts:143-146` (DUPLICATE - see below)

### ✅ `src/derivation/errors.ts`
- **Status:** Clean, well-documented
- **Exports:** DuplicatePathError
- **Used by:** schema-builder.ts, derivation/index.ts, duplicate-paths.test.ts
- **Issues:** None

### ✅ `src/derivation/core/ais-deriver.ts`
- **Status:** Clean, well-documented
- **Exports:** deriveAIS
- **Issues:** None

### ✅ `src/derivation/core/nas-deriver.ts`
- **Status:** Clean, well-documented
- **Exports:** deriveNAS
- **Issues:** None

---

## COMPOSITION DOMAIN

### ⚠️ `src/composition/core/context-slicer.ts`
- **Status:** Has issues
- **Exports:** sliceContext
- **Issues:**
  - 🗑️ **DUPLICATE TYPE** (lines 143-146): `interface PathSegment` is defined here but also exists in `src/derivation/types.ts:39-43`
    - **Action:** Remove inline definition, import from derivation/types.ts
  - ⚠️ Multiple `any` types (lines 24, 69, 100)
    - `nasSnapshot: any` should be typed
    - `getValueAtPath(obj: any, path: string): any` should have proper types
    - `setValueAtPath(obj: any, path: string, value: any): void` should have proper types

### ⚠️ `src/composition/core/field-guide-builder.ts`
- **Status:** Has issues
- **Exports:** buildFieldGuide
- **Issues:**
  - ⚠️ Multiple `any` types (lines 28, 44, 114)
    - `walkComponent(component: any)` should use Component type
    - `processContentItem(item: any)` should use ContentItem type
    - `mapConstraints(constraints: any)` should use ContentConstraints type

### ⚠️ `src/composition/core/message-builder.ts`
- **Status:** Has issues
- **Exports:** buildPromptMessages
- **Issues:**
  - ⚠️ Multiple `any` types throughout (lines 28, 50, 86, 198, 200, 204)
    - `template: any` should use NoteTemplate type
    - Helper functions use `any` for objects that could be typed

### ⚠️ `src/composition/core/prompt-linter.ts`
- **Status:** Has issues
- **Exports:** lintPromptBundle
- **Issues:**
  - ⚠️ Multiple `any` types (lines 16, 17, 129, 165, 191, 222)
    - `bundle: any` should be PromptBundle type
    - `aiSchema: any` should be DerivedSchema type
    - `template: any` should be NoteTemplate type
    - Helper functions lack proper typing

### ⚠️ `src/composition/types.ts`
- **Status:** Has issues
- **Issues:**
  - ⚠️ Multiple `any` types (lines 16, 19, 20, 43, 72-75)
    - `jsonSchema: any` should be DerivedSchema
    - `factPack?: any` should be typed
    - `nasSlices: any` should be typed
    - `style?: any` should be typed
    - `template: any` should be NoteTemplate
    - `aiSchema: any` should be DerivedSchema
    - `nasSnapshot: any` should be typed

---

## INTEGRATION DOMAIN

### ⚠️ `src/integration/types.ts`
- **Status:** Has issues
- **Issues:**
  - ⚠️ `output: any` (line 21) - Should be typed as the AI-generated output matching AIS schema

### ⚠️ `src/integration/core/schema-generator.ts`
- **Status:** Has issues
- **Issues:**
  - ⚠️ Multiple `any` types (lines 67, 70)
    - `aiOutput: any` should be typed
    - `error: any` in catch block (acceptable pattern)

### ⚠️ `src/integration/utils/retry-handler.ts`
- **Status:** Has issues
- **Issues:**
  - ⚠️ Multiple `any` types (lines 14, 56, 61)
    - `isRetryableError(error: any)` should use Error type or unknown
    - `lastError: any` should be Error | unknown
    - `error: any` in catch block (acceptable pattern)

---

## RESOLUTION DOMAIN

### ⚠️ `src/resolution/contracts/types.ts`
- **Status:** Has extensive `any` usage
- **Issues:**
  - ⚠️ Multiple `any` types (lines 10, 17, 19, 27, 75, 95)
    - `SourceData` = `[key: string]: any` - Should have structured type
    - `template: any` should be NoteTemplate
    - `nasSchema: any` should be DerivedSchema
    - `value: any` in ResolvedField is acceptable (dynamic values)
    - Interface methods use `any` for item parameter

### ⚠️ `src/resolution/core/*.ts` (All resolver files)
- **Status:** All have `any` types for item parameter
- **Files:** computed-resolver.ts, static-resolver.ts, lookup-resolver.ts, verbatim-resolver.ts
- **Issues:**
  - ⚠️ `resolve(item: any, ...)` should use ContentItem type
  - ⚠️ `format(value: any, ...)` in formula-evaluator - acceptable for dynamic values

### ⚠️ `src/resolution/core/path-setter.ts`
- **Status:** Has issues
- **Issues:**
  - ⚠️ `setByPath(obj: any, path: string, value: any)` - obj and value should be typed or use unknown

### ⚠️ `src/resolution/core/nas-builder.ts`
- **Status:** Has issues
- **Issues:**
  - ⚠️ `resolveItem(item: any, ...)` (line 123) should use ContentItem type

---

## PIPELINE DOMAIN

### ⚠️ `src/pipeline/types.ts`
- **Status:** Has extensive `any` usage
- **Issues:**
  - ⚠️ Multiple `any` types (lines 17, 20, 78, 82-84)
    - `template: any` should be NoteTemplate
    - `sourceData: any` should be SourceData or typed
    - `aiOutput: any` should be typed
    - Schema types (ais, nas, rps) should be DerivedSchema

### ⚠️ `src/pipeline/core/merger.ts`
- **Status:** Has issues
- **Issues:**
  - ⚠️ `mergePayloads(aiOutput: any, nasData: any): any` - all should be typed

---

## TOKENS DOMAIN

### ⚠️ `src/tokens/core/compiler.ts`
- **Status:** Has issues
- **Issues:**
  - ⚠️ `getNestedValue(obj: any, path: string): any` should use proper types or unknown

---

## FACTORY DOMAIN

### ⚠️ `src/factory/types.ts`
- **Status:** Has extensive `any` usage
- **Issues:**
  - ⚠️ Multiple `any` types (lines 5-7)
    - `template: any` should be NoteTemplate
    - `payload: any` should be typed (RPS)
    - `tokens: any` should be DesignTokens

### ⚠️ `src/factory/core/renderer.ts`
- **Status:** Has extensive `any` usage throughout
- **Issues:**
  - ⚠️ Many function parameters typed as `any` (lines 75-77, 136-137, 158-159, 177-178, 206)
    - Should use Component, payload type, DesignTokens

### ⚠️ `src/factory/components/*.ts` (All component renderers)
- **Status:** All have `any` types
- **Files:** section-renderer.ts, list-renderer.ts, table-renderer.ts
- **Issues:**
  - ⚠️ Component parameters typed as `any`
  - ⚠️ Payload parameters typed as `any`
  - ⚠️ Value parameters typed as `any`

### ⚠️ `src/factory/utils/path-resolver.ts`
- **Status:** Has issues
- **Issues:**
  - ⚠️ `getByPath(obj: any, dotPath: string): any` should use proper types or unknown

---

