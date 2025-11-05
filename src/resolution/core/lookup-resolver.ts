import type { ContentItem } from '../../derivation/types';
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

  resolve(item: ContentItem, context: ResolutionContext): ResolvedField | null {
    if (!item.lookup || !item.targetPath) {
      return null;
    }

    // Handle array wildcard paths (e.g., diagnoses[].code)
    if (item.lookup.includes('[]') && item.targetPath.includes('[]')) {
      return this.resolveArrayProjection(item.lookup, item.targetPath, context);
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

  private resolveArrayProjection(
    lookupPath: string,
    targetPath: string,
    context: ResolutionContext
  ): ResolvedField | null {
    const sourceWildcardIndex = lookupPath.indexOf('[]');
    const targetWildcardIndex = targetPath.indexOf('[]');
    if (sourceWildcardIndex < 0 || targetWildcardIndex < 0) {
      return null;
    }

    const sourceRoot = lookupPath.slice(0, sourceWildcardIndex);
    const sourceTail = lookupPath.slice(sourceWildcardIndex + 2).replace(/^\./, '');
    const targetRoot = targetPath.slice(0, targetWildcardIndex);
    const targetTail = targetPath.slice(targetWildcardIndex + 2).replace(/^\./, '');

    const sourceArray = getByPath(context.sourceData, sourceRoot);
    if (!Array.isArray(sourceArray)) {
      return null;
    }

    const projected = sourceArray.map(entry => {
      const raw = sourceTail ? getByPath(entry, sourceTail) : entry;
      if (targetTail.length === 0) {
        return raw;
      }
      return { [targetTail]: raw };
    });

    return {
      path: targetRoot,
      value: projected,
      slotType: 'lookup'
    };
  }
}
