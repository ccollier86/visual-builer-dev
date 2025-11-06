/**
 * Pipeline Warning Utilities
 *
 * Domain: pipeline/core
 * Responsibility: Centralise warning severity mapping and guard evaluation
 * so the pipeline orchestrator remains focused on coordination logic.
 */

import {
  PipelineWarningSeverity,
  type PipelineWarning,
  type MergeConflictWarning,
  type WarningGuardOptions,
  type MergeGuardOptions,
} from '../types';
import type { TemplateLintIssue } from '../../validation';
import type { ResolutionWarning } from '../../resolution';

/**
 * Map template lint severities (error/warning/info) to pipeline warning severity enum.
 */
export function mapTemplateSeverity(severity: string): PipelineWarningSeverity {
  switch (severity) {
    case 'error':
      return PipelineWarningSeverity.Error;
    case 'warning':
      return PipelineWarningSeverity.Warning;
    default:
      return PipelineWarningSeverity.Info;
  }
}

/**
 * Map resolution warning severities to pipeline severity scale.
 */
export function mapResolutionSeverity(severity: string): PipelineWarningSeverity {
  switch (severity) {
    case 'error':
      return PipelineWarningSeverity.Error;
    case 'warning':
      return PipelineWarningSeverity.Warning;
    default:
      return PipelineWarningSeverity.Info;
  }
}

const SEVERITY_ORDER: Record<PipelineWarningSeverity, number> = {
  [PipelineWarningSeverity.Info]: 0,
  [PipelineWarningSeverity.Warning]: 1,
  [PipelineWarningSeverity.Error]: 2,
};

/**
 * Determine whether a set of warnings should fail fast based on guard configuration.
 */
export function shouldFailGuard<T>(
  guard: WarningGuardOptions | undefined,
  warnings: PipelineWarning<T>[]
): boolean {
  if (!guard || warnings.length === 0) return false;
  if (guard.failOnWarning) return true;
  if (guard.failOnSeverity) {
    const threshold = SEVERITY_ORDER[guard.failOnSeverity];
    return warnings.some((warning) => SEVERITY_ORDER[warning.severity] >= threshold);
  }
  return false;
}

/**
 * Determine strict merge guard behaviour.
 */
export function shouldFailMerge(
  guard: MergeGuardOptions | undefined,
  warnings: PipelineWarning<MergeConflictWarning>[]
): boolean {
  if (!guard || warnings.length === 0) return false;
  if (guard.strict) return true;
  if (guard.severity) {
    const threshold = SEVERITY_ORDER[guard.severity];
    return warnings.some((warning) => SEVERITY_ORDER[warning.severity] >= threshold);
  }
  return false;
}

export type TemplateWarning = PipelineWarning<TemplateLintIssue>;
export type ResolutionPipelineWarning = PipelineWarning<ResolutionWarning>;
