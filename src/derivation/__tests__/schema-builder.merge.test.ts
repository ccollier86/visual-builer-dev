import { describe, expect, it } from 'bun:test';
import { mergeNodes } from '../utils/schema-builder';
import type { SchemaNode } from '../types';

describe('mergeNodes constraint reconciliation', () => {
  it('intersects enums when both schemas specify enumerations', () => {
    const nodeA: SchemaNode = { type: 'string', enum: ['a', 'b', 'c'] };
    const nodeB: SchemaNode = { type: 'string', enum: ['b', 'c', 'd'] };

    const merged = mergeNodes(nodeA, nodeB, 'field');
    expect(merged.enum).toEqual(['b', 'c']);
  });

  it('throws when enums have no overlap', () => {
    const nodeA: SchemaNode = { type: 'string', enum: ['a'] };
    const nodeB: SchemaNode = { type: 'string', enum: ['b'] };

    expect(() => mergeNodes(nodeA, nodeB, 'field')).toThrow('Enum conflict');
  });

  it('throws when patterns differ', () => {
    const nodeA: SchemaNode = { type: 'string', pattern: '^foo$' };
    const nodeB: SchemaNode = { type: 'string', pattern: '^bar$' };

    expect(() => mergeNodes(nodeA, nodeB, 'field')).toThrow('Pattern conflict');
  });

  it('selects stricter word constraints and detects contradictions', () => {
    const nodeA: SchemaNode = { type: 'string', 'x-minWords': 10, 'x-maxWords': 80 };
    const nodeB: SchemaNode = { type: 'string', 'x-minWords': 5, 'x-maxWords': 60 };

    const merged = mergeNodes(nodeA, nodeB, 'body');
    expect(merged['x-minWords']).toBe(10);
    expect(merged['x-maxWords']).toBe(60);

    const conflictingMin: SchemaNode = { type: 'string', 'x-minWords': 50 };
    const conflictingMax: SchemaNode = { type: 'string', 'x-maxWords': 10 };

    expect(() => mergeNodes(conflictingMin, conflictingMax, 'body')).toThrow('Constraint conflict');
  });

  it('applies tighter numeric bounds', () => {
    const nodeA: SchemaNode = { type: 'number', minimum: 0, maximum: 100 };
    const nodeB: SchemaNode = { type: 'number', minimum: 10, maximum: 90 };

    const merged = mergeNodes(nodeA, nodeB, 'score');
    expect(merged.minimum).toBe(10);
    expect(merged.maximum).toBe(90);
  });
});
