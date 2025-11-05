export type SignatureDisplayMode = 'labeled' | 'text';

export interface SignatureFieldConfig {
  label?: string;
  mode?: SignatureDisplayMode;
  emphasis?: 'italic';
}
