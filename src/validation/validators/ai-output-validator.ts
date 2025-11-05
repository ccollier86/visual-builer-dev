import { createHash } from 'crypto';
import type { DerivedSchema } from '../../derivation/types';
import { makeAjvWithTextKeywords } from '../core/ajv-setup';
import type { SchemaValidator, ValidationResult } from '../types';

const validatorCache = new Map<string, SchemaValidator>();

/**
 * Factory for runtime AI output validators.
 *
 * Compiles a per-template AIS schema once and returns a reusable validator
 * function that reports structured validation metadata. Keeps schema compilation
 * in the validation domain and allows callers to inject the validator where needed.
 *
 * @param schema - Derived AIS schema for the active template
 * @returns SchemaValidator function that can be reused across pipeline steps
 */
export function createAIOutputValidator(schema: DerivedSchema): SchemaValidator {
  const ajv = makeAjvWithTextKeywords();
  const validate = ajv.compile(schema);

  return (doc: unknown): ValidationResult => {
    const ok = validate(doc);
    const errors = validate.errors ? [...validate.errors] : [];

    return {
      ok,
      errors,
    };
  };
}

/**
 * Retrieve (or lazily compile) a cached AI output validator for the schema.
 */
export function getAIOutputValidator(schema: DerivedSchema): SchemaValidator {
  const cacheKey = deriveCacheKey(schema);
  const cached = validatorCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const validator = createAIOutputValidator(schema);
  validatorCache.set(cacheKey, validator);
  return validator;
}

/**
 * Clear cached validators. Useful in tests.
 */
export function clearAIOutputValidatorCache(): void {
  validatorCache.clear();
}

function deriveCacheKey(schema: DerivedSchema): string {
  if (schema.$id) {
    return `id:${schema.$id}`;
  }

  const serialized = JSON.stringify(schema);
  return `hash:${createHash('sha256').update(serialized).digest('hex')}`;
}
