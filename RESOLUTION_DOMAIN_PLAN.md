# Resolution Domain Implementation Plan

## Overview

Implement the missing `/src/resolution/` domain to bridge the gap between raw source data + template definitions and the resolved NAS snapshot ready for merging with AI output.

**Problem**: Pipeline currently expects pre-resolved `nasData` input. Template defines HOW to resolve data (lookup paths, formulas, static text) but no code performs the actual resolution.

**Solution**: Build a resolution layer that walks the template, applies each content slot's resolution rules, and produces a validated NAS snapshot.

---

## Architecture Principles

- **SOR**: Raw source data is the system of record; resolvers query it
- **SOD**: Each resolver handles ONE slot type (lookup, computed, static, verbatim)
- **DI**: All resolvers injected into NAS builder; no direct imports of external systems

---

## Phase 1: Contracts Domain

**Domain:** Type definitions and interfaces
**Goal:** Define contracts for all resolution components

### Files to Create
- `src/resolution/contracts/types.ts` (NEW)

### Changes

**1. Core Resolution Types**
```typescript
/**
 * Raw source data provided at runtime (before resolution)
 */
export interface SourceData {
  patient?: Record<string, any>;
  visit?: Record<string, any>;
  assessments?: Record<string, any>;
  diagnoses?: any[];
  transcript?: Record<string, any>;
  [key: string]: any;
}

/**
 * Resolution context passed to all resolvers
 */
export interface ResolutionContext {
  template: any;           // Validated note template
  sourceData: SourceData;  // Raw input data
  nasSchema: any;          // Target NAS schema
}

/**
 * Result of a single field resolution
 */
export interface ResolvedField {
  path: string;            // Target path in NAS
  value: any;              // Resolved value
  slotType: 'lookup' | 'computed' | 'static' | 'verbatim';
}

/**
 * Resolution result with diagnostics
 */
export interface ResolutionResult {
  nasData: Record<string, any>;     // Complete NAS snapshot
  resolved: ResolvedField[];         // Successfully resolved fields
  warnings: ResolutionWarning[];     // Missing sources, failed formulas, etc.
}

/**
 * Diagnostic warning during resolution
 */
export interface ResolutionWarning {
  componentId: string;
  slotId: string;
  slotType: string;
  path: string;
  reason: 'missing_source' | 'formula_error' | 'invalid_ref' | 'type_mismatch';
  message: string;
}
```

**2. Resolver Interfaces (DI contracts)**
```typescript
/**
 * Interface for slot-specific resolvers
 */
export interface ISlotResolver {
  /**
   * Resolve a single content item
   */
  resolve(item: any, context: ResolutionContext): ResolvedField | null;

  /**
   * Check if this resolver can handle the given slot type
   */
  canResolve(slotType: string): boolean;
}

/**
 * Interface for formula evaluation (computed slots)
 */
export interface IFormulaEvaluator {
  /**
   * Safely evaluate a formula expression
   */
  evaluate(formula: string, context: Record<string, any>): number | string | boolean;

  /**
   * Format the result according to format hint
   */
  format(value: any, format?: 'plain' | 'deltaScore' | 'percent'): string;
}

/**
 * Interface for NAS builder (orchestrator)
 */
export interface INASBuilder {
  /**
   * Build complete NAS snapshot from template + source data
   */
  build(context: ResolutionContext): Promise<ResolutionResult>;
}
```

### Completion Criteria
- [ ] All core types defined
- [ ] Resolver interfaces defined with clear contracts
- [ ] No implementation logic (only types/interfaces)
- [ ] TypeScript compiles
- [ ] No other files modified
- [ ] Documentation comments on all public types

---

## Phase 2: Lookup Resolver Domain

**Domain:** Lookup field resolution
**Goal:** Resolve `slot: "lookup"` items by extracting values from source data

### Files to Create
- `src/resolution/core/lookup-resolver.ts` (NEW)

### Changes

