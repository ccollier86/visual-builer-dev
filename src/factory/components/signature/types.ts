/**
 * Signature Component Types
 *
 * Domain: factory/components/signature
 * Responsibility: Type definitions used by signature renderers and constants.
 */
export type SignatureDisplayMode = 'labeled' | 'text';

export interface SignatureFieldConfig {
  label?: string;
  mode?: SignatureDisplayMode;
  emphasis?: 'italic';
}
