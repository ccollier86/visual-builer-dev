import { describe, expect, it } from 'bun:test';
import { FormulaEvaluator } from '../core/formula-evaluator';

const evaluator = new FormulaEvaluator();

describe('FormulaEvaluator', () => {
  it('evaluates numeric arithmetic expressions', () => {
    const context = {
      assessments: {
        phq9: { score: 21 },
      },
    };

    const result = evaluator.evaluate('assessments.phq9.score - 6', context);
    expect(result).toBe(15);
  });

  it('supports string concatenation with literals and paths', () => {
    const context = {
      patient: {
        firstName: 'Michael',
        lastName: 'Rodriguez',
      },
    };

    const result = evaluator.evaluate("'Patient: ' + patient.firstName + ' ' + patient.lastName", context);
    expect(result).toBe('Patient: Michael Rodriguez');
  });

  it('handles conditional expressions with object lookups', () => {
    const context = {
      patient_intake: {
        providers: {
          pcp: {
            name: 'Dr. Sarah Chen',
            phone: '(270) 555-3200',
          },
        },
      },
    };

    const result = evaluator.evaluate(
      "patient_intake.providers.pcp ? 'PCP: ' + patient_intake.providers.pcp.name : 'No PCP'",
      context
    );

    expect(result).toBe('PCP: Dr. Sarah Chen');
  });
});