**Lookup Resolver Implementation**
```typescript
import type { ISlotResolver, ResolutionContext, ResolvedField } from '../contracts/types';
import { getByPath } from '../../factory/utils/path-resolver'; // Reuse existing path resolver

/**
 * Resolves lookup slots by extracting values from source data
 *
 * Responsibility: ONE - Extract value from lookup path, place at targetPath
 */
export class LookupResolver implements ISlotResolver {
  canResolve(slotType: string): boolean {
    return slotType === 'lookup';
  }

  resolve(item: any, context: ResolutionContext): ResolvedField | null {
    if (!item.lookup || !item.targetPath) {
      return null;
    }

    // Extract from source data using lookup path
    const value = getByPath(context.sourceData, item.lookup);

    if (value === undefined) {
      // Missing source - return null, caller will log warning
      return null;
    }

    return {
      path: item.targetPath,
      value,
      slotType: 'lookup'
    };
  }
}
```

### Completion Criteria
- [ ] LookupResolver class implements ISlotResolver
- [ ] Uses existing path-resolver.ts for getByPath
- [ ] Handles missing source data gracefully (returns null)
- [ ] Handles array paths (diagnoses[].code)
- [ ] TypeScript compiles
- [ ] No other files modified
- [ ] No external system imports (only via DI)

---

## Phase 3: Static Resolver Domain

**Domain:** Static text resolution
**Goal:** Resolve `slot: "static"` items by copying text to targetPath

### Files to Create
- `src/resolution/core/static-resolver.ts` (NEW)

### Changes

**Static Resolver Implementation**
```typescript
import type { ISlotResolver, ResolutionContext, ResolvedField } from '../contracts/types';

/**
 * Resolves static slots by copying text field to targetPath
 *
 * Responsibility: ONE - Copy static text to target location
 */
export class StaticResolver implements ISlotResolver {
  canResolve(slotType: string): boolean {
    return slotType === 'static';
  }

  resolve(item: any, context: ResolutionContext): ResolvedField | null {
    if (!item.text || !item.targetPath) {
      return null;
    }

    return {
      path: item.targetPath,
      value: item.text,
      slotType: 'static'
    };
  }
}
```

### Completion Criteria
- [ ] StaticResolver class implements ISlotResolver
- [ ] Simply copies text to targetPath (no dependencies)
- [ ] Handles missing text field (returns null)
- [ ] TypeScript compiles
- [ ] No other files modified
- [ ] No external dependencies

---

## Phase 4: Computed Resolver Domain

**Domain:** Formula evaluation and computed field resolution
**Goal:** Resolve `slot: "computed"` items by evaluating formulas safely

### Files to Create
- `src/resolution/core/formula-evaluator.ts` (NEW)
- `src/resolution/core/computed-resolver.ts` (NEW)

### Changes

**4.1 Formula Evaluator**
```typescript
import type { IFormulaEvaluator } from '../contracts/types';
import { getByPath } from '../../factory/utils/path-resolver';

/**
 * Safely evaluates computed formulas WITHOUT using eval()
 *
 * Responsibility: ONE - Parse and evaluate mathematical expressions
 *
 * Supports:
 * - Basic arithmetic: +, -, *, /
 * - Parentheses for grouping
 * - Path references: static.assessments.PHQ9
 * - Format hints: plain, deltaScore, percent
 */
export class FormulaEvaluator implements IFormulaEvaluator {
  evaluate(formula: string, context: Record<string, any>): number | string | boolean {
    // Replace path references with values
    const resolved = this.resolvePaths(formula, context);

    // Parse and evaluate safely (no eval!)
    return this.evaluateExpression(resolved);
  }

  format(value: any, format?: 'plain' | 'deltaScore' | 'percent'): string {
    if (typeof value !== 'number') {
      return String(value);
    }

    switch (format) {
      case 'deltaScore':
        const sign = value >= 0 ? '+' : '';
        return `${sign}${value}`;

      case 'percent':
        return `${(value * 100).toFixed(1)}%`;

      case 'plain':
      default:
        return String(value);
    }
  }

  private resolvePaths(formula: string, context: Record<string, any>): string {
    // Match path references like "static.assessments.PHQ9"
    const pathRegex = /\b([a-zA-Z_][a-zA-Z0-9_.[\]]*)\b/g;

    return formula.replace(pathRegex, (match) => {
      // If it's a number or operator, leave it
      if (/^[0-9]+$/.test(match)) return match;

      // Try to resolve as path
      const value = getByPath(context, match);
      return value !== undefined ? String(value) : match;
    });
  }

  private evaluateExpression(expr: string): number {
    // Simple recursive descent parser for arithmetic
    // Supports: +, -, *, /, (, )
    // This is safer than eval() and sufficient for MVP

    // Remove whitespace
    expr = expr.replace(/\s+/g, '');

    let pos = 0;

    const parseNumber = (): number => {
      const match = expr.slice(pos).match(/^-?\d+(\.\d+)?/);
      if (!match) throw new Error(`Expected number at position ${pos}`);
      pos += match[0].length;
      return parseFloat(match[0]);
    };

    const parseFactor = (): number => {
      if (expr[pos] === '(') {
        pos++; // skip '('
        const value = parseExpression();
        if (expr[pos] !== ')') throw new Error(`Expected ')' at position ${pos}`);
        pos++; // skip ')'
        return value;
      }
      return parseNumber();
    };

    const parseTerm = (): number => {
      let value = parseFactor();
      while (pos < expr.length && (expr[pos] === '*' || expr[pos] === '/')) {
        const op = expr[pos++];
        const right = parseFactor();
        value = op === '*' ? value * right : value / right;
      }
      return value;
    };

    const parseExpression = (): number => {
      let value = parseTerm();
      while (pos < expr.length && (expr[pos] === '+' || expr[pos] === '-')) {
        const op = expr[pos++];
        const right = parseTerm();
        value = op === '+' ? value + right : value - right;
      }
      return value;
    };

    return parseExpression();
  }
}
```

