/**
 * Visual Template Builder - Type Definitions
 */

// ===== COMPONENT TYPES =====

export type ComponentType =
  | 'section'
  | 'field'
  | 'narrative'
  | 'list'
  | 'table'
  | 'grid'
  | 'alert'
  | 'divider'
  | 'image'
  | 'spacer';

export type FieldSource = 'prop' | 'computed' | 'ai' | 'static';

export type FieldType = 'string' | 'number' | 'date' | 'boolean' | 'array' | 'object';

export type ComputationType =
  | 'age-from-dob'
  | 'full-address'
  | 'name-with-credentials'
  | 'score-delta'
  | 'pronoun-parse'
  | 'date-format'
  | 'custom';

export type LayoutType = 'stacked' | 'grid' | 'inline';

export type ListType = 'ordered' | 'unordered';

export type AlertVariant = 'info' | 'warning' | 'error' | 'success';

// ===== BASE COMPONENT =====

interface BaseComponent {
  id: string;
  type: ComponentType;
  order: number;
}

// ===== SECTION BLOCK (Flat - just a divider/header) =====

export interface SectionBlock extends BaseComponent {
  type: 'section';
  title: string;

  // Layout applies to fields AFTER this section (until next section)
  layout: LayoutType;
  columns?: number; // Only if layout is 'grid'

  showTitle: boolean;
  titleStyle: {
    fontSize: number;
    fontWeight: number;
    color: string;
    textTransform: 'none' | 'uppercase' | 'capitalize';
    borderBottom: boolean;
    marginBottom: number;
  };

  spacing: {
    marginBottom: number;
    paddingInside: number;
  };

  border: {
    enabled: boolean;
    color: string;
    width: number;
    style: 'solid' | 'dashed' | 'dotted';
  };

  background: {
    enabled: boolean;
    color: string;
  };
}

// ===== FIELD COMPONENT =====

export interface FieldComponent extends BaseComponent {
  type: 'field';
  path: string;
  label: string;

  source: FieldSource;
  fieldType: FieldType;

  // For prop source
  dataPath?: string;

  // For computed source
  computation?: ComputationType;
  computationConfig?: any;

  // For AI source
  prompt?: string;
  context?: string[];

  // For static source
  staticValue?: string | number | boolean;
  staticTemplate?: string;

  // Formatting
  format?: {
    textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
    maxLength?: number;
    decimals?: number;
    prefix?: string;
    suffix?: string;
    dateFormat?: 'MM/DD/YYYY' | 'YYYY-MM-DD' | 'long';
  };

  // Display
  display: {
    inline: boolean;
    labelPosition: 'above' | 'left' | 'hidden';
    bold: boolean;
    italic: boolean;
    fontSize: 'inherit' | 'small' | 'medium' | 'large';
  };
}

// ===== NARRATIVE COMPONENT =====

export interface NarrativeComponent extends BaseComponent {
  type: 'narrative';
  path: string;
  label: string;

  source: 'ai' | 'prop';
  prompt?: string;
  context?: string[];
  dataPath?: string;

  showLabel: boolean;
  labelStyle: 'title' | 'subtitle' | 'inline';

  paragraphSpacing: number;
  textAlign: 'left' | 'justify' | 'center';
  indentFirstLine: boolean;
}

// ===== LIST COMPONENT =====

export interface ListComponent extends BaseComponent {
  type: 'list';
  path: string;
  label: string;

  listType: ListType;
  startNumber?: number;

  source: 'prop' | 'computed' | 'static';
  dataPath?: string;
  staticItems?: string[];
  template?: string;

  showLabel: boolean;
  labelPosition: 'above' | 'inline';

  bulletStyle?: 'disc' | 'circle' | 'square' | 'none';
  numberStyle?: 'decimal' | 'alpha' | 'roman';
  indent: number;
  itemSpacing: number;
}

// ===== TABLE COMPONENT =====

export interface TableColumn {
  id: string;
  header: string;
  field: string;
  width?: string;
  align: 'left' | 'center' | 'right';
}

export interface TableComponent extends BaseComponent {
  type: 'table';
  path: string;
  label: string;

  columns: TableColumn[];

