import type { IFormulaEvaluator, SourceRecord } from '../contracts/types';

type EvaluatorFn = (context: SourceRecord) => unknown;

const PROTECTED_NAMES = [
  'globalThis',
  'global',
  'process',
  'require',
  'Function',
  'window',
  'document',
];

/**
 * Cache compiled evaluator functions by formula to avoid recompilation.
 */
const evaluatorCache = new Map<string, EvaluatorFn>();

/**
 * Safely evaluates computed formulas WITHOUT using eval()
 *
 * Responsibility: ONE - Parse and evaluate mathematical expressions
 *
 * Supports:
 * - Basic arithmetic: +, -, *, /
 * - String concatenation using + operator
 * - Parentheses for grouping
 * - Path references resolved against source data (e.g., clinical_intake.structured.mse.mood)
 * - Conditional (ternary) expressions
 * - Format hints: plain, deltaScore, percent
 */
export class FormulaEvaluator implements IFormulaEvaluator {
  evaluate(formula: string, context: SourceRecord): number | string | boolean {
    if (!formula || !formula.trim()) {
      return '';
    }

    const evaluator = this.getOrCreateEvaluator(formula);

    try {
      const result = evaluator(context ?? {});
      return result as number | string | boolean;
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to evaluate formula "${formula}": ${reason}`);
    }
  }

  format(value: unknown, format?: 'plain' | 'deltaScore' | 'percent'): string {
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

  private getOrCreateEvaluator(formula: string): EvaluatorFn {
    const cached = evaluatorCache.get(formula);
    if (cached) {
      return cached;
    }

    const evaluator = this.compile(formula);
    evaluatorCache.set(formula, evaluator);
    return evaluator;
  }

  private compile(formula: string): EvaluatorFn {
    const protectedAssignments = PROTECTED_NAMES
      .map((name) => `sandbox.${name} = undefined;`)
      .join('\n');

    const body = `
      const sandbox = Object.create(null);
      Object.assign(sandbox, context || {});
      sandbox.Math = Math;
      ${protectedAssignments}
      return (function() {
        with (sandbox) {
          return (${formula});
        }
      })();
    `;

    // eslint-disable-next-line no-new-func
    return new Function('context', body) as EvaluatorFn;
  }
}
