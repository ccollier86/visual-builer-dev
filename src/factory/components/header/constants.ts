/**
 * Header Configuration Constants
 *
 * Domain: factory/components/header
 * Responsibility: Default header card configuration by component id.
 */
import type { HeaderCardConfig } from './types';

export const DEFAULT_HEADER_CARD_CONFIG: HeaderCardConfig = {
  defaultMode: 'label-value',
};

export const HEADER_CARD_CONFIG: Record<string, HeaderCardConfig> = {
  'patient-info': {
    defaultMode: 'label-value',
    fields: {
      name: { label: 'NAME' },
      dob: { label: 'DOB' },
      age: { label: 'AGE' },
      gender: { label: 'SEX' },
      mrn: { label: 'MRN' },
    },
  },
  'facility-info': {
    defaultMode: 'text',
  },
  'encounter-info': {
    defaultMode: 'text',
    fields: {
      provider: { label: 'SEEN BY', mode: 'label-value' },
      date: { label: 'DATE', mode: 'label-value' },
      type: { mode: 'text' },
      signature: { mode: 'text' },
    },
  },
};

/**
 * Retrieve the header card configuration for a template component.
 *
 * @param componentId - Template component identifier.
 * @returns Header card configuration with defaults applied.
 */
export function getHeaderCardConfig(componentId: string | undefined): HeaderCardConfig {
  if (!componentId) {
    return DEFAULT_HEADER_CARD_CONFIG;
  }

  const config = HEADER_CARD_CONFIG[componentId];
  if (!config) {
    return DEFAULT_HEADER_CARD_CONFIG;
  }

  return {
    defaultMode: config.defaultMode,
    fields: config.fields ? { ...config.fields } : undefined,
  };
}
