/**
 * Lint a prompt bundle for issues beyond JSON Schema validation
 *
 * Responsibility: ONE - Validate bundle semantics per spec
 *
 * Implements checks from Doc 3, lines 225-295:
 * 1. Coverage: fieldGuide matches AI item count
 * 2. Path validity: paths exist in AIS
 * 3. Constraint harmony: constraints match AIS
 * 4. Dependencies resolvable: deps exist in context
 * 5. Message roles: system then user
 */
import type { Component, DerivedSchema, NoteTemplate, SchemaNode } from '../../derivation/types';
import type { FieldDependency, LintIssue, LintResult, PromptBundle } from '../types';

export function lintPromptBundle(
	bundle: PromptBundle,
	aiSchema: DerivedSchema,
	template: NoteTemplate
): LintResult {
	const issues: LintIssue[] = [];

	// Check 1: Coverage - fieldGuide.length === AI items count
	const aiItemsCount = countAIItems(template);
	if (bundle.fieldGuide.length !== aiItemsCount) {
		issues.push({
			severity: 'error',
			check: 'coverage',
			message: `Field guide has ${bundle.fieldGuide.length} entries but template has ${aiItemsCount} AI items`,
		});
	}

	// Check 2: Path validity - every fieldGuide.path exists in AIS
	for (const fg of bundle.fieldGuide) {
		if (!pathExistsInSchema(aiSchema, fg.path)) {
			issues.push({
				severity: 'error',
				check: 'path-validity',
				message: `Field guide path not in AIS: ${fg.path}`,
				path: fg.path,
			});
		}
	}

	// Check 3: Constraint harmony - fieldGuide constraints match AIS
	for (const fg of bundle.fieldGuide) {
		const aisNode = getSchemaNode(aiSchema, fg.path);
		if (fg.constraints && aisNode) {
			// Check pattern
			if (fg.constraints.pattern && aisNode.pattern) {
				if (fg.constraints.pattern !== aisNode.pattern) {
					issues.push({
						severity: 'warning',
						check: 'constraint-harmony',
						message: `Pattern mismatch at ${fg.path}: field guide has "${fg.constraints.pattern}", AIS has "${aisNode.pattern}"`,
						path: fg.path,
					});
				}
			}
			// Check enum
			if (fg.constraints.enum && aisNode.enum) {
				const fgSet = new Set(fg.constraints.enum);
				const aisSet = new Set(aisNode.enum);
				const fgArray = Array.from(fgSet);
				if (fgSet.size !== aisSet.size || !fgArray.every((v) => aisSet.has(v))) {
					issues.push({
						severity: 'warning',
						check: 'constraint-harmony',
						message: `Enum mismatch at ${fg.path}`,
						path: fg.path,
					});
				}
			}
		}
	}

	// Check 4: Dependencies resolvable - each dependency exists in context.nasSlices
  for (const fg of bundle.fieldGuide) {
    const dependencies = fg.dependencies ?? [];
    if (dependencies.length === 0) {
      issues.push({
        severity: 'error',
        check: 'dependencies',
        message: `AI field ${fg.path} is missing dependency metadata.`,
        path: fg.path,
      });
      continue;
    }

    dependencies.forEach((dep) => {
      if (!dependencyResolvable(dep, bundle)) {
        issues.push({
          severity: 'warning',
          check: 'dependencies',
          message: `Dependency not present in context (${dep.scope}): ${dep.path} (required by ${fg.path})`,
          path: fg.path,
        });
      }
    });
  }


	// Check 5: Message roles - system then user
	if (bundle.messages.length < 2) {
		issues.push({
			severity: 'error',
			check: 'message-roles',
			message: 'Bundle must have at least 2 messages (system and user)',
		});
	} else {
		if (bundle.messages[0]?.role !== 'system') {
			issues.push({
				severity: 'error',
				check: 'message-roles',
				message: `First message must be system role, got: ${bundle.messages[0]?.role}`,
			});
		}
		if (bundle.messages[1]?.role !== 'user') {
			issues.push({
				severity: 'error',
				check: 'message-roles',
				message: `Second message must be user role, got: ${bundle.messages[1]?.role}`,
			});
		}

		const userContent = bundle.messages[1]?.content ?? '';
		if (!userContent.includes('Return a single JSON object')) {
			issues.push({
				severity: 'error',
				check: 'response-contract',
				message: 'User message must include the JSON response contract directive.',
			});
		}
	}

	// Separate errors and warnings
	const errors = issues.filter((i) => i.severity === 'error');
	const warnings = issues.filter((i) => i.severity === 'warning');

	return {
		ok: errors.length === 0,
		issues,
		errors,
		warnings,
	};
}

