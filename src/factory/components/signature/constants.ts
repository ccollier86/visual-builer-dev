import type { SignatureFieldConfig } from './types';

export const SIGNATURE_FIELD_CONFIG: Record<string, SignatureFieldConfig> = {
  renderedBy: { label: 'Rendering clinician', mode: 'labeled' },
  supervisedBy: { label: 'Supervising clinician', mode: 'labeled' },
  attestation: { mode: 'text', emphasis: 'italic' },
  accuracyStatement: { mode: 'text' },
};
