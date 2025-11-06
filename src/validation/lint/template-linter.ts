/**
 * Template Linting - Rule Orchestrator
 *
 * Domain: validation/lint
 * Responsibility: Traverse template layout and delegate to specialised rule modules.
 *
 * SOR: Single entry point for template lint results.
 * SOD: Delegates to targeted rule helpers (AI deps, tables, style hints).
 * DI: Pure functions with no side effects; callers supply the template to analyse.
 */

import type { NoteTemplate, Component, ContentItem } from '../../derivation/types';
import type { TemplateLintIssue, TemplateLintResult } from '../types';
import { LintContext } from './shared';
import { lintAiSlot } from './rules/ai-slot';
import { lintStyleHints } from './rules/style-hints';
import { lintTableComponent, lintTableMap } from './rules/table';

/**
 * Produce lint findings for the supplied template.
 *
 * @param template - Author-defined note template already validated against the schema.
 * @returns Aggregate lint result including blocking errors and advisory warnings.
 */
export function lintNoteTemplate(template: NoteTemplate): TemplateLintResult {
	const issues: TemplateLintIssue[] = [];

	const report = (issue: TemplateLintIssue) => {
		issues.push(issue);
	};

	const visitComponent = (component: Component, parentPath: string[]) => {
		const componentPathParts = [...parentPath, component.id];
		const componentPath = componentPathParts.join('.');

		const context: LintContext = {
			componentPath,
			componentId: component.id,
			tableColumns: undefined,
		};

		const previousColumns = context.tableColumns;

		if (component.type === 'table') {
			const columns = lintTableComponent(component, context, report);
			context.tableColumns = columns;
		} else {
			context.tableColumns = previousColumns;
		}

		if (Array.isArray(component.content)) {
			component.content.forEach(item =>
				lintContentItem(item, component, context, report)
			);
		}

		if (Array.isArray(component.children)) {
			component.children.forEach(child =>
				visitComponent(child, componentPathParts)
			);
		}
	};

	template.layout.forEach(component => visitComponent(component, []));

	const errors = issues.filter(issue => issue.severity === 'error');
	const warnings = issues.filter(issue => issue.severity !== 'error');

	return { issues, errors, warnings };
}

/**
 * Apply lint rules to an individual content item.
 */
function lintContentItem(
	item: ContentItem,
	component: Component,
	context: LintContext,
	report: (issue: TemplateLintIssue) => void
): void {
	if (item.slot === 'ai') {
		lintAiSlot(item, component, context, report);
	}

	if (item.styleHints && typeof item.styleHints === 'object') {
		lintStyleHints(
			item.styleHints as Record<string, unknown>,
			context,
			item.id,
			report,
			context.tableColumns
		);
	}

	if (Array.isArray(item.listItems)) {
		item.listItems.forEach(nested =>
			lintContentItem(nested, component, context, report)
		);
	}

	if (item.tableMap) {
		lintTableMap(item.tableMap, component, context, report, lintContentItem);
	}
}
