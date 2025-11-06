/**
 * Field Guide Builder Tests
 *
 * Domain: composition/__tests__
 * Responsibility: Verify field guide extraction and diagnostics.
 */

import { describe, expect, it } from 'bun:test';
import { buildFieldGuide } from '../core/field-guide-builder';
import type { Component } from '../../derivation/types';

describe('buildFieldGuide', () => {
  it('reports missing dependency metadata as an error', () => {
    const layout: Component[] = [
      {
        id: 'section-1',
        type: 'section',
        content: [
          {
            id: 'ai-no-deps',
            slot: 'ai',
            outputPath: 'assessment.summary',
          },
        ],
      },
    ];

    const result = buildFieldGuide(layout);

    expect(result.entries).toHaveLength(1);
    expect(result.issues.some(issue => issue.check === 'field-guide.dependencies' && issue.severity === 'error')).toBe(true);
  });

  it('sanitizes style hints and warns on unsupported keys', () => {
    const layout: Component[] = [
      {
        id: 'section-2',
        type: 'section',
        content: [
          {
            id: 'ai-style',
            slot: 'ai',
            outputPath: 'plan.interventions[]',
            aiDeps: ['nas.path'],
            styleHints: {
              tone: 'clinical',
              unexpected: true,
              tableCell: {
                columnIndex: 1,
                unknown: 'value',
              },
            },
          },
        ],
      },
    ];

    const result = buildFieldGuide(layout);

    expect(result.entries[0]?.style).toEqual({
      tone: 'clinical',
      tableCell: { columnIndex: 1 },
    });
    expect(result.issues.filter(issue => issue.check === 'field-guide.style').length).toBeGreaterThan(0);
  });
});