**4.2 Computed Resolver**
```typescript
import type { ISlotResolver, ResolutionContext, ResolvedField, IFormulaEvaluator } from '../contracts/types';

/**
 * Resolves computed slots by evaluating formulas
 *
 * Responsibility: ONE - Orchestrate formula evaluation for computed fields
 * Dependencies: IFormulaEvaluator (injected)
 */
export class ComputedResolver implements ISlotResolver {
  constructor(private formulaEvaluator: IFormulaEvaluator) {}

  canResolve(slotType: string): boolean {
    return slotType === 'computed';
  }

  resolve(item: any, context: ResolutionContext): ResolvedField | null {
    if (!item.formula || !item.targetPath) {
      return null;
    }

    try {
      // Evaluate formula with source data as context
      const rawValue = this.formulaEvaluator.evaluate(
        item.formula,
        context.sourceData
      );

      // Apply format if specified
      const value = item.format
        ? this.formulaEvaluator.format(rawValue, item.format)
        : rawValue;

      return {
        path: item.targetPath,
        value,
        slotType: 'computed'
      };
    } catch (error) {
      // Formula evaluation failed - return null, caller will log warning
      return null;
    }
  }
}
```

### Completion Criteria
- [ ] FormulaEvaluator implements IFormulaEvaluator
- [ ] Uses recursive descent parser (no eval!)
- [ ] Supports +, -, *, /, parentheses
- [ ] Resolves path references from source data
- [ ] Format hints work (deltaScore, percent)
- [ ] ComputedResolver uses injected evaluator (DI)
- [ ] TypeScript compiles
- [ ] No other files modified
- [ ] Error handling for invalid formulas

---

## Phase 5: Verbatim Resolver Domain

**Domain:** Verbatim quote extraction with provenance
**Goal:** Resolve `slot: "verbatim"` items by extracting quotes and tracking references

### Files to Create
- `src/resolution/core/verbatim-resolver.ts` (NEW)

### Changes

