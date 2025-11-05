import type { Component, ContentItem } from '../../derivation/types';
import type { NasSnapshot } from '../../types/payloads';
import type {
  INASBuilder,
  ISlotResolver,
  ResolutionContext,
  ResolutionResult,
  ResolvedField,
  ResolutionWarning,
  UnresolvedSlot
} from '../contracts/types';
import { setByPath } from './path-setter';

/**
 * Internal bookkeeping structure tracking every non-AI slot encountered during resolution.
 * Enables post-processing to ensure each slot either produced data or emitted a warning.
 */
interface ExpectedSlot {
  componentId: string;
  slotId: string;
  slotType: ContentItem['slot'];
  targetPath?: string;
}

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
    const nasData: NasSnapshot = {};
    const expectedSlots: ExpectedSlot[] = [];

    // Walk template layout depth-first
    this.walkLayout(
      context.template.layout,
      context,
      resolved,
      warnings,
      expectedSlots
    );

    // Assemble resolved fields into NAS data structure
    for (const field of resolved) {
      try {
        setByPath(nasData, field.path, field.value);
      } catch (error: unknown) {
        warnings.push({
          componentId: 'unknown',
          slotId: 'unknown',
          slotType: field.slotType,
          path: field.path,
          reason: 'type_mismatch',
          message: `Failed to set value at path ${field.path}: ${extractErrorMessage(error)}`
        });
      }
    }

    const unresolvedSlots = findUnresolvedSlots(expectedSlots, resolved, warnings);

    for (const slot of unresolvedSlots) {
      warnings.push({
        componentId: slot.componentId,
        slotId: slot.slotId,
        slotType: slot.slotType,
        path: slot.targetPath || 'unknown',
        reason: 'unresolved_slot',
        message: `Slot ${slot.slotId} (${slot.slotType}) was not resolved and produced no data`,
      });
    }

    return { nasData, resolved, warnings, unresolvedSlots };
  }

  private walkLayout(
    components: Component[],
    context: ResolutionContext,
    resolved: ResolvedField[],
    warnings: ResolutionWarning[],
    expectedSlots: ExpectedSlot[]
  ): void {
    for (const component of components) {
      // Process content items
      if (component.content) {
        for (const item of component.content) {
          this.resolveItem(item, component.id, context, resolved, warnings, expectedSlots);

          // Process nested listItems
          if (item.listItems) {
            for (const listItem of item.listItems) {
              this.resolveItem(listItem, component.id, context, resolved, warnings, expectedSlots);
            }
          }

          // Process nested tableMap
          if (item.tableMap) {
            for (const colItem of Object.values(item.tableMap) as ContentItem[]) {
              this.resolveItem(colItem, component.id, context, resolved, warnings, expectedSlots);
            }
          }
        }
      }

      // Recurse into children (subsections)
      if (component.children) {
        this.walkLayout(component.children, context, resolved, warnings, expectedSlots);
      }
    }
  }

  private resolveItem(
    item: ContentItem,
    componentId: string,
    context: ResolutionContext,
    resolved: ResolvedField[],
    warnings: ResolutionWarning[],
    expectedSlots: ExpectedSlot[]
  ): void {
    if (item.slot !== 'ai') {
      expectedSlots.push({
        componentId,
        slotId: item.id,
        slotType: item.slot,
        targetPath: item.targetPath,
      });
    }

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

/**
 * Determine which expected slots failed to produce resolved data and have no prior warnings.
 *
 * @param expected - All slots encountered while walking the template
 * @param resolved - Successfully resolved fields
 * @param warnings - Warnings already emitted during resolution
 * @returns Slots that require follow-up (will become unresolved warnings)
 */
function findUnresolvedSlots(
  expected: ExpectedSlot[],
  resolved: ResolvedField[],
  warnings: ResolutionWarning[]
): UnresolvedSlot[] {
  if (expected.length === 0) {
    return [];
  }

  const stripWildcards = (path: string): string => path.replace(/\[\]/g, '');
  const resolvedRoots = new Set(
    resolved.map((field) => stripWildcards(field.path))
  );

  const warnedSlots = new Set(
    warnings.map((warning) => `${warning.componentId}:${warning.slotId}`)
  );

  return expected.filter((slot) => {
    if (!slot.targetPath) {
      return false;
    }

    const normalizedTarget = stripWildcards(slot.targetPath);
    const isSatisfied = Array.from(resolvedRoots).some((resolvedPath) => {
      return (
        normalizedTarget === resolvedPath ||
        normalizedTarget.startsWith(`${resolvedPath}.`)
      );
    });

    if (isSatisfied) {
      return false;
    }

    if (warnedSlots.has(`${slot.componentId}:${slot.slotId}`)) {
      return false;
    }

    return true;
  });
}

function extractErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null) {
    const message = (error as Record<string, unknown>).message;
    if (typeof message === 'string') {
      return message;
    }
  }
  return String(error);
}
