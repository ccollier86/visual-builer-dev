import type { ISlotResolver, ResolutionContext, ResolvedField } from '../contracts/types';

/**
 * Resolves static slots by copying text field to targetPath
 *
 * Responsibility: ONE - Copy static text to target location
 */
export class StaticResolver implements ISlotResolver {
  canResolve(slotType: string): boolean {
    return slotType === 'static';
  }

  resolve(item: any, context: ResolutionContext): ResolvedField | null {
    if (!item.text || !item.targetPath) {
      return null;
    }

    return {
      path: item.targetPath,
      value: item.text,
      slotType: 'static'
    };
  }
}
