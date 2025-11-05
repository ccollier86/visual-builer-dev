/**
 * Composition Domain Types
 *
 * Types for building prompt bundles from templates and runtime data.
 */

/**
 * A complete prompt bundle ready for LLM call
 * Contains system/user messages, schema, field guide, and context
 */
export interface PromptBundle {
  id: string;
  templateId: string;
  templateVersion: string;
  messages: Message[];
  jsonSchema: any; // AIS schema for response_format
  fieldGuide: FieldGuideEntry[];
  context: {
    factPack?: any;
    nasSlices: any;
  };
}

/**
 * A single message in the prompt bundle
 * Follows OpenAI message format
 */
export interface Message {
  role: 'system' | 'user';
  content: string;
}

/**
 * Metadata for a single AI field to guide the LLM
 * Extracted from template contentItem with slot:"ai"
 */
export interface FieldGuideEntry {
  path: string;
  description?: string;
  guidance?: string[];
  dependencies?: string[];
  constraints?: FieldConstraints;
  style?: any;
}

/**
 * Constraints for an AI field
 * Maps to JSON Schema and custom x- constraints
 */
export interface FieldConstraints {
  enum?: string[];
  pattern?: string;
  'x-minWords'?: number;
  'x-maxWords'?: number;
  'x-minSentences'?: number;
  'x-maxSentences'?: number;
}

/**
 * Input for prompt composition
 * Everything needed to build a deterministic prompt bundle
 */
export interface CompositionInput {
  template: any; // NoteTemplate
  aiSchema: any; // AIS (AI Structured Output Schema)
  nasSnapshot: any; // NAS (Non-AI Snapshot) resolved runtime data
  factPack?: any; // Optional LPC-derived compact facts
}
