import { afterEach, describe, expect, it } from 'bun:test';
import {
  clearAIOutputValidatorCache,
  createAIOutputValidator,
  getAIOutputValidator,
} from '../validators/ai-output-validator';
import type { DerivedSchema } from '../../derivation/types';

const schema: DerivedSchema = {
  $id: 'https://example.com/test-schema',
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  title: 'Test Schema',
  description: 'Simple schema for validator unit tests',
  type: 'object',
  additionalProperties: false,
  properties: {
    note: { type: 'string', enum: ['A', 'B'] },
    length: { type: 'number', minimum: 0 },
  },
  required: ['note'],
};

describe('createAIOutputValidator', () => {
  afterEach(() => {
    clearAIOutputValidatorCache();
  });

  it('accepts payloads that comply with the schema', () => {
    const validator = createAIOutputValidator(schema);
    const result = validator({ note: 'A', length: 5 });

    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects payloads that violate the schema', () => {
    const validator = createAIOutputValidator(schema);
    const result = validator({ note: 'C', length: -1 });

    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('caches compiled validators by schema id', () => {
    const validatorA = getAIOutputValidator(schema);
    const validatorB = getAIOutputValidator(schema);

    expect(validatorA).toBe(validatorB);
  });

  it('creates a new validator when schema content changes', () => {
    const validatorA = getAIOutputValidator(schema);
    const modifiedSchema: DerivedSchema = {
      ...schema,
      $id: `${schema.$id}#modified`,
    };

    const validatorB = getAIOutputValidator(modifiedSchema);

    expect(validatorA).not.toBe(validatorB);
  });
});
