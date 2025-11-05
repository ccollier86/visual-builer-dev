/**
 * NAS Deriver
 *
 * Derives the Non-AI Structured Output (NAS) schema from a note template.
 * Walks the template layout tree and extracts all fields with slot: "lookup" | "computed" | "static" | "verbatim".
 */

import type { NoteTemplate, Component, ContentItem, DerivedSchema, SchemaNode } from '../types';
import { parsePath } from '../utils/path-parser';
import {
  createObjectNode,
  createArrayNode,
  createStringNode,
  createNumberNode,
  addProperty,
} from '../utils/schema-builder';

/**
 * Derive the NAS (Non-AI Structured Output) schema from a note template
 *
 * Algorithm:
 * 1. Walk template.layout recursively
 * 2. Find all contentItems with slot: "lookup" | "computed" | "static" | "verbatim"
 * 3. Extract targetPath
 * 4. Build JSON Schema nodes from paths
 * 5. Infer types from slot and resultType
 * 6. Return valid NAS schema
 *
 * @param template - The note template
 * @returns The generated NAS schema
 * @throws Error if template is invalid or has conflicting paths
 */
export function deriveNAS(template: NoteTemplate): DerivedSchema {
  // Initialize root schema
  const root = createObjectNode(false);
  const schemaMap = new Map<string, SchemaNode>();
  schemaMap.set('', root); // Root is empty string path

  // Walk the template and collect all non-AI fields
  walkLayoutForNAS(template.layout, root, schemaMap);

  // Build final schema with metadata
  const schema: DerivedSchema = {
    $id: `https://catalyst/generated/non-ai-output/${template.id}@${template.version}.json`,
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    title: `Non-AI Output — ${template.name} v${template.version}`,
    description: `Non-AI fields (lookup/computed/static/verbatim) for ${template.name}`,
    type: 'object',
    properties: root.properties || {},
    required: root.required && root.required.length > 0 ? root.required : undefined,
    additionalProperties: false,
  };

  return schema;
}

/**
 * Walk the layout tree and build schema for non-AI fields
 *
 * @param components - Array of components to walk
 * @param root - Root schema node
 * @param schemaMap - Map of path -> schema node for tracking
 */
function walkLayoutForNAS(
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
      walkLayoutForNAS(component.children, root, schemaMap);
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
  // Only process non-AI slots
  if (item.slot === 'ai') {
    return;
  }

  if (!item.targetPath) {
    // Non-AI items should have targetPath, but if missing, skip silently
    // (static text items might not have targetPath)
    return;
  }

  // Parse the path
  const segments = parsePath(item.targetPath);

  // Determine the leaf node type based on slot and resultType
  const leafNode = createLeafNodeForItem(item);

  // Build/navigate schema tree
  let currentNode = root;
  let currentPath = '';

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const isLastSegment = i === segments.length - 1;
    const segmentPath = currentPath ? `${currentPath}.${segment.name}` : segment.name;

    if (isLastSegment) {
      // Leaf node - add the value schema
      if (segment.isArray) {
        // This leaf is an array of values
        const arrayNode = createArrayNode(leafNode);
        addProperty(
          currentNode,
          segment.name,
          arrayNode,
          item.constraints?.required
        );
      } else {
        // Normal leaf
        addProperty(
          currentNode,
          segment.name,
          leafNode,
          item.constraints?.required
        );
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
          addProperty(currentNode, segment.name, arrayNode, false);

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
          addProperty(currentNode, segment.name, objectNode, false);

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
    // Validate sequential indices for indexed listItems
    const indices: number[] = [];

    for (const listItem of item.listItems) {
      if (!listItem.targetPath) continue;

      const segments = parsePath(listItem.targetPath);
      const lastSegment = segments[segments.length - 1];

      if (lastSegment.index !== undefined) {
        indices.push(lastSegment.index);
      }
    }

    // Validate sequential indices if any explicit indices found
    if (indices.length > 0) {
      indices.sort((a, b) => a - b);
      for (let i = 0; i < indices.length; i++) {
        if (indices[i] !== i) {
          throw new Error(
            `listItems array indices must be sequential starting from 0. ` +
            `Found index ${indices[i]} but expected ${i} at path ${item.targetPath}`
          );
        }
      }
    }

    // Process each list item
    for (const listItem of item.listItems) {
      processContentItem(listItem, root, schemaMap);
    }
  }

  // Process nested table map
  if (item.tableMap) {
    for (const tableItem of Object.values(item.tableMap)) {
      processContentItem(tableItem, root, schemaMap);
    }
  }
}

/**
 * Create a leaf schema node based on the content item type
 *
 * @param item - The content item
 * @returns The appropriate schema node
 */
function createLeafNodeForItem(item: ContentItem): SchemaNode {
  // For computed fields, use resultType if specified
  if (item.slot === 'computed' && item.resultType) {
    switch (item.resultType) {
      case 'number':
        return createNumberNode(item.constraints);
      case 'string':
        return createStringNode(item.constraints);
      case 'boolean':
        return { type: 'boolean' };
      case 'object':
        return createObjectNode(true); // Allow additional properties for generic objects
      case 'array':
        // Generic array - items can be anything
        return {
          type: 'array',
          items: { type: 'string' }, // Default to string items
        };
      default:
        return createStringNode(item.constraints);
    }
  }

  // For verbatim, it's an object with { text: string, ref: string }
  if (item.slot === 'verbatim') {
    const verbatimNode = createObjectNode(false);
    addProperty(verbatimNode, 'text', createStringNode(), true);
    addProperty(verbatimNode, 'ref', createStringNode(), true);
    return verbatimNode;
  }

  // For lookup and static, default to string with constraints
  return createStringNode(item.constraints);
}