// Helper: Count AI items in template
function countAIItems(template: NoteTemplate): number {
	let count = 0;

	const walkLayout = (components: Component[]): void => {
		for (const comp of components) {
			if (comp.content) {
				for (const item of comp.content) {
					if (item.slot === 'ai') count++;

					// Check nested listItems
					if (item.listItems) {
						for (const listItem of item.listItems) {
							if (listItem.slot === 'ai') count++;
						}
					}

					// Check nested tableMap
					if (item.tableMap) {
						const tableItems = Array.isArray(item.tableMap)
							? item.tableMap
							: Object.values(item.tableMap);

						for (const colItem of tableItems) {
							if (colItem.slot === 'ai') count++;
						}
					}
				}
			}

			if (comp.children) {
				walkLayout(comp.children ?? []);
			}
		}
	};

	walkLayout(template.layout);
	return count;
}

function dependencyResolvable(dep: FieldDependency, bundle: PromptBundle): boolean {
	if (dep.scope === 'nas') {
		return pathResolvable(bundle.context?.nasSlices, dep.path);
	}

	return pathResolvable(bundle.context?.factPack, dep.path);
}

// Helper: Check if path exists in schema
function pathExistsInSchema(schema: DerivedSchema, path: string): boolean {
	return getSchemaNode(schema, path) !== null;
}

// Helper: Get schema node at path
function getSchemaNode(schema: DerivedSchema, path: string): SchemaNode | null {
	const segments = path.split('.');
	let properties = schema.properties as Record<string, unknown> | undefined;
	let node: SchemaNode | null = null;

	for (let i = 0; i < segments.length; i++) {
		if (!properties) {
			return null;
		}

		const segment = segments[i];
		const cleanSegment = segment.replace(/\[\]$/, '');
		const candidate = properties[cleanSegment];

		if (!isSchemaNode(candidate)) {
			return null;
		}

		node = candidate;

		if (i === segments.length - 1) {
			return node;
		}

		if (node.type === 'array' && node.items) {
			properties = node.items.properties as Record<string, unknown> | undefined;
		} else {
			properties = node.properties as Record<string, unknown> | undefined;
		}
	}

	return node;
}

// Helper: Check if path is resolvable in context
function pathResolvable(context: unknown, path: string): boolean {
	if (!context) return false;

	const segments = path.split('.');
	let current: unknown = context;

	for (const segment of segments) {
		const cleanSegment = segment.replace(/\[\]$/, '');

		if (Array.isArray(current)) {
			const nextValues = current
				.map((value) =>
					isObjectLike(value) ? (value as Record<string, unknown>)[cleanSegment] : undefined
				)
				.filter((value) => value !== undefined);

			if (nextValues.length === 0) {
				return false;
			}

			current = nextValues[0];
			continue;
		}

		if (!isObjectLike(current)) {
			return false;
		}

		const next = (current as Record<string, unknown>)[cleanSegment];
		if (next === undefined) {
			return false;
		}
		current = next;
	}

	return true;
}

function isSchemaNode(value: unknown): value is SchemaNode {
	return (
		typeof value === 'object' && value !== null && 'type' in (value as Record<string, unknown>)
	);
}

function isObjectLike(value: unknown): value is Record<string, unknown> | unknown[] {
	return typeof value === 'object' && value !== null;
}
