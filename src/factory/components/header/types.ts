/**
 * Header Component Types
 *
 * Domain: factory/components/header
 * Responsibility: Type definitions used by header renderers and constants.
 */
export type HeaderDisplayMode = 'label-value' | 'text';

export interface HeaderFieldConfig {
  label?: string;
  mode?: HeaderDisplayMode;
}

export interface HeaderCardConfig {
  defaultMode: HeaderDisplayMode;
  fields?: Record<string, HeaderFieldConfig>;
}
