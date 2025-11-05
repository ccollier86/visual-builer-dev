// Factory domain types
// Defines interfaces for HTML rendering inputs and options

export interface FactoryInputs {
  template: any; // NoteTemplate (validated upstream)
  payload: any; // RPS-validated payload
  tokens: any; // Design tokens (validated upstream)
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
