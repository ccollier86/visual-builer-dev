/**
 * Derivation Domain
 *
 * Schema generation engines that derive AIS, NAS, and RPS from note templates.
 *
 * Core exports:
 * - deriveAIS: Template → AI Structured Output schema
 * - deriveNAS: Template → Non-AI Structured Output schema
 * - mergeToRPS: AIS + NAS → Render Payload Schema
 *
 * Utility exports:
 * - Path parsing and validation
 * - Schema node builders
 */

// Core derivation functions
export { deriveAIS } from './core/ais-deriver';
export { deriveNAS } from './core/nas-deriver';
export { mergeToRPS, validateMergeable } from './core/rps-merger';

// Utilities
export {
	getLeafSegment,
	getParentPath,
	hasArraySegments,
	parsePath,
	validatePath,
} from './utils/path-parser';

export {
	addProperty,
	createArrayNode,
	createBooleanNode,
	createNumberNode,
	createObjectNode,
	createStringNode,
	mergeNodes,
} from './utils/schema-builder';

export { DuplicatePathError } from './errors';

// Types
export type {
	Component,
	ContentConstraints,
	ContentItem,
	DerivedSchema,
	NoteTemplate,
	PathSegment,
	SchemaNode,
} from './types';