  source: 'prop' | 'ai';
  dataPath?: string;
  prompt?: string;
  context?: string[];

  showLabel: boolean;
  showHeaders: boolean;

  borders: 'all' | 'rows' | 'none';
  alternateRows: boolean;
  headerBackground: string;
  headerTextColor: string;
  cellPadding: number;
}

// ===== GRID COMPONENT =====

export interface GridComponent extends BaseComponent {
  type: 'grid';
  path: string;
  label: string;

  columns: number;
  columnGap: number;
  rowGap: number;

  fields: FieldComponent[];

  showLabel: boolean;

  cellBackground: string;
  cellBorder: boolean;
  cellPadding: number;
}

// ===== ALERT COMPONENT =====

export interface AlertComponent extends BaseComponent {
  type: 'alert';
  path: string;
  label: string;

  source: 'ai' | 'prop' | 'computed';
  prompt?: string;
  context?: string[];
  dataPath?: string;

  variant: AlertVariant;
  showIcon: boolean;

  backgroundColor: string;
  borderColor: string;
  textColor: string;
  borderLeft: boolean;

  fontSize: 'inherit' | 'small' | 'medium' | 'large';
  padding: number;
}

// ===== DIVIDER COMPONENT =====

export interface DividerComponent extends BaseComponent {
  type: 'divider';

  style: 'solid' | 'dashed' | 'dotted' | 'double';
  thickness: number;
  color: string;

  marginTop: number;
  marginBottom: number;

  width: number;
}

// ===== IMAGE COMPONENT =====

export interface ImageComponent extends BaseComponent {
  type: 'image';

  source: 'url' | 'base64' | 'path';
  imageUrl?: string;
  imageData?: string;

  alt: string;
  width?: number;
  height?: number;
  align: 'left' | 'center' | 'right';

  marginTop: number;
  marginBottom: number;
}

// ===== SPACER COMPONENT =====

export interface SpacerComponent extends BaseComponent {
  type: 'spacer';
  height: number;
}

// ===== UNION TYPE =====

export type Block =
  | SectionBlock
  | FieldComponent
  | NarrativeComponent
  | ListComponent
  | TableComponent
  | GridComponent
  | AlertComponent
  | DividerComponent
  | ImageComponent
  | SpacerComponent;

// ===== TEMPLATE =====

export interface Template {
  id: string | null;
  name: string;
  type: 'soap' | 'dap' | 'biopsych' | 'progress' | 'discharge' | 'custom';
  blocks: Block[];
  theme: Theme;
  createdAt?: string;
  updatedAt?: string;
}

// ===== THEME =====

export interface Theme {
  id: string;
  name: string;

  typography: {
    fontFamily: string;
    baseFontSize: number;
    lineHeight: number;
    h1Size: number;
    h2Size: number;
    h3Size: number;
    bodyColor: string;
    linkColor: string;
    strongWeight: number;
  };

  colors: {
    primary: string;
    secondary: string;
    accent: string;
    success: string;
    warning: string;
    error: string;
    info: string;
    gray50: string;
    gray100: string;
    gray200: string;
    gray300: string;
    gray500: string;
    gray700: string;
    gray900: string;
  };

  spacing: {
    unit: number;
    sectionGap: number;
    fieldGap: number;
    paragraphGap: number;
  };

  borders: {
    defaultColor: string;
    defaultWidth: number;
    defaultStyle: 'solid' | 'dashed';
    radius: number;
  };

  page: {
    maxWidth: string;
    padding: number;
    backgroundColor: string;
  };

  defaults: {
    sectionTitleTransform: 'uppercase' | 'capitalize' | 'none';
    sectionBorderBottom: boolean;
    fieldLabelPosition: 'above' | 'left';
    tableBorders: 'all' | 'rows' | 'none';
    tableAlternateRows: boolean;
  };
}

// ===== PALETTE ITEM =====

export interface PaletteItem {
  id: string;
  type: ComponentType;
  name: string;
  icon: string;
  category: 'layout' | 'content' | 'special' | 'data';
  description: string;
}

// ===== STATE =====

export interface TemplateBuilderState {
  template: Template;
  selectedBlockId: string | null;
  isBlockEditorOpen: boolean;
  isDragging: boolean;
}
