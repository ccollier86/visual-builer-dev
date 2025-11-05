/**
 * Preset Themes for Template Builder
 */

import type { Theme } from '../types/template';

export const DEFAULT_THEME: Theme = {
  id: 'clean-professional',
  name: 'Clean Professional',

  typography: {
    fontFamily: 'Open Sans, sans-serif',
    baseFontSize: 10,
    lineHeight: 1.4,
    h1Size: 14,
    h2Size: 12,
    h3Size: 11,
    bodyColor: '#1a1a1a',
    linkColor: '#3b82f6',
    strongWeight: 600
  },

  colors: {
    primary: '#1f2937',
    secondary: '#6b7280',
    accent: '#f59e0b',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
    gray50: '#f9fafb',
    gray100: '#f3f4f6',
    gray200: '#e5e7eb',
    gray300: '#d1d5db',
    gray500: '#6b7280',
    gray700: '#374151',
    gray900: '#111827'
  },

  spacing: {
    unit: 4,
    sectionGap: 28,
    fieldGap: 12,
    paragraphGap: 12
  },

  borders: {
    defaultColor: '#d1d5db',
    defaultWidth: 2,
    defaultStyle: 'solid',
    radius: 4
  },

  page: {
    maxWidth: '8.5in',
    padding: 20,
    backgroundColor: '#ffffff'
  },

  defaults: {
    sectionTitleTransform: 'uppercase',
    sectionBorderBottom: true,
    fieldLabelPosition: 'above',
    tableBorders: 'all',
    tableAlternateRows: true
  }
};

export const COMPACT_THEME: Theme = {
  id: 'compact',
  name: 'Compact',

  typography: {
    fontFamily: 'Arial, sans-serif',
    baseFontSize: 11,
    lineHeight: 1.3,
    h1Size: 13,
    h2Size: 12,
    h3Size: 11,
    bodyColor: '#000000',
    linkColor: '#0066cc',
    strongWeight: 700
  },

  colors: {
    primary: '#000000',
    secondary: '#666666',
    accent: '#0066cc',
    success: '#008000',
    warning: '#ff8800',
    error: '#cc0000',
    info: '#0066cc',
    gray50: '#f5f5f5',
    gray100: '#e0e0e0',
    gray200: '#cccccc',
    gray300: '#b3b3b3',
    gray500: '#666666',
    gray700: '#333333',
    gray900: '#000000'
  },

  spacing: {
    unit: 4,
    sectionGap: 16,
    fieldGap: 8,
    paragraphGap: 8
  },

  borders: {
    defaultColor: '#cccccc',
    defaultWidth: 1,
    defaultStyle: 'solid',
    radius: 0
  },

  page: {
    maxWidth: '100%',
    padding: 15,
    backgroundColor: '#ffffff'
  },

  defaults: {
    sectionTitleTransform: 'none',
    sectionBorderBottom: false,
    fieldLabelPosition: 'left',
    tableBorders: 'rows',
    tableAlternateRows: false
  }
};

export const FORMAL_CLINICAL_THEME: Theme = {
  id: 'formal-clinical',
  name: 'Formal Clinical',

  typography: {
    fontFamily: 'Times New Roman, serif',
    baseFontSize: 12,
    lineHeight: 1.6,
    h1Size: 16,
    h2Size: 14,
    h3Size: 13,
    bodyColor: '#000000',
    linkColor: '#0000ee',
    strongWeight: 700
  },

  colors: {
    primary: '#000000',
    secondary: '#555555',
    accent: '#000080',
    success: '#006400',
    warning: '#ff8c00',
    error: '#8b0000',
    info: '#000080',
    gray50: '#fafafa',
    gray100: '#f0f0f0',
    gray200: '#e0e0e0',
    gray300: '#c0c0c0',
    gray500: '#808080',
    gray700: '#404040',
    gray900: '#000000'
  },

  spacing: {
    unit: 8,
    sectionGap: 32,
    fieldGap: 16,
    paragraphGap: 16
  },

  borders: {
    defaultColor: '#000000',
    defaultWidth: 2,
    defaultStyle: 'solid',
    radius: 0
  },

  page: {
    maxWidth: '8.5in',
    padding: 30,
    backgroundColor: '#ffffff'
  },

  defaults: {
    sectionTitleTransform: 'uppercase',
    sectionBorderBottom: true,
    fieldLabelPosition: 'above',
    tableBorders: 'all',
    tableAlternateRows: true
  }
};

export const PRESET_THEMES: Theme[] = [
  DEFAULT_THEME,
  COMPACT_THEME,
  FORMAL_CLINICAL_THEME
];

export function getThemeById(id: string): Theme | undefined {
  return PRESET_THEMES.find(t => t.id === id);
}
