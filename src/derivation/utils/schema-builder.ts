/**
 * Schema Builder Utility
 *
 * Pure functions for building JSON Schema nodes from template constraints.
 * Supports objects, arrays, strings, numbers, and booleans with constraints.
 */

import { DuplicatePathError } from '../errors';
import { CUSTOM_STRING_CONSTRAINTS } from '../types';
import type { AddPropertyOptions, ContentConstraints, SchemaNode } from '../types';

/**
 * Create an object schema node
 *
 * @param additionalProperties - Whether to allow additional properties (default: false)
 * @returns A new object schema node
 */
export function createObjectNode(additionalProperties = false): SchemaNode {
	return {
		type: 'object',
		properties: {},
		required: [],
		additionalProperties,
	};
}

/**
 * Create an array schema node
 *
 * @param itemsNode - The schema for array items
 * @returns A new array schema node
 */
export function createArrayNode(itemsNode: SchemaNode): SchemaNode {
	return {
		type: 'array',
		items: itemsNode,
	};
}

/**
 * Create a string schema node with optional constraints
 *
 * @param constraints - Constraints from the template
 * @returns A new string schema node
 */
export function createStringNode(constraints?: ContentConstraints): SchemaNode {
	const node: SchemaNode = {
		type: 'string',
	};

	if (!constraints) {
		return node;
	}

	// Map template constraints to JSON Schema properties
	if (constraints.enum) {
		node.enum = constraints.enum;
	}

	if (constraints.pattern) {
		node.pattern = constraints.pattern;
	}

	if (constraints.minWords !== undefined) {
		node['x-minWords'] = constraints.minWords;
	}

	if (constraints.maxWords !== undefined) {
		node['x-maxWords'] = constraints.maxWords;
	}

	if (constraints.minSentences !== undefined) {
		node['x-minSentences'] = constraints.minSentences;
	}

	if (constraints.maxSentences !== undefined) {
		node['x-maxSentences'] = constraints.maxSentences;
	}

	return node;
}

/**
 * Create a number schema node with optional constraints
 *
 * @param constraints - Constraints from the template (unused for now, but future-proof)
 * @returns A new number schema node
 */
export function createNumberNode(_constraints?: ContentConstraints): SchemaNode {
	return {
		type: 'number',
	};
}

/**
 * Create a boolean schema node
 *
 * @returns A new boolean schema node
 */
export function createBooleanNode(): SchemaNode {
	return {
		type: 'boolean',
	};
}

/**
 * Add a property to an object node
 *
 * @param objectNode - The object node to modify
 * @param propertyName - Name of the property to add
 * @param propertySchema - Schema for the property
 * @param isRequired - Whether this property is required
 */
export function addProperty(
	objectNode: SchemaNode,
	propertyName: string,
	propertySchema: SchemaNode,
	options: AddPropertyOptions = {}
): void {
	if (objectNode.type !== 'object') {
		throw new Error('Can only add properties to object nodes');
	}

	if (!objectNode.properties) {
		objectNode.properties = {};
	}

	if (Object.prototype.hasOwnProperty.call(objectNode.properties, propertyName)) {
		const context = {
			path: options.path ?? propertyName,
			sourceId: options.sourceId,
			propertyName,
		};
		throw new DuplicatePathError(
			`Duplicate schema property encountered at path "${context.path}"`,
			context
		);
	}

	objectNode.properties[propertyName] = propertySchema;

	const isRequired = options.isRequired ?? false;

	if (isRequired) {
		if (!objectNode.required) {
			objectNode.required = [];
		}
		if (!objectNode.required.includes(propertyName)) {
			objectNode.required.push(propertyName);
		}
	}
}

/**
 * Merge two schema nodes
 *
 * Used by RPS merger to combine AIS and NAS nodes at the same path.
 * Throws on type conflicts.
 *
 * @param nodeA - First schema node
 * @param nodeB - Second schema node
 * @param path - Current path (for error messages)
 * @returns Merged schema node
 * @throws Error if nodes have incompatible types
 */
