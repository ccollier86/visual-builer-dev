import type {
  INASBuilder,
  ISlotResolver,
  ResolutionContext,
  ResolutionResult,
  ResolvedField,
  ResolutionWarning
} from '../contracts/types';
import { setByPath } from './path-setter';

/**
 * Orchestrates all slot resolvers to build complete NAS snapshot
 *
 * Responsibility: ONE - Walk template, apply resolvers, assemble NAS data
 * Dependencies: ISlotResolver[] (injected)
 *
 * Architecture:
 * - Receives array of resolvers via DI
 * - Walks template depth-first
 * - Delegates to appropriate resolver per slot type
 * - Collects all resolved fields
 * - Assembles into NAS data structure
 */
export class NASBuilder implements INASBuilder {
  constructor(private resolvers: ISlotResolver[]) {}

  async build(context: ResolutionContext): Promise<ResolutionResult> {
    const resolved: ResolvedField[] = [];
    const warnings: ResolutionWarning[] = [];
    const nasData: Record<string, any> = {};

    // Walk template layout depth-first
    this.walkLayout(
      context.template.layout,
      context,
      resolved,
      warnings
    );

    // Assemble resolved fields into NAS data structure
    for (const field of resolved) {
      try {
        setByPath(nasData, field.path, field.value);
      } catch (error) {
        warnings.push({
          componentId: 'unknown',
          slotId: 'unknown',
          slotType: field.slotType,
          path: field.path,
          reason: 'type_mismatch',
          message: `Failed to set value at path ${field.path}: ${error}`
        });
      }
    }

    return { nasData, resolved, warnings };
  }

  private walkLayout(
    components: any[],
    context: ResolutionContext,
    resolved: ResolvedField[],
    warnings: ResolutionWarning[]
  ): void {
    for (const component of components) {
      // Process content items
      if (component.content) {
        for (const item of component.content) {
          this.resolveItem(item, component.id, context, resolved, warnings);

          // Process nested listItems
          if (item.listItems) {
            for (const listItem of item.listItems) {
              this.resolveItem(listItem, component.id, context, resolved, warnings);
            }
          }

          // Process nested tableMap
          if (item.tableMap) {
            for (const colItem of item.tableMap) {
              this.resolveItem(colItem, component.id, context, resolved, warnings);
            }
          }
        }
      }

      // Recurse into children (subsections)
      if (component.children) {
        this.walkLayout(component.children, context, resolved, warnings);
      }
    }
  }

  private resolveItem(
    item: any,
    componentId: string,
    context: ResolutionContext,
    resolved: ResolvedField[],
    warnings: ResolutionWarning[]
  ): void {
    // Skip AI slots (handled by LLM, not resolution)
    if (item.slot === 'ai') return;

    // Find appropriate resolver
    const resolver = this.resolvers.find(r => r.canResolve(item.slot));
    if (!resolver) {
      warnings.push({
        componentId,
        slotId: item.id,
        slotType: item.slot,
        path: item.targetPath || 'unknown',
        reason: 'missing_source',
        message: `No resolver found for slot type: ${item.slot}`
      });
      return;
    }

    // Resolve the item
    const result = resolver.resolve(item, context);

    if (result) {
      resolved.push(result);
    } else {
      // Resolution failed (missing source, formula error, etc.)
      warnings.push({
        componentId,
        slotId: item.id,
        slotType: item.slot,
        path: item.targetPath || 'unknown',
        reason: 'missing_source',
        message: `Failed to resolve ${item.slot} slot: ${item.id}`
      });
    }
  }
}
