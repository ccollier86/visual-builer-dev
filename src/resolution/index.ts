// Export all types
export * from './contracts/types';

// Export all resolvers
export { LookupResolver } from './core/lookup-resolver';
export { StaticResolver } from './core/static-resolver';
export { ComputedResolver } from './core/computed-resolver';
export { VerbatimResolver } from './core/verbatim-resolver';
export { FormulaEvaluator } from './core/formula-evaluator';

// Export NAS builder and utilities
export { NASBuilder } from './core/nas-builder';
export { setByPath } from './core/path-setter';

// Import classes for factory function
import { LookupResolver } from './core/lookup-resolver';
import { StaticResolver } from './core/static-resolver';
import { ComputedResolver } from './core/computed-resolver';
import { VerbatimResolver } from './core/verbatim-resolver';
import { FormulaEvaluator } from './core/formula-evaluator';
import { NASBuilder } from './core/nas-builder';

/**
 * Factory function to create fully-wired NAS builder with all resolvers
 */
export function createNASBuilder(): NASBuilder {
  const formulaEvaluator = new FormulaEvaluator();

  const resolvers = [
    new LookupResolver(),
    new StaticResolver(),
    new ComputedResolver(formulaEvaluator),
    new VerbatimResolver()
  ];

  return new NASBuilder(resolvers);
}
