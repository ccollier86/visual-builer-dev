/**
 * Design Tokens - Type Definitions
 *
 * Domain: tokens
 * Responsibility: Define interfaces for design tokens and compiled CSS output
 */

export interface Typography {
  fontFamily: string;
  baseSizePx: number;
  scale: number;
  lineHeight: number;
  monospaceFamily?: string;
}

export interface ColorPalette {
  text: string;
  muted: string;
  accent: string;
  border?: string;
  background?: string;
}

export interface Spacing {
  unitPx: number;
  scale: number;
}

export interface TableStyle {
  density?: 'compact' | 'normal' | 'spacious';
  borders?: 'none' | 'row' | 'cell';
  striped?: boolean;
}

export interface ListStyle {
  bulletStyle?: 'disc' | 'circle' | 'square';
  numberStyle?: 'decimal' | 'lower-alpha' | 'upper-roman';
}

export interface Layout {
  sectionGap?: number;
  paragraphGap?: number;
  headerShowTitle?: boolean;
}

export interface PrintOptions {
  pageSize?: 'Letter' | 'A4';
  margin?: string;
  showHeader?: boolean;
  showFooter?: boolean;
  monochrome?: boolean;
}

export interface BrandAssets {
  logoUrl?: string;
  headerHtml?: string;
  footerHtml?: string;
}

export interface DesignTokens {
  id: string;
  version: string;
  typography: Typography;
  color: ColorPalette;
  spacing: Spacing;
  table: TableStyle;
  list?: ListStyle;
  layout?: Layout;
  print: PrintOptions;
  brand?: BrandAssets;
}

export interface CompiledCSS {
  screen: string;
  print: string;
  hash: string;
}
