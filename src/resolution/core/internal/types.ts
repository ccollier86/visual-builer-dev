/**
 * Resolution Core Internal Types
 *
 * Domain: resolution/core/internal
 * Responsibility: Shared helper type aliases used within the NAS builder implementation.
 *
 * SOR: Central repository for NAS builder internal metadata types.
 * SOD: Provides reusable type definitions without side effects.
 * DI: Imported by resolution core modules that need these shared shapes.
 */

import type { ContentItem } from '../../../derivation/types';
import type { ResolutionWarning } from '../../contracts/types';

/** Metadata describing an expected non-AI slot discovered during traversal. */
export type ExpectedSlot = {
  componentId: string;
  slotId: string;
  slotType: ContentItem['slot'];
  targetPath?: string;
  required: boolean;
};

/** Parameters required to emit a structured resolution warning. */
export type WarningParams = {
  componentId: string;
  slotId: string;
  slotType: string;
  path: string;
  reason: ResolutionWarning['reason'];
  severity: ResolutionWarning['severity'];
  message: string;
  details?: unknown;
};
