import type { NoteTemplate } from '../derivation/types';
import type { RenderPayload } from '../types/payloads';
import type { DesignTokens } from '../tokens/types';

/**
 * Inputs required by the factory domain to render the final document.
 */

export interface FactoryInputs {
  template: NoteTemplate; // NoteTemplate (validated upstream)
  payload: RenderPayload; // RPS-validated payload
  tokens: DesignTokens; // Design tokens (validated upstream)
  options?: RenderOptions;
}

export interface RenderOptions {
  /** Include provenance appendix with source references */
  provenance?: boolean;

  /** Brand customization overrides */
  brandOverrides?: {
    logoUrl?: string;
    headerHtml?: string;
    footerHtml?: string;
  };

  /** Date format string (e.g., "YYYY-MM-DD") */
  dateFormat?: string;

  /** Document language code (default: "en") */
  lang?: string;

  /** Prefix for element IDs to avoid collisions (default: "") */
  idPrefix?: string;
}

/** Verbatim content with optional provenance reference */
export interface VerbatimValue {
  text: string;
  ref?: string;
}

/** Severity levels for component diagnostics surfaced during rendering. */
export type DiagnosticSeverity = 'warning' | 'error';

/** Structured warning emitted by factory components when template assumptions are violated. */
export interface ComponentDiagnostic {
  code: string;
  message: string;
  severity: DiagnosticSeverity;
}
