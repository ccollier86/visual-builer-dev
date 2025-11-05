/**
 * Derivation Domain Types
 *
 * Types for deriving AIS, NAS, and RPS schemas from note templates.
 */

/**
 * A generated JSON Schema (AIS, NAS, or RPS)
 * Follows JSON Schema Draft 2020-12 format
 */
export interface DerivedSchema {
  $id: string;
  $schema: string;
  title: string;
  description?: string;
  type: string;
  properties: Record<string, any>;
  required?: string[];
  additionalProperties: boolean;
}

/**
 * A parsed path segment from outputPath or targetPath
 * - name: The property name (e.g., "homework" from "homework[]" or "homework[0]")
 * - isArray: True if segment represents an array ([] or [n])
 * - index: Optional specific array index (e.g., 0 from "homework[0]")
 *
 * Examples:
 * - "plan.homework[].text" -> [
 *     { name: "plan", isArray: false },
 *     { name: "homework", isArray: true },
 *     { name: "text", isArray: false }
 *   ]
 * - "plan.interventionsRecommended[0]" -> [
 *     { name: "plan", isArray: false },
 *     { name: "interventionsRecommended", isArray: true, index: 0 }
 *   ]
 */
export interface PathSegment {
  name: string;
  isArray: boolean;
  index?: number;
}

/**
 * Constraints from a template contentItem
 * Maps to JSON Schema constraints
 */
export interface ContentConstraints {
  required?: boolean;
  enum?: string[];
  pattern?: string;
  minWords?: number;
  maxWords?: number;
  minSentences?: number;
  maxSentences?: number;
}

/**
 * A schema node being built
 * Can be object, array, string, number, or boolean
 */
export interface SchemaNode {
  type: string;
  properties?: Record<string, SchemaNode>;
  required?: string[];
  additionalProperties?: boolean;
  items?: SchemaNode;
  enum?: string[];
  pattern?: string;
  'x-minWords'?: number;
  'x-maxWords'?: number;
  'x-minSentences'?: number;
  'x-maxSentences'?: number;
  minimum?: number;
  maximum?: number;
}

/**
 * Template structure (minimal interface for derivation)
 * Only the fields needed for schema derivation
 */
export interface NoteTemplate {
  id: string;
  name: string;
  version: string;
  layout: Component[];
}

/**
 * Component props by type
 */
export interface ListProps {
  ordered?: boolean;
}

export interface TableProps {
  columns?: string[];
  colWidths?: string[];
}

export type ComponentProps = ListProps | TableProps | Record<string, unknown>;

export interface Component {
  id: string;
  type: string;
  title?: string;
  props?: ComponentProps;
  content?: ContentItem[];
  children?: Component[];
}

export interface ContentItem {
  id: string;
  slot: 'static' | 'ai' | 'lookup' | 'computed' | 'verbatim';
  outputPath?: string;
  targetPath?: string;
  description?: string;
  source?: string[];
  guidance?: string[];
  aiDeps?: string[];
  styleHints?: any;
  constraints?: ContentConstraints;
  listItems?: ContentItem[];
  tableMap?: Record<string, ContentItem>;
  lookup?: string;
  formula?: string;
  resultType?: string;
  format?: string;
  text?: string;
  verbatimRef?: string;
}
