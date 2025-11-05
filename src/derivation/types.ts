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
 * Named constants for custom string constraint keywords applied to schema nodes.
 * Keeps all rune-style keys in one place so builders and mergers stay consistent.
 */
export const CUSTOM_STRING_CONSTRAINTS = {
  MIN_WORDS: 'x-minWords',
  MAX_WORDS: 'x-maxWords',
  MIN_SENTENCES: 'x-minSentences',
  MAX_SENTENCES: 'x-maxSentences',
} as const;

/**
 * Utility type representing all supported custom string constraint keyword values.
 */
export type CustomStringConstraintKey =
  (typeof CUSTOM_STRING_CONSTRAINTS)[keyof typeof CUSTOM_STRING_CONSTRAINTS];

/**
 * Metadata describing the source context for a schema property.
 */
export interface SchemaPropertyMetadata {
  /** Full output/target path (dot + [] notation). */
  path?: string;
  /** Optional originating template content identifier. */
  sourceId?: string;
}

/**
 * Options provided when attaching properties to schema nodes.
 */
export interface AddPropertyOptions extends SchemaPropertyMetadata {
  isRequired?: boolean;
}

/**
 * Detailed context carried with duplicate-path errors.
 */
export interface DuplicatePathErrorContext extends SchemaPropertyMetadata {
  propertyName: string;
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
