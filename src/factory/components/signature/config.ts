export type SignatureDisplayMode = 'labeled' | 'text';

export interface SignatureFieldConfig {
  label?: string;
  mode?: SignatureDisplayMode;
  emphasis?: 'italic';
}

export const SIGNATURE_FIELD_CONFIG: Record<string, SignatureFieldConfig> = {
  renderedBy: { label: 'Rendering clinician', mode: 'labeled' },
  supervisedBy: { label: 'Supervising clinician', mode: 'labeled' },
  attestation: { mode: 'text', emphasis: 'italic' },
  accuracyStatement: { mode: 'text' },
};
