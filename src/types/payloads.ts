/**
 * Shared payload aliases used across domains. These represent runtime data that
 * is validated against JSON Schemas (AIS, NAS, RPS) and therefore has
 * free-form structure at compile time.
 */

/** AI Structured Output payload returned by the model. */
export type AIPayload = Record<string, unknown>;

/** Non-AI Snapshot payload generated during resolution. */
export type NasSnapshot = Record<string, unknown>;

/** Final Render Payload Schema (RPS) data merged from AIS and NAS. */
export type RenderPayload = Record<string, unknown>;

/** Optional fact pack bundle used to augment prompt context. */
export type FactPack = Record<string, unknown>;
