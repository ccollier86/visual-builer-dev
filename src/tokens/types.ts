/**
 * Design Tokens - Type Definitions
 *
 * Domain: tokens
 * Responsibility: Define interfaces for design tokens and compiled CSS output
 */

/** Core typography tokens controlling font family and sizing scale. */
export interface Typography {
  fontFamily: string;
  baseSizePx: number;
  scale: number;
  lineHeight: number;
  monospaceFamily?: string;
}

/** Brand colour palette used for text, accents, and surfaces. */
export interface ColorPalette {
  text: string;
  muted: string;
  accent: string;
  border?: string;
  background?: string;
}

/** Base spacing system used to compute layout gaps. */
export interface Spacing {
  unitPx: number;
  scale: number;
}

/** Table styling configuration for density, borders, and striping. */
export interface TableStyle {
  density?: 'compact' | 'normal' | 'spacious';
  borders?: 'none' | 'row' | 'cell';
  striped?: boolean;
}

/** Ordered/unordered list styling parameters. */
export interface ListStyle {
  bulletStyle?: 'disc' | 'circle' | 'square';
  numberStyle?: 'decimal' | 'lower-alpha' | 'upper-roman';
}

/** Controls spacing for top-level section banners. */
export interface SectionBannerLayout {
  marginPx?: number;
  paddingY?: number;
  paddingLeftPx?: number;
  borderWidthPx?: number;
}

/** Global layout spacing controls used across the document. */
export interface Layout {
  sectionGap?: number;
  paragraphGap?: number;
  headerShowTitle?: boolean;
  pagePaddingPx?: number;
  containerPaddingPx?: number;
  containerMaxWidthPx?: number;
  headerGapPx?: number;
  headerPaddingY?: number;
  sectionBanner?: SectionBannerLayout;
}

/** Print-specific overrides for page size and monochrome rendering. */
export interface PrintOptions {
  pageSize?: 'Letter' | 'A4';
  margin?: string;
  showHeader?: boolean;
  showFooter?: boolean;
  monochrome?: boolean;
}

/** Optional brand assets (logo/header/footer HTML) injected into output. */
export interface BrandAssets {
  logoUrl?: string;
  headerHtml?: string;
  footerHtml?: string;
}

/** Surface colours used for structural elements (header, banners, cards, etc.). */
export interface SurfacePalette {
  headerBackground?: string;
  headerBorder?: string;
  sectionBannerBackground?: string;
  sectionBannerBorder?: string;
  cardBackground?: string;
  cardBorder?: string;
  alertInfoBackground?: string;
  alertInfoBorder?: string;
  signatureBorder?: string;
}

/** Complete design token bundle driving stylesheet generation. */
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
  surface?: SurfacePalette;
}

/** CSS artefacts generated from tokens with accompanying hash metadata. */
export interface CompiledCSS {
  screen: string;
  print: string;
  hash: string;
}