**Verbatim Resolver Implementation**
```typescript
import type { ISlotResolver, ResolutionContext, ResolvedField } from '../contracts/types';
import { getByPath } from '../../factory/utils/path-resolver';

/**
 * Resolves verbatim slots by extracting quotes with provenance tracking
 *
 * Responsibility: ONE - Extract verbatim quotes from source with ref tracking
 *
 * VerbatimRef format: "transcript:visit_123#t=40-55" or "document:intake#p=2"
 */
export class VerbatimResolver implements ISlotResolver {
  canResolve(slotType: string): boolean {
    return slotType === 'verbatim';
  }

  resolve(item: any, context: ResolutionContext): ResolvedField | null {
    if (!item.verbatimRef || !item.targetPath) {
      return null;
    }

    // Parse verbatimRef: "source:id#locator"
    const parsed = this.parseRef(item.verbatimRef);
    if (!parsed) return null;

    // Extract text from source
    const text = this.extractText(parsed, context.sourceData);
    if (!text) return null;

    // Return as {text, ref} object per spec
    return {
      path: item.targetPath,
      value: {
        text,
        ref: item.verbatimRef
      },
      slotType: 'verbatim'
    };
  }

  private parseRef(ref: string): { source: string; id: string; locator?: string } | null {
    // Format: "transcript:visit_123#t=40-55"
    const match = ref.match(/^([^:]+):([^#]+)(#(.+))?$/);
    if (!match) return null;

    return {
      source: match[1],      // "transcript"
      id: match[2],          // "visit_123"
      locator: match[4]      // "t=40-55"
    };
  }

  private extractText(
    parsed: { source: string; id: string; locator?: string },
    sourceData: any
  ): string | null {
    // Get the source document/transcript
    const sourceObj = getByPath(sourceData, `${parsed.source}.${parsed.id}`);
    if (!sourceObj) return null;

    // If no locator, return full text/content
    if (!parsed.locator) {
      return sourceObj.text || sourceObj.content || null;
    }

    // Parse time-based locator (t=40-55) or page-based (p=2)
    if (parsed.locator.startsWith('t=')) {
      return this.extractTimeRange(sourceObj, parsed.locator);
    } else if (parsed.locator.startsWith('p=')) {
      return this.extractPage(sourceObj, parsed.locator);
    }

    return null;
  }

  private extractTimeRange(sourceObj: any, locator: string): string | null {
    // Parse "t=40-55" (seconds)
    const match = locator.match(/^t=(\d+)-(\d+)$/);
    if (!match) return null;

    const start = parseInt(match[1], 10);
    const end = parseInt(match[2], 10);

    // Extract from segments/timeline if available
    if (sourceObj.segments) {
      return this.extractFromSegments(sourceObj.segments, start, end);
    }

    // Fallback: return first N characters as approximation
    if (sourceObj.text) {
      const charsPerSecond = 15; // rough estimate
      const startChar = start * charsPerSecond;
      const endChar = end * charsPerSecond;
      return sourceObj.text.slice(startChar, endChar);
    }

    return null;
  }

  private extractFromSegments(segments: any[], start: number, end: number): string {
    return segments
      .filter(seg => seg.timestamp >= start && seg.timestamp <= end)
      .map(seg => seg.text)
      .join(' ');
  }

  private extractPage(sourceObj: any, locator: string): string | null {
    // Parse "p=2"
    const match = locator.match(/^p=(\d+)$/);
    if (!match) return null;

    const page = parseInt(match[1], 10);

    if (sourceObj.pages && sourceObj.pages[page - 1]) {
      return sourceObj.pages[page - 1].text;
    }

    return null;
  }
}
```

### Completion Criteria
- [ ] VerbatimResolver implements ISlotResolver
- [ ] Parses verbatimRef format correctly
- [ ] Extracts text from transcript/document sources
- [ ] Supports time-based locators (t=40-55)
- [ ] Supports page-based locators (p=2)
- [ ] Returns {text, ref} object per spec
- [ ] TypeScript compiles
- [ ] No other files modified
- [ ] Graceful handling of missing sources

---

## Phase 6: NAS Builder Domain

**Domain:** Resolution orchestration
**Goal:** Coordinate all resolvers to build complete NAS snapshot

### Files to Create
- `src/resolution/core/nas-builder.ts` (NEW)
- `src/resolution/index.ts` (NEW)

### Changes

