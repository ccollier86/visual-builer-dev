/**
 * Signature Configuration Constants
 *
 * Domain: factory/components/signature
 * Responsibility: Default signature field configuration by field key.
 */
import type { SignatureFieldConfig } from './types';

export const SIGNATURE_FIELD_CONFIG: Record<string, SignatureFieldConfig> = {
  renderedBy: { label: 'Rendering clinician', mode: 'labeled' },
  supervisedBy: { label: 'Supervising clinician', mode: 'labeled' },
  attestation: { mode: 'text', emphasis: 'italic' },
  accuracyStatement: { mode: 'text' },
};
