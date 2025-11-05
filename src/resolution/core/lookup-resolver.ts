import type { ISlotResolver, ResolutionContext, ResolvedField } from '../contracts/types';
import { getByPath } from '../../factory/utils/path-resolver';

/**
 * Resolves lookup slots by extracting values from source data
 *
 * Responsibility: ONE - Extract value from lookup path, place at targetPath
 */
export class LookupResolver implements ISlotResolver {
  canResolve(slotType: string): boolean {
    return slotType === 'lookup';
  }

  resolve(item: any, context: ResolutionContext): ResolvedField | null {
    if (!item.lookup || !item.targetPath) {
      return null;
    }

    // Extract from source data using lookup path
    const value = getByPath(context.sourceData, item.lookup);

    if (value === undefined) {
      // Missing source - return null, caller will log warning
      return null;
    }

    return {
      path: item.targetPath,
      value,
      slotType: 'lookup'
    };
  }
}