**6.1 NAS Builder (Orchestrator)**
```typescript
import type {
  INASBuilder,
  ISlotResolver,
  ResolutionContext,
  ResolutionResult,
  ResolvedField,
  ResolutionWarning
} from '../contracts/types';
import { setByPath } from './path-setter'; // Helper to set values at dot paths

/**
 * Orchestrates all slot resolvers to build complete NAS snapshot
 *
 * Responsibility: ONE - Walk template, apply resolvers, assemble NAS data
 * Dependencies: ISlotResolver[] (injected)
 *
 * Architecture:
 * - Receives array of resolvers via DI
 * - Walks template depth-first
 * - Delegates to appropriate resolver per slot type
 * - Collects all resolved fields
 * - Assembles into NAS data structure
 */
export class NASBuilder implements INASBuilder {
  constructor(private resolvers: ISlotResolver[]) {}

  async build(context: ResolutionContext): Promise<ResolutionResult> {
    const resolved: ResolvedField[] = [];
    const warnings: ResolutionWarning[] = [];
    const nasData: Record<string, any> = {};

    // Walk template layout depth-first
    this.walkLayout(
      context.template.layout,
      context,
      resolved,
      warnings
    );

    // Assemble resolved fields into NAS data structure
    for (const field of resolved) {
      try {
        setByPath(nasData, field.path, field.value);
      } catch (error) {
        warnings.push({
          componentId: 'unknown',
          slotId: 'unknown',
          slotType: field.slotType,
          path: field.path,
          reason: 'type_mismatch',
          message: `Failed to set value at path ${field.path}: ${error}`
        });
      }
    }

    return { nasData, resolved, warnings };
  }

  private walkLayout(
    components: any[],
    context: ResolutionContext,
    resolved: ResolvedField[],
    warnings: ResolutionWarning[]
  ): void {
    for (const component of components) {
      // Process content items
      if (component.content) {
        for (const item of component.content) {
          this.resolveItem(item, component.id, context, resolved, warnings);

          // Process nested listItems
          if (item.listItems) {
            for (const listItem of item.listItems) {
              this.resolveItem(listItem, component.id, context, resolved, warnings);
            }
          }

          // Process nested tableMap
          if (item.tableMap) {
            for (const colItem of item.tableMap) {
              this.resolveItem(colItem, component.id, context, resolved, warnings);
            }
          }
        }
      }

      // Recurse into children (subsections)
      if (component.children) {
        this.walkLayout(component.children, context, resolved, warnings);
      }
    }
  }

  private resolveItem(
    item: any,
    componentId: string,
    context: ResolutionContext,
    resolved: ResolvedField[],
    warnings: ResolutionWarning[]
  ): void {
    // Skip AI slots (handled by LLM, not resolution)
    if (item.slot === 'ai') return;

    // Find appropriate resolver
    const resolver = this.resolvers.find(r => r.canResolve(item.slot));
    if (!resolver) {
      warnings.push({
        componentId,
        slotId: item.id,
        slotType: item.slot,
        path: item.targetPath || 'unknown',
        reason: 'missing_source',
        message: `No resolver found for slot type: ${item.slot}`
      });
      return;
    }

    // Resolve the item
    const result = resolver.resolve(item, context);

    if (result) {
      resolved.push(result);
    } else {
      // Resolution failed (missing source, formula error, etc.)
      warnings.push({
        componentId,
        slotId: item.id,
        slotType: item.slot,
        path: item.targetPath || 'unknown',
        reason: 'missing_source',
        message: `Failed to resolve ${item.slot} slot: ${item.id}`
      });
    }
  }
}
```

**6.2 Path Setter Helper**
```typescript
/**
 * Helper to set values at dot-notation paths with array support
 *
 * Examples:
 * - setByPath(obj, "header.title", "My Title")
 * - setByPath(obj, "diagnoses[0].code", "F33.1")
 */
export function setByPath(obj: any, path: string, value: any): void {
  const segments = path.split('.');
  let current = obj;

  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i];

    // Handle array index: "diagnoses[0]"
    const arrayMatch = segment.match(/^(.+)\[(\d+)\]$/);
    if (arrayMatch) {
      const key = arrayMatch[1];
      const index = parseInt(arrayMatch[2], 10);

      if (!current[key]) current[key] = [];
      if (!current[key][index]) current[key][index] = {};
      current = current[key][index];
    } else {
      if (!current[segment]) current[segment] = {};
      current = current[segment];
    }
  }

  // Set final value
  const lastSegment = segments[segments.length - 1];
  const arrayMatch = lastSegment.match(/^(.+)\[(\d+)\]$/);

  if (arrayMatch) {
    const key = arrayMatch[1];
    const index = parseInt(arrayMatch[2], 10);
    if (!current[key]) current[key] = [];
    current[key][index] = value;
  } else {
    current[lastSegment] = value;
  }
}
```

