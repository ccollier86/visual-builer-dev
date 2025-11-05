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
