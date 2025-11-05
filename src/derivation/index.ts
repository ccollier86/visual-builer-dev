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
  parsePath,
  validatePath,
  hasArraySegments,
  getLeafSegment,
  getParentPath,
} from './utils/path-parser';

export {
  createObjectNode,
  createArrayNode,
  createStringNode,
  createNumberNode,
  createBooleanNode,
  addProperty,
  mergeNodes,
} from './utils/schema-builder';

// Types
export type {
  DerivedSchema,
  PathSegment,
  ContentConstraints,
  SchemaNode,
  NoteTemplate,
  Component,
  ContentItem,
} from './types';