**6.3 Barrel Export**
```typescript
// src/resolution/index.ts
export * from './contracts/types';
export { LookupResolver } from './core/lookup-resolver';
export { StaticResolver } from './core/static-resolver';
export { ComputedResolver } from './core/computed-resolver';
export { VerbatimResolver } from './core/verbatim-resolver';
export { FormulaEvaluator } from './core/formula-evaluator';
export { NASBuilder } from './core/nas-builder';
export { setByPath } from './core/path-setter';

/**
 * Factory function to create fully-wired NAS builder with all resolvers
 */
export function createNASBuilder(): NASBuilder {
  const formulaEvaluator = new FormulaEvaluator();

  const resolvers = [
    new LookupResolver(),
    new StaticResolver(),
    new ComputedResolver(formulaEvaluator),
    new VerbatimResolver()
  ];

  return new NASBuilder(resolvers);
}
```

### Completion Criteria
- [ ] NASBuilder implements INASBuilder
- [ ] Walks template layout depth-first
- [ ] Processes all content items (including listItems, tableMap)
- [ ] Delegates to appropriate resolver per slot type
- [ ] Collects resolved fields and warnings
- [ ] Assembles NAS data structure using setByPath
- [ ] Path setter handles dot notation and array indices
- [ ] Factory function wires all dependencies
- [ ] TypeScript compiles
- [ ] No other files modified
- [ ] All resolvers injected via constructor (DI)

---

## Phase 7: Pipeline Integration Domain

**Domain:** Pipeline orchestration updates
**Goal:** Integrate resolution into existing pipeline

### Files to Modify
- `src/pipeline/core/pipeline.ts` (MODIFY)
- `src/pipeline/types.ts` (MODIFY)

### Changes

**7.1 Update Pipeline Types**
```typescript
// Add to PipelineInputs interface
export interface PipelineInputs {
  template: any;
  sourceData?: any;        // NEW: Raw source data (optional, for resolution)
  nasData?: any;           // EXISTING: Pre-resolved NAS data (optional)
  generationOptions?: GenerationOptions;
}
```

**7.2 Update Pipeline Logic**

Add resolution step between NAS derivation and prompt composition:

```typescript
// In runPipeline function, after line ~85 (NAS derivation)

// 4. Resolve NAS data (if raw source data provided)
let resolvedNasData: any;

if (inputs.sourceData && !inputs.nasData) {
  log('Resolving NAS data from source...');

  const { createNASBuilder } = await import('../../resolution');
  const nasBuilder = createNASBuilder();

  const resolutionResult = await nasBuilder.build({
    template: inputs.template,
    sourceData: inputs.sourceData,
    nasSchema: nasSchema.schema
  });

  resolvedNasData = resolutionResult.nasData;

  // Log warnings
  if (resolutionResult.warnings.length > 0) {
    console.warn(`Resolution warnings (${resolutionResult.warnings.length}):`);
    resolutionResult.warnings.forEach(w => {
      console.warn(`  [${w.componentId}/${w.slotId}] ${w.message}`);
    });
  }

  log(`Resolved ${resolutionResult.resolved.length} fields`);
} else if (inputs.nasData) {
  // Use pre-resolved NAS data (backward compatible)
  resolvedNasData = inputs.nasData;
  log('Using pre-resolved NAS data');
} else {
  throw createError(
    'Either sourceData or nasData must be provided',
    'resolution'
  );
}

// Continue with existing prompt composition using resolvedNasData...
```

