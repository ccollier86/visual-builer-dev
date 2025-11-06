/**
 * Resolution Domain - NAS Builder
 *
 * Domain: resolution/core
 * Responsibility: Walk the template, delegate slot resolution, and assemble the NAS snapshot.
 *
 * SOR: Primary orchestrator for deriving NAS data from source inputs.
 * SOD: Coordinates resolver execution, warning aggregation, and merge safety.
 * DI: Depends on resolver implementations injected via constructor.
 */

import type { Component, ContentItem } from '../../derivation/types';
import type { NasSnapshot } from '../../types/payloads';
import type {
  INASBuilder,
  ISlotResolver,
  ResolutionBuildParams,
  ResolutionContext,
  ResolutionResult,
  ResolvedField,
  ResolutionWarning,
  ResolutionWarningSeverity,
  UnresolvedSlot,
} from '../contracts/types';
import type { ExpectedSlot, WarningParams } from './internal/types';
import { setByPath } from './path-setter';

function createWarning(params: WarningParams): ResolutionWarning {
  return {
    componentId: params.componentId,
    slotId: params.slotId,
    slotType: params.slotType,
    path: params.path,
    reason: params.reason,
    severity: params.severity,
    message: params.message,
    details: params.details,
  };
}

export class NASBuilder implements INASBuilder {
  constructor(private readonly resolvers: ISlotResolver[]) {}

  async build(params: ResolutionBuildParams): Promise<ResolutionResult> {
    const nasData: NasSnapshot = {};
    const context: ResolutionContext = {
      ...params,
      partialNas: nasData,
    };

    const resolved: ResolvedField[] = [];
    const warnings: ResolutionWarning[] = [];
    const expectedSlots: ExpectedSlot[] = [];

    this.walkLayout(params.template.layout, context, resolved, warnings, expectedSlots);

    const unresolvedSlots = findUnresolvedSlots(expectedSlots, resolved, warnings);
    for (const slot of unresolvedSlots) {
      warnings.push(
        createWarning({
          componentId: slot.componentId,
          slotId: slot.slotId,
          slotType: slot.slotType,
          path: slot.targetPath || 'unknown',
          reason: 'unresolved_slot',
          severity: slot.required ? 'error' : 'warning',
          message: `Slot ${slot.slotId} (${slot.slotType}) was not resolved and produced no data`,
        })
      );
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
      if (component.content) {
        for (const item of component.content) {
          this.resolveItem(item, component.id, context, resolved, warnings, expectedSlots);

          if (item.listItems) {
            for (const listItem of item.listItems) {
              this.resolveItem(listItem, component.id, context, resolved, warnings, expectedSlots);
            }
          }

          if (item.tableMap) {
            const tableItems = Array.isArray(item.tableMap)
              ? item.tableMap
              : Object.values(item.tableMap);

            for (const colItem of tableItems) {
              this.resolveItem(colItem, component.id, context, resolved, warnings, expectedSlots);
            }
          }
        }
      }

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
        required: Boolean(item.constraints?.required),
      });
    }

    if (item.slot === 'ai') {
      return;
    }

    const resolver = this.resolvers.find(r => r.canResolve(item.slot));
    if (!resolver) {
      warnings.push(
        createWarning({
          componentId,
          slotId: item.id,
          slotType: item.slot,
          path: item.targetPath || 'unknown',
          reason: 'missing_source',
          severity: 'error',
          message: `No resolver found for slot type: ${item.slot}`,
        })
      );
      return;
    }

    const result = resolver.resolve(item, context);

    if (result) {
      try {
        setByPath(context.partialNas as NasSnapshot, result.path, result.value);
        resolved.push(result);
      } catch (error: unknown) {
        warnings.push(
          createWarning({
            componentId,
            slotId: item.id,
            slotType: item.slot,
            path: result.path,
            reason: 'type_mismatch',
            severity: 'error',
            message: `Failed to set value at path ${result.path}: ${extractErrorMessage(error)}`,
          })
        );
      }
    } else {
      const severity: ResolutionWarningSeverity = item.constraints?.required ? 'error' : 'warning';
      let reason: ResolutionWarning['reason'] = 'missing_source';
      if (item.slot === 'computed') {
        reason = 'formula_error';
      } else if (item.slot === 'verbatim') {
        reason = 'invalid_ref';
      }
      warnings.push(
        createWarning({
          componentId,
          slotId: item.id,
          slotType: item.slot,
          path: item.targetPath || 'unknown',
          reason,
          severity,
          message: `Failed to resolve ${item.slot} slot: ${item.id}`,
        })
      );
    }
  }
}

function findUnresolvedSlots(
  expected: ExpectedSlot[],
  resolved: ResolvedField[],
  warnings: ResolutionWarning[]
): UnresolvedSlot[] {
  if (expected.length === 0) {
    return [];
  }

  const stripWildcards = (path: string): string => path.replace(/\[\]/g, '');
  const resolvedRoots = new Set(resolved.map(field => stripWildcards(field.path)));
  const warnedSlots = new Set(warnings.map(warning => `${warning.componentId}:${warning.slotId}`));

  return expected
    .filter(slot => {
      if (!slot.targetPath) {
        return false;
      }

      const normalizedTarget = stripWildcards(slot.targetPath);
      const isSatisfied = Array.from(resolvedRoots).some(resolvedPath => {
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
    })
    .map(slot => ({
      componentId: slot.componentId,
      slotId: slot.slotId,
      slotType: slot.slotType,
      targetPath: slot.targetPath,
      required: slot.required,
    }));
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
