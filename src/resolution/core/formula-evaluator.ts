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
