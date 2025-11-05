/**
 * Catalyst JSON Schema Contracts
 *
 * This module exports all JSON Schema files for the Catalyst documentation microservice.
 * All schemas use JSON Schema Draft 2020-12.
 */

// Import JSON schemas
import noteTemplateSchema from './note-template.schema.json';
import structuredOutputMetaSchema from './structured-output.meta.schema.json';
import nonAiOutputMetaSchema from './non-ai-output.meta.schema.json';
import promptBundleMetaSchema from './prompt-bundle.meta.schema.json';
import renderPayloadMetaSchema from './render-payload.meta.schema.json';
import designTokensSchema from './design-tokens.schema.json';

// Export individual schemas
export { noteTemplateSchema };
export { structuredOutputMetaSchema };
export { nonAiOutputMetaSchema };
export { promptBundleMetaSchema };
export { renderPayloadMetaSchema };
export { designTokensSchema };

// Export all schemas as a collection
export const schemas = {
	noteTemplate: noteTemplateSchema,
	structuredOutputMeta: structuredOutputMetaSchema,
	nonAiOutputMeta: nonAiOutputMetaSchema,
	promptBundleMeta: promptBundleMetaSchema,
	renderPayloadMeta: renderPayloadMetaSchema,
	designTokens: designTokensSchema,
} as const;

// Export schema IDs for reference
export const SCHEMA_IDS = {
	NOTE_TEMPLATE: 'https://catalyst/specs/note-template.schema.json',
	STRUCTURED_OUTPUT_META: 'https://catalyst/specs/structured-output.meta.schema.json',
	NON_AI_OUTPUT_META: 'https://catalyst/specs/non-ai-output.meta.schema.json',
	PROMPT_BUNDLE_META: 'https://catalyst/specs/prompt-bundle.meta.schema.json',
	RENDER_PAYLOAD_META: 'https://catalyst/specs/render-payload.meta.schema.json',
	DESIGN_TOKENS: 'https://catalyst/specs/design-tokens.schema.json',
} as const;
