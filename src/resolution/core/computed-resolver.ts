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
