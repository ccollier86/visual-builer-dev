/**
 * AIS Deriver
 *
 * Derives the AI Structured Output (AIS) schema from a note template.
 * Walks the template layout tree and extracts all fields with slot: "ai".
 */

import type { Component, ContentItem, DerivedSchema, NoteTemplate, SchemaNode } from '../types';
import { parsePath } from '../utils/path-parser';
import {
	addProperty,
	createArrayNode,
	createObjectNode,
	createStringNode,
} from '../utils/schema-builder';

/**
 * Derive the AIS (AI Structured Output) schema from a note template
 *
 * Algorithm:
 * 1. Walk template.layout recursively
 * 2. Find all contentItems with slot: "ai"
 * 3. Extract outputPath (e.g., "assessment.narrative", "plan.homework[].text")
 * 4. Build JSON Schema nodes from paths
 * 5. Apply constraints (enum, pattern, minWords, etc.)
 * 6. Return valid AIS schema
 *
 * @param template - The note template
 * @returns The generated AIS schema
 * @throws Error if template is invalid or has conflicting paths
 */
export function deriveAIS(template: NoteTemplate): DerivedSchema {
	// Initialize root schema
	const root = createObjectNode(false);
	const schemaMap = new Map<string, SchemaNode>();
	schemaMap.set('', root); // Root is empty string path

	// Walk the template and collect all AI fields
	walkLayoutForAI(template.layout, root, schemaMap);

	// Build final schema with metadata
	const schema: DerivedSchema = {
		$id: `https://catalyst/generated/structured-output/${template.id}@${template.version}.json`,
		$schema: 'https://json-schema.org/draft/2020-12/schema',
		title: `Structured Output — ${template.name} v${template.version}`,
		description: `AI-generated fields for ${template.name}`,
		type: 'object',
		properties: root.properties || {},
		required: root.required && root.required.length > 0 ? root.required : undefined,
		additionalProperties: false,
	};

	ensureRequiredCoverage(schema.properties);
	const topLevelKeys = schema.properties ? Object.keys(schema.properties) : [];
	const existingRootRequired = schema.required ?? [];
	const mergedRootRequired = new Set<string>([...existingRootRequired, ...topLevelKeys]);
	schema.required = Array.from(mergedRootRequired);

	return schema;
}

/**
 * Walk the layout tree and build schema for AI fields
 *
 * @param components - Array of components to walk
 * @param root - Root schema node
 * @param schemaMap - Map of path -> schema node for tracking
 */
function walkLayoutForAI(
	components: Component[],
	root: SchemaNode,
	schemaMap: Map<string, SchemaNode>
): void {
	for (const component of components) {
		// Process content items
		if (component.content) {
			for (const item of component.content) {
				processContentItem(item, root, schemaMap);
			}
		}

		// Recurse into children
		if (component.children) {
			walkLayoutForAI(component.children, root, schemaMap);
		}
	}
}

/**
 * Process a single content item
 *
 * @param item - The content item to process
 * @param root - Root schema node
 * @param schemaMap - Map of path -> schema node
 */