export function mergeNodes(nodeA: SchemaNode, nodeB: SchemaNode, path: string): SchemaNode {
	// Type conflict check
	if (nodeA.type !== nodeB.type) {
		throw new Error(
			`Type conflict at path "${path}": ` +
				`one schema says "${nodeA.type}", other says "${nodeB.type}"`
		);
	}

	const merged: SchemaNode = { ...nodeA };

	// Merge based on type
	if (nodeA.type === 'object') {
		// Merge properties recursively
		merged.properties = { ...(nodeA.properties || {}) };

		if (nodeB.properties) {
			for (const [key, schema] of Object.entries(nodeB.properties)) {
				if (merged.properties![key]) {
					// Property exists in both - merge recursively
					merged.properties![key] = mergeNodes(merged.properties![key], schema, `${path}.${key}`);
				} else {
					// Property only in nodeB - add it
					merged.properties![key] = schema;
				}
			}
		}

		// Union required fields
		merged.required = [
			...(nodeA.required || []),
			...(nodeB.required || []).filter((r) => !nodeA.required?.includes(r)),
		];

		// Keep stricter additionalProperties (false is stricter than true)
		merged.additionalProperties =
			nodeA.additionalProperties === false || nodeB.additionalProperties === false ? false : true;
	} else if (nodeA.type === 'array') {
		// Merge array items recursively
		if (nodeA.items && nodeB.items) {
			merged.items = mergeNodes(nodeA.items, nodeB.items, `${path}[]`);
		} else {
			merged.items = nodeA.items || nodeB.items;
		}
	} else if (nodeA.type === 'string') {
		const mergedEnum = mergeEnums(nodeA.enum, nodeB.enum, path);
		if (mergedEnum) {
			merged.enum = mergedEnum;
		} else {
			delete merged.enum;
		}

		const mergedPattern = mergePatterns(nodeA.pattern, nodeB.pattern, path);
		if (mergedPattern) {
			merged.pattern = mergedPattern;
		} else {
			delete merged.pattern;
		}

		const mergedMinWords = mergeLowerBound(nodeA['x-minWords'], nodeB['x-minWords']);
		const mergedMaxWords = mergeUpperBound(nodeA['x-maxWords'], nodeB['x-maxWords']);
		assertBoundsConsistency(
			path,
			CUSTOM_STRING_CONSTRAINTS.MIN_WORDS,
			mergedMinWords,
			CUSTOM_STRING_CONSTRAINTS.MAX_WORDS,
			mergedMaxWords
		);
		if (mergedMinWords !== undefined) {
			merged['x-minWords'] = mergedMinWords;
		} else {
			delete merged['x-minWords'];
		}
		if (mergedMaxWords !== undefined) {
			merged['x-maxWords'] = mergedMaxWords;
		} else {
			delete merged['x-maxWords'];
		}

		const mergedMinSentences = mergeLowerBound(nodeA['x-minSentences'], nodeB['x-minSentences']);
		const mergedMaxSentences = mergeUpperBound(nodeA['x-maxSentences'], nodeB['x-maxSentences']);
		assertBoundsConsistency(
			path,
			CUSTOM_STRING_CONSTRAINTS.MIN_SENTENCES,
			mergedMinSentences,
			CUSTOM_STRING_CONSTRAINTS.MAX_SENTENCES,
			mergedMaxSentences
		);
		if (mergedMinSentences !== undefined) {
			merged['x-minSentences'] = mergedMinSentences;
		} else {
			delete merged['x-minSentences'];
		}
		if (mergedMaxSentences !== undefined) {
			merged['x-maxSentences'] = mergedMaxSentences;
		} else {
			delete merged['x-maxSentences'];
		}
	} else if (nodeA.type === 'number') {
		const mergedMinimum = mergeLowerBound(nodeA.minimum, nodeB.minimum);
		const mergedMaximum = mergeUpperBound(nodeA.maximum, nodeB.maximum);
		assertBoundsConsistency(path, 'minimum', mergedMinimum, 'maximum', mergedMaximum);

		if (mergedMinimum !== undefined) {
			merged.minimum = mergedMinimum;
		} else {
			delete merged.minimum;
		}
		if (mergedMaximum !== undefined) {
			merged.maximum = mergedMaximum;
		} else {
			delete merged.maximum;
		}
	} else {
		// For boolean or other primitive nodes without constraints, prefer stricter truthy values.
		if (nodeB.enum && !merged.enum) {
			merged.enum = nodeB.enum;
		}
	}

	return merged;
}

/**
 * Compute compatible enum values shared by both schema nodes.
 * Throws if no overlap exists, because merged schema would otherwise be unsatisfiable.
 */
function mergeEnums(enumA: string[] | undefined, enumB: string[] | undefined, path: string): string[] | undefined {
	if (!enumA && !enumB) {
		return undefined;
	}
	if (!enumA) {
		return enumB;
	}
	if (!enumB) {
		return enumA;
	}

	const intersection = enumA.filter((value) => enumB.includes(value));

	if (intersection.length === 0) {
		throw new Error(`Enum conflict at path "${path}": no overlapping values between schemas`);
	}

	return intersection;
}

/**
 * Ensure pattern constraints match exactly; conflicting patterns cannot be merged safely.
 */
function mergePatterns(patternA: string | undefined, patternB: string | undefined, path: string): string | undefined {
	if (!patternA && !patternB) {
		return undefined;
	}
	if (!patternA) {
		return patternB;
	}
	if (!patternB) {
		return patternA;
	}
	if (patternA !== patternB) {
		throw new Error(
			`Pattern conflict at path "${path}": patterns "${patternA}" and "${patternB}" are incompatible`
		);
	}
	return patternA;
}

/**
 * Merge lower-bound numeric/string constraints by selecting the stricter (highest) value.
 */
function mergeLowerBound(valueA?: number, valueB?: number): number | undefined {
	if (valueA === undefined) {
		return valueB;
	}
	if (valueB === undefined) {
		return valueA;
	}
	return Math.max(valueA, valueB);
}

/**
 * Merge upper-bound numeric/string constraints by selecting the stricter (lowest) value.
 */
function mergeUpperBound(valueA?: number, valueB?: number): number | undefined {
	if (valueA === undefined) {
		return valueB;
	}
	if (valueB === undefined) {
		return valueA;
	}
	return Math.min(valueA, valueB);
}

/**
 * Validate that merged min/max bounds remain logically consistent.
 */
function assertBoundsConsistency(
	path: string,
	minKey: string,
	minValue: number | undefined,
	maxKey: string,
	maxValue: number | undefined
): void {
	if (minValue !== undefined && maxValue !== undefined && minValue > maxValue) {
		throw new Error(
			`Constraint conflict at path "${path}": ${minKey} (${minValue}) exceeds ${maxKey} (${maxValue})`
		);
	}
}
