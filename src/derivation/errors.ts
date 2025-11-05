import type { DuplicatePathErrorContext } from './types';

/**
 * Error thrown when attempting to register duplicate schema properties.
 */
export class DuplicatePathError extends Error {
  readonly context: DuplicatePathErrorContext;

  constructor(message: string, context: DuplicatePathErrorContext) {
    super(message);
    this.name = 'DuplicatePathError';
    this.context = context;
  }
}