function processContentItem(
	item: ContentItem,
	root: SchemaNode,
	schemaMap: Map<string, SchemaNode>
): void {
	// Only process AI slots
	if (item.slot !== 'ai') {
		return;
	}

	if (!item.outputPath) {
		throw new Error(`AI content item "${item.id}" missing outputPath`);
	}

	// Parse the path
	const segments = parsePath(item.outputPath);

	// Build/navigate schema tree
	let currentNode = root;
	let currentPath = '';

	for (let i = 0; i < segments.length; i++) {
		const segment = segments[i];
		const isLastSegment = i === segments.length - 1;
		const segmentPath = currentPath ? `${currentPath}.${segment.name}` : segment.name;
		const propertyPath = segment.isArray ? `${segmentPath}[]` : segmentPath;

		if (isLastSegment) {
			const propertyOptions = {
				isRequired: item.constraints?.required ?? false,
				path: propertyPath,
				sourceId: item.id,
			};

			if (segment.isArray) {
				const arrayPath = `${segmentPath}[]`;
				const needsObjectItems =
					(item.listItems && item.listItems.length > 0) ||
					(item.tableMap && Object.keys(item.tableMap).length > 0);

				let arrayNode = schemaMap.get(arrayPath);

				if (!arrayNode) {
					if (needsObjectItems) {
						const itemsNode = createObjectNode(false);
						arrayNode = createArrayNode(itemsNode);
						addProperty(currentNode, segment.name, arrayNode, propertyOptions);
						schemaMap.set(arrayPath, arrayNode);
						schemaMap.set(segmentPath, itemsNode);
					} else {
						const leafNode = createStringNode(item.constraints);
						arrayNode = createArrayNode(leafNode);
						addProperty(currentNode, segment.name, arrayNode, propertyOptions);
						schemaMap.set(arrayPath, arrayNode);
					}
					schemaMap.set(arrayPath, arrayNode);
				} else {
					if (needsObjectItems && arrayNode.items?.type !== 'object') {
						const itemsNode = createObjectNode(false);
						arrayNode.items = itemsNode;
						schemaMap.set(segmentPath, itemsNode);
					}

					if (propertyOptions.isRequired) {
						if (!currentNode.required) {
							currentNode.required = [];
						}
						if (!currentNode.required.includes(segment.name)) {
							currentNode.required.push(segment.name);
						}
					}
					schemaMap.set(arrayPath, arrayNode);
				}
			} else {
				// Leaf node - create the actual value schema
				const leafNode = createStringNode(item.constraints);
				addProperty(currentNode, segment.name, leafNode, propertyOptions);
			}
		} else {
			// Intermediate node - create/get object or array
			if (segment.isArray) {
				// This segment is an array
				const arrayPath = `${segmentPath}[]`;
				let arrayNode = schemaMap.get(arrayPath);

				if (!arrayNode) {
					// Create new array with object items
					const itemsNode = createObjectNode(false);
					arrayNode = createArrayNode(itemsNode);

					// Add array to current object
					addProperty(currentNode, segment.name, arrayNode, {
						path: propertyPath,
						sourceId: item.id,
					});

					// Cache array and its items
					schemaMap.set(arrayPath, arrayNode);
					schemaMap.set(segmentPath, itemsNode);
				}

				// Navigate into array items
				currentNode = arrayNode.items!;
				currentPath = arrayPath;
			} else {
				// This segment is an object
				let objectNode = schemaMap.get(segmentPath);

				if (!objectNode) {
					// Create new object
					objectNode = createObjectNode(false);

					// Add to parent
					addProperty(currentNode, segment.name, objectNode, {
						path: propertyPath,
						sourceId: item.id,
					});

					// Cache object
					schemaMap.set(segmentPath, objectNode);
				}

				// Navigate into object
				if (!currentNode.properties) {
					currentNode.properties = {};
				}
				currentNode = currentNode.properties[segment.name];
				currentPath = segmentPath;
			}
		}
	}

	// Process nested list items
	if (item.listItems) {
		for (const listItem of item.listItems) {
			processContentItem(listItem, root, schemaMap);
		}
	}

	// Process nested table map
	if (item.tableMap) {
		const tableItems = Array.isArray(item.tableMap)
			? item.tableMap
			: Object.values(item.tableMap);

		for (const tableItem of tableItems) {
			processContentItem(tableItem, root, schemaMap);
		}
	}
}

function ensureRequiredCoverage(properties?: Record<string, SchemaNode>): void {
	if (!properties) {
		return;
	}

	for (const node of Object.values(properties)) {
		if (node.type === 'object') {
			const childProps = node.properties ?? {};
			node.properties = childProps;
			node.required = Object.keys(childProps);
			ensureRequiredCoverage(childProps);
		} else if (node.type === 'array' && node.items) {
			const itemsNode = node.items;
			if (itemsNode.type === 'object') {
				const childProps = itemsNode.properties ?? {};
				itemsNode.properties = childProps;
				itemsNode.required = Object.keys(childProps);
				ensureRequiredCoverage(childProps);
			} else if (itemsNode.type === 'array') {
				ensureRequiredCoverage(undefined);
			}
		}
	}
}
