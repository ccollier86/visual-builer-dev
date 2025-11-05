/**
 * Schema Builder Utility
 *
 * Pure functions for building JSON Schema nodes from template constraints.
 * Supports objects, arrays, strings, numbers, and booleans with constraints.
 */

import type { ContentConstraints, SchemaNode } from '../types';

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
	isRequired = false
): void {
	if (objectNode.type !== 'object') {
		throw new Error('Can only add properties to object nodes');
	}

	if (!objectNode.properties) {
		objectNode.properties = {};
	}

	objectNode.properties[propertyName] = propertySchema;

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
	} else {
		// For leaf nodes (string, number, boolean), prefer nodeA's constraints
		// but allow nodeB to add constraints if nodeA doesn't have them
		merged.enum = nodeA.enum || nodeB.enum;
		merged.pattern = nodeA.pattern || nodeB.pattern;
		merged['x-minWords'] = nodeA['x-minWords'] ?? nodeB['x-minWords'];
		merged['x-maxWords'] = nodeA['x-maxWords'] ?? nodeB['x-maxWords'];
		merged['x-minSentences'] = nodeA['x-minSentences'] ?? nodeB['x-minSentences'];
		merged['x-maxSentences'] = nodeA['x-maxSentences'] ?? nodeB['x-maxSentences'];
	}

	return merged;
}
