/**
 * Context Slicer Tests
 *
 * Domain: composition/__tests__
 * Responsibility: Ensure NAS context slicing respects dependency metadata.
 */

import { describe, expect, it } from 'bun:test';
import { sliceContext } from '../core/context-slicer';
import type { FieldGuideEntry } from '../types';

describe('sliceContext', () => {
  it('captures requested NAS paths and emits warnings for missing data', () => {
    const nasSnapshot = {
      subjective: {
        mood: 'stable',
      },
    };

    const fieldGuide: FieldGuideEntry[] = [
      {
        path: 'assessment.summary',
        dependencies: [
          { path: 'subjective.mood', scope: 'nas' },
          { path: 'objective.missing', scope: 'nas' },
        ],
      },
    ];

    const result = sliceContext(nasSnapshot, fieldGuide);

    expect(result.nasSlices).toEqual({ subjective: { mood: 'stable' } });
    expect(result.issues.some(issue => issue.check === 'context-slice.missing')).toBe(true);
  });

  it('returns an error when no NAS data can be sliced', () => {
    const fieldGuide: FieldGuideEntry[] = [
      {
        path: 'assessment.summary',
        dependencies: [{ path: 'assessment.nowhere', scope: 'nas' }],
      },
    ];

    const result = sliceContext({}, fieldGuide);

    expect(result.nasSlices).toEqual({});
    expect(result.issues.some(issue => issue.check === 'context-slice.empty' && issue.severity === 'error')).toBe(true);
  });
});
