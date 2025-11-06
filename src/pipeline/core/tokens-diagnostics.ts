/**
 * Token Diagnostics Helper
 *
 * Domain: pipeline/core
 * Responsibility: Analyse design token provenance so the pipeline can surface
 * which values originate from defaults, template style overrides, or caller-provided
 * overrides. Helps debugging theme issues while keeping the orchestrator slim.
 */

import type { DesignTokens } from '../../tokens';
import {
	PipelineWarningSeverity,
	type TokenDiagnostics,
	type TokenDiagnosticsEntry,
	type TokenValueSource,
} from '../types';

type TokenRecord = Record<string, unknown>;

/**
 * Generate diagnostics describing the origin of each design token.
 */
export function diagnoseTokens(
	defaults: DesignTokens,
	templateApplied: DesignTokens,
	overrides: DesignTokens | undefined,
	finalTokens: DesignTokens
): TokenDiagnostics {
	const entries: TokenDiagnosticsEntry[] = [];
	collectDiagnostics('', defaults, templateApplied, overrides, finalTokens, entries);
	return { entries };
}

function collectDiagnostics(
	path: string,
	defaults: unknown,
	templateApplied: unknown,
	overrides: unknown,
	finalValue: unknown,
	entries: TokenDiagnosticsEntry[]
): void {
	if (isRecord(finalValue)) {
		const keys = new Set<string>([
			...Object.keys(finalValue),
			...keysOf(templateApplied),
			...keysOf(overrides),
			...keysOf(defaults),
		]);
		for (const key of keys) {
			const childPath = path ? `${path}.${key}` : key;
			collectDiagnostics(
				childPath,
				(defaults as TokenRecord | undefined)?.[key],
				(templateApplied as TokenRecord | undefined)?.[key],
				(overrides as TokenRecord | undefined)?.[key],
				(finalValue as TokenRecord | undefined)?.[key],
				entries
			);
		}
		return;
	}

	const source = resolveSource(defaults, templateApplied, overrides, finalValue);
	const severity = determineSeverity(source, defaults, templateApplied, overrides, finalValue);
	const message = buildMessage(source, severity, defaults, finalValue);
	entries.push({ path, source, severity, message });
}

function resolveSource(
	defaults: unknown,
	templateApplied: unknown,
	overrides: unknown,
	finalValue: unknown
): TokenValueSource {
	if (overrides !== undefined && !isRecord(overrides)) {
		return 'override';
	}

	if (
		templateApplied !== undefined &&
		!isRecord(templateApplied) &&
		!isEqual(templateApplied, defaults)
	) {
		return 'template';
	}

	if (!isEqual(finalValue, defaults)) {
		return 'template';
	}

	return 'default';
}

function determineSeverity(
	source: TokenValueSource,
	defaults: unknown,
	templateApplied: unknown,
	overrides: unknown,
	finalValue: unknown
): PipelineWarningSeverity {
	if (
		source === 'override' &&
		overrides !== undefined &&
		!isRecord(overrides) &&
		!isEqual(overrides, finalValue)
	) {
		return PipelineWarningSeverity.Warning;
	}

	if (
		source === 'template' &&
		templateApplied !== undefined &&
		!isRecord(templateApplied) &&
		isEqual(templateApplied, defaults)
	) {
		return PipelineWarningSeverity.Warning;
	}

	return PipelineWarningSeverity.Info;
}

function buildMessage(
	source: TokenValueSource,
	severity: PipelineWarningSeverity,
	defaults: unknown,
	finalValue: unknown
): string | undefined {
	if (severity === PipelineWarningSeverity.Warning) {
		return 'Token override did not apply cleanly; verify template and caller overrides.';
	}

	if (source === 'default' && isEqual(finalValue, defaults)) {
		return 'Token uses system default value.';
	}

	return undefined;
}

function keysOf(value: unknown): string[] {
	if (!isRecord(value)) return [];
	return Object.keys(value);
}

function isRecord(value: unknown): value is TokenRecord {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isEqual(a: unknown, b: unknown): boolean {
	return JSON.stringify(a) === JSON.stringify(b);
}