### Completion Criteria
- [ ] Pipeline accepts sourceData OR nasData (backward compatible)
- [ ] Resolution step runs when sourceData provided
- [ ] Pre-resolved nasData still works (tests don't break)
- [ ] Resolution warnings logged to console
- [ ] Error thrown if neither sourceData nor nasData provided
- [ ] TypeScript compiles
- [ ] Only pipeline files modified
- [ ] Existing tests still pass (use nasData)

---

## Phase 8: Integration Testing Domain

**Domain:** End-to-end verification
**Goal:** Verify resolution works with real template + source data

### Files to Create
- `src/tests/test-resolution.ts` (NEW)
- `src/tests/fixtures/source-data.json` (NEW)

### Changes

**8.1 Source Data Fixture**
```json
{
  "patient": {
    "name": "Michael Rodriguez",
    "dob": "1985-03-15",
    "mrn": "MRN-789456"
  },
  "visit": {
    "date": "2024-01-15",
    "facility": "Owensboro",
    "provider": "Anna Wakeland LPCC"
  },
  "assessments": {
    "current": {
      "PHQ9": 12,
      "GAD7": 8
    },
    "previous": {
      "PHQ9": 18,
      "GAD7": 14
    }
  },
  "diagnoses": [
    {
      "dsm5": { "code": "296.32" },
      "description": "Major Depressive Disorder, Recurrent, Moderate"
    }
  ],
  "transcript": {
    "current_session": {
      "text": "Patient reports improved mood and energy...",
      "segments": [
        {
          "timestamp": 45,
          "text": "I've been feeling a lot better lately"
        },
        {
          "timestamp": 50,
          "text": "The medication is really helping"
        }
      ]
    }
  }
}
```

**8.2 Resolution Test**
```typescript
import { createNASBuilder } from '../resolution';
import sourceData from './fixtures/source-data.json';

async function testResolution() {
  console.log('🧪 Testing NAS Resolution\n');

  // Simple template with all slot types
  const template = {
    id: 'test-resolution',
    name: 'Resolution Test',
    version: '1.0.0',
    style: { font: 'Inter', color: '#000', accent: '#00f', spacing: 8 },
    prompt: { system: 'Test', main: 'Test' },
    layout: [
      {
        id: 'header',
        type: 'section',
        content: [
          {
            slot: 'lookup',
            id: 'patient-name',
            lookup: 'patient.name',
            targetPath: 'header.patientName'
          },
          {
            slot: 'static',
            id: 'header-title',
            text: 'Clinical Note',
            targetPath: 'header.title'
          }
        ]
      },
      {
        id: 'assessments',
        type: 'section',
        content: [
          {
            slot: 'computed',
            id: 'phq9-delta',
            formula: 'assessments.current.PHQ9 - assessments.previous.PHQ9',
            format: 'deltaScore',
            targetPath: 'assessments.phq9Delta'
          },
          {
            slot: 'verbatim',
            id: 'patient-quote',
            verbatimRef: 'transcript.current_session#t=45-50',
            targetPath: 'subjective.clientQuote'
          }
        ]
      }
    ]
  };

  // Create builder and resolve
  const builder = createNASBuilder();

  const result = await builder.build({
    template,
    sourceData,
    nasSchema: {} // Simplified for test
  });

  // Verify results
  console.log('✅ Resolved Fields:', result.resolved.length);
  console.log('⚠️  Warnings:', result.warnings.length);
  console.log('\n📊 NAS Data:');
  console.log(JSON.stringify(result.nasData, null, 2));

  // Assertions
  const checks = [
    {
      name: 'Lookup: patient name',
      pass: result.nasData.header?.patientName === 'Michael Rodriguez'
    },
    {
      name: 'Static: header title',
      pass: result.nasData.header?.title === 'Clinical Note'
    },
    {
      name: 'Computed: PHQ9 delta',
      pass: result.nasData.assessments?.phq9Delta === '-6'
    },
    {
      name: 'Verbatim: quote with ref',
      pass: result.nasData.subjective?.clientQuote?.text?.includes('feeling a lot better')
    }
  ];

  console.log('\n🔍 Validation:');
  checks.forEach(check => {
    console.log(`  ${check.pass ? '✅' : '❌'} ${check.name}`);
  });

  const allPassed = checks.every(c => c.pass);
  console.log(`\n${allPassed ? '✅ All checks passed!' : '❌ Some checks failed'}`);
}

testResolution().catch(console.error);
```

### Completion Criteria
- [ ] Test creates realistic source data
- [ ] Tests all 4 slot types (lookup, static, computed, verbatim)
- [ ] Verifies resolved values are correct
- [ ] Checks that warnings are logged when appropriate
- [ ] All assertions pass
- [ ] Can run: `bun run src/tests/test-resolution.ts`
- [ ] No other files modified

---

## Phase 9: Pipeline Integration Testing Domain

**Domain:** Full pipeline with resolution
**Goal:** Verify entire pipeline works with source data instead of pre-resolved NAS

### Files to Modify
- `src/tests/test-biopsych-pipeline.ts` (MODIFY)

### Changes

**Add Resolution Path Test**

After existing test, add new test function:

```typescript
/**
 * Test pipeline with raw source data (uses resolution)
 */
async function testPipelineWithSourceData() {
  console.log('\n🧪 Testing pipeline WITH source data resolution\n');

  const sourceData = {
    patient: {
      name: 'Michael Rodriguez',
      dob: '1985-03-15',
      mrn: 'MRN-789456'
    },
    visit: {
      date: '2024-01-15',
      facility: 'Owensboro',
      provider: 'Anna Wakeland LPCC'
    },
    assessments: {
      phq9: { current: 12, previous: 18 },
      gad7: { current: 8, previous: 14 },
      ace: { score: 3 },
      audit: { score: 2 },
      dast10: { score: 0 }
    }
    // ... more fields
  };

  const result = await runPipeline({
    template: biopsychTemplate,
    sourceData,  // NEW: Use source data instead of nasData
    options: {
      generationOptions: {
        model: 'gpt-5',
        temperature: 0.2
      }
    }
  });

  console.log('✅ Pipeline with source data resolution completed!');
  console.log('HTML length:', result.html.length);
}
```

### Completion Criteria
- [ ] Test uses sourceData instead of nasData
- [ ] Pipeline successfully resolves NAS from source
- [ ] AI generation works with resolved NAS
- [ ] HTML output generated correctly
- [ ] Backward compatibility: old test (with nasData) still works
- [ ] Can run both tests in sequence
- [ ] Only test file modified

---

## Integration Phase

After all phases complete:

### Final Verification

**1. Consistency Check**
- [ ] Resolution layer follows SOR/SOD/DI principles
- [ ] Each resolver has ONE responsibility
- [ ] All dependencies injected via constructors
- [ ] No direct imports of external systems

**2. Pipeline Works Both Ways**
- [ ] Pipeline with sourceData (new path) works
- [ ] Pipeline with nasData (old path) still works
- [ ] Backward compatibility maintained

**3. All Slot Types Supported**
- [ ] lookup resolution works
- [ ] computed formulas work
- [ ] static text works
- [ ] verbatim quotes work

**4. Documentation**
- [ ] All public interfaces documented
- [ ] Usage examples in comments
- [ ] Architecture decisions captured

---

## Error Handling Strategy

### If Phase Fails

**Phase 1-3 Failures** (Contracts, Lookup, Static):
- Review type definitions for correctness
- Check that interfaces follow spec
- Verify no circular dependencies

**Phase 4 Failures** (Computed):
- Test formula parser with simple expressions first
- Verify path resolution works
- Check format functions separately

**Phase 5 Failures** (Verbatim):
- Test ref parsing separately
- Verify source data structure matches expectations
- Check time/page extraction logic

**Phase 6 Failures** (NAS Builder):
- Test path setter separately
- Verify template walking logic
- Check resolver delegation

**Phase 7 Failures** (Pipeline):
- Ensure backward compatibility
- Test with both sourceData and nasData paths
- Verify error messages are clear

**Phase 8-9 Failures** (Testing):
- Check test data matches expected structure
- Verify assertions are correct
- Add debug logging to see actual vs expected

---

## Success Criteria

**All phases complete when**:
- [ ] Resolution domain fully implemented (`/src/resolution/`)
- [ ] All 4 slot types resolve correctly (lookup, computed, static, verbatim)
- [ ] Pipeline accepts sourceData and resolves NAS automatically
- [ ] Backward compatibility maintained (nasData still works)
- [ ] Integration tests pass with both sourceData and nasData
- [ ] No regressions in existing functionality
- [ ] TypeScript compiles with no errors
- [ ] Architecture follows SOR/SOD/DI principles

---

## Notes

**Why This Approach:**
1. **Follows SOR** - Source data is system of record, resolvers query it
2. **Follows SOD** - Each resolver handles ONE slot type, NAS builder orchestrates
3. **Follows DI** - All resolvers injected into NAS builder, no hard dependencies
4. **Incremental** - Each phase adds one piece, builds on previous work
5. **Testable** - Each phase can be verified independently

**Design Decisions:**
- Formula evaluator uses recursive descent parser (safe, no eval)
- Verbatim resolver supports transcript timestamps and document pages
- Path setter mirrors path resolver for consistency
- NAS builder walks template same way as derivers (consistent pattern)
- Factory function wires dependencies (simple DI without container)

**Future Enhancements** (not in this plan):
- Advanced formula functions (min, max, avg)
- Verbatim ref validation against source schema
- Computed field type inference
- Resolution caching for repeated paths
- Parallel resolution for independent fields
