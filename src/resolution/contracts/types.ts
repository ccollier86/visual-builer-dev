/**
 * Resolution Domain - Type Contracts
 *
 * Domain: resolution/contracts
 * Responsibility: Shared interfaces for NAS derivation, resolver contexts, and diagnostics.
 *
 * SOR: Centralised definitions consumed by all resolution components.
 * SOD: Pure types with no side effects.
 * DI: Imported by builders/resolvers to keep dependencies explicit.
 */

import type { ContentItem, DerivedSchema, NoteTemplate } from '../../derivation/types';
import type { NasSnapshot } from '../../types/payloads';

/**
 * Generic record representing structured source data objects.
 */
export type SourceRecord = Record<string, unknown>;

/**
 * Raw source data provided at runtime (before resolution)
 */
export interface SourceData {
  patient?: SourceRecord;
  visit?: SourceRecord;
  assessments?: SourceRecord;
  diagnoses?: SourceRecord[];
  transcript?: SourceRecord;
  [key: string]: unknown;
}

/**
 * Resolution context passed to all resolvers
 */
export interface ResolutionContext {
  /** Validated note template */
  template: NoteTemplate;
  /** Raw input data provided by the host application */
  sourceData: SourceData;
  /** Target NAS schema derived from the template */
  nasSchema: DerivedSchema;
  /** Partial NAS snapshot built so far (read-only to preserve purity) */
  partialNas: Readonly<NasSnapshot>;
}

/**
 * Result of a single field resolution
 */
export interface ResolvedField {
  path: string;            // Target path in NAS
  value: unknown;          // Resolved value
  slotType: 'lookup' | 'computed' | 'static' | 'verbatim';
}

/**
 * Resolution result with diagnostics
 */
export interface ResolutionResult {
  nasData: NasSnapshot;             // Complete NAS snapshot
  resolved: ResolvedField[];         // Successfully resolved fields
  warnings: ResolutionWarning[];     // Missing sources, failed formulas, etc.
  unresolvedSlots: UnresolvedSlot[]; // Slots requiring attention after resolution
}

/**
 * Diagnostic warning during resolution
 */
export interface ResolutionWarning {
  componentId: string;
  slotId: string;
  slotType: string;
  path: string;
  severity: ResolutionWarningSeverity;
  reason:
    | 'missing_source'
    | 'formula_error'
    | 'invalid_ref'
    | 'type_mismatch'
    | 'unresolved_slot';
  message: string;
  details?: unknown;
}

export type ResolutionWarningSeverity = 'info' | 'warning' | 'error';

/**
 * Details describing a slot that remained unresolved without existing warnings.
 */
export interface UnresolvedSlot {
  componentId: string;
  slotId: string;
  slotType: string;
  targetPath?: string;
}

/**
 * Interface for slot-specific resolvers
 */
export interface ISlotResolver {
  /**
   * Resolve a single content item
   */
  resolve(item: ContentItem, context: ResolutionContext): ResolvedField | null;

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
  evaluate(formula: string, context: SourceRecord): number | string | boolean;

  /**
   * Format the result according to format hint
   */
  format(value: unknown, format?: 'plain' | 'deltaScore' | 'percent'): string;
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
