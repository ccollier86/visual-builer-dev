/**
 * Composition Domain Types
 *
 * Types for building prompt bundles from templates and runtime data.
 */

import type { DerivedSchema, NoteTemplate, StyleHints } from '../derivation/types';
import type { FactPack, NasSnapshot } from '../types/payloads';

/**
 * A complete prompt bundle ready for LLM call
 * Contains system/user messages, schema, field guide, and context
 */
export interface PromptBundle {
  id: string;
  templateId: string;
  templateVersion: string;
  messages: Message[];
  jsonSchema: DerivedSchema; // AIS schema for response_format
  fieldGuide: FieldGuideEntry[];
  context: {
    factPack?: FactPack;
    nasSlices: NasSnapshot;
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
export type FieldDependencyScope = 'nas' | 'source';

export type FieldDependency = {
  path: string;
  scope: FieldDependencyScope;
};

export interface FieldGuideEntry {
  path: string;
  description?: string;
  guidance?: string[];
  dependencies?: FieldDependency[];
  constraints?: FieldConstraints;
  style?: StyleHints;
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
 * Result of building the field guide along with authoring diagnostics.
 */
export interface FieldGuideBuildResult {
  entries: FieldGuideEntry[];
  issues: LintIssue[];
}

/**
 * Result of composing a prompt bundle along with lint diagnostics.
 */
export interface CompositionResult {
  bundle: PromptBundle;
  lint: LintResult;
}

/**
 * Input for prompt composition
 * Everything needed to build a deterministic prompt bundle
 */
export interface CompositionInput {
  template: NoteTemplate;
  aiSchema: DerivedSchema; // AIS (AI Structured Output Schema)
  nasSnapshot: NasSnapshot; // NAS (Non-AI Snapshot) resolved runtime data
  factPack?: FactPack; // Optional LPC-derived compact facts
}

/**
 * Result of a single lint check
 */
export interface LintIssue {
  severity: 'error' | 'warning';
  check: string;           // Which check failed
  message: string;         // Human-readable description
  path?: string;           // Specific path if applicable
}

/**
 * Complete lint result
 */
export interface LintResult {
  ok: boolean;             // True if no errors
  issues: LintIssue[];     // All issues found
  errors: LintIssue[];     // Just errors
  warnings: LintIssue[];   // Just warnings
}

/**
 * Result of NAS context slicing and associated diagnostics.
 */
export interface ContextSliceResult {
  nasSlices: NasSnapshot;
  issues: LintIssue[];
}

export type { FactPack, NasSnapshot } from '../types/payloads';
