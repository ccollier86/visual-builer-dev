# Component Library & Properties Plan

## What This Document Covers

1. **Component Types** - What blocks users can add (Section, Field, List, Table, etc.)
2. **Component Properties** - What can be configured for each component
3. **Theme System** - How styling/appearance is controlled
4. **Preview System** - How we show what the final output will look like

---

## Component Types

### 1. Section Component

**What it is:** Container for fields. Represents major sections of the note (Header, Subjective, Objective, etc.)

**Visual in Builder:**
```
┌─────────────────────────────────────┐
│ 📄 Header Section            [⚙] [✕]│
├─────────────────────────────────────┤
│  • Patient Name (prop)              │
│  • DOB (prop)                       │
│  • Age (computed)                   │
│  [+ Add Field]                      │
└─────────────────────────────────────┘
```

**Properties:**
```typescript
interface SectionComponent {
  id: string;
  type: 'section';

  // Basic
  title: string;              // "Header", "Subjective", etc.
  order: number;              // Display order

  // Content
  fields: FieldComponent[];   // Fields within this section

  // Layout
  layout: 'stacked' | 'grid' | 'inline';
  columns?: number;           // For grid layout (2, 3, 4)

  // Styling
  showTitle: boolean;         // Show/hide section title
  titleStyle: {
    fontSize: 'small' | 'medium' | 'large';
    fontWeight: 'normal' | 'bold';
    textTransform: 'none' | 'uppercase';
    borderBottom: boolean;
    color?: string;
  };

  spacing: {
    marginBottom: number;     // px
    paddingInside: number;    // px
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
```

**Render Output:**
```html
<!-- Stacked Layout -->
<div class="section">
  <div class="section-title">SUBJECTIVE</div>
  <div class="section-content">
    <!-- fields render here -->
  </div>
</div>

<!-- Grid Layout (3 columns) -->
<div class="section section-grid-3">
  <div class="section-title">HEADER</div>
  <div class="section-content">
    <div class="grid-col">...</div>
    <div class="grid-col">...</div>
    <div class="grid-col">...</div>
  </div>
</div>
```

---

### 2. Field Component (Text)

**What it is:** Single data field - the actual content of the note

**Visual in Builder:**
```
┌───────────────────────────────────┐
│ Patient Name                      │
│ Source: Property                  │
│ Data Path: patient.name           │
│                          [Edit] [✕]│
└───────────────────────────────────┘
```

**Properties:**
```typescript
interface FieldComponent {
  id: string;
  type: 'field';

  // Identity
  path: string;               // "header.patient.name" (unique in template)
  label: string;              // "Patient Name"

  // Data Source (ONE of these)
  source: 'prop' | 'computed' | 'ai' | 'static';

  // For prop source
  dataPath?: string;          // "patient.name"

  // For computed source
  computation?: ComputationType;
  computationConfig?: any;

  // For AI source
  prompt?: string;
  context?: string[];         // Paths to data AI should see

  // For static source
  staticValue?: string | number | boolean;
  staticTemplate?: string;    // "Patient seen on {{date}}"

  // Type
  fieldType: 'string' | 'number' | 'date' | 'boolean';

  // Formatting
  format?: {
    // For strings
    textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
    maxLength?: number;

    // For numbers
    decimals?: number;
    prefix?: string;          // "$" for currency
    suffix?: string;          // "%" for percentages

    // For dates
    dateFormat?: 'MM/DD/YYYY' | 'YYYY-MM-DD' | 'long';
  };

  // Display
  display: {
    inline: boolean;          // Show label and value on same line
    labelPosition: 'above' | 'left' | 'hidden';
    bold: boolean;
    italic: boolean;
    fontSize: 'inherit' | 'small' | 'medium' | 'large';
  };
}

type ComputationType =
  | 'age-from-dob'
  | 'full-address'
  | 'name-with-credentials'
  | 'score-delta'
  | 'pronoun-parse'
  | 'date-format'
  | 'custom';
```

**Render Output:**
```html
<!-- Block display -->
<div class="field">
  <div class="field-label">Patient Name:</div>
  <div class="field-value">Maria Rodriguez</div>
</div>

<!-- Inline display -->
<div class="field field-inline">
  <span class="field-label">DOB:</span>
  <span class="field-value">03/15/1996</span>
</div>

<!-- No label -->
<div class="field">
  <div class="field-value">Maria Rodriguez</div>
</div>
```

---

### 3. Narrative Component

**What it is:** Multi-paragraph text content (usually AI-generated)

**Visual in Builder:**
```
┌───────────────────────────────────┐
│ 📝 History of Present Illness     │
│ Source: AI Generated              │
│ Prompt: "Write comprehensive HPI" │
│                          [Edit] [✕]│
└───────────────────────────────────┘
```

**Properties:**
```typescript
interface NarrativeComponent {
  id: string;
  type: 'narrative';

  // Identity
  path: string;
  label: string;

  // Source (usually AI)
  source: 'ai' | 'prop';
  prompt?: string;
  context?: string[];
  dataPath?: string;          // If prop source

  // Display
  showLabel: boolean;
  labelStyle: 'title' | 'subtitle' | 'inline';

  // Formatting
  paragraphSpacing: number;   // px between paragraphs
  textAlign: 'left' | 'justify' | 'center';
  indentFirstLine: boolean;
}
```

**Render Output:**
```html
<div class="narrative">
  <div class="narrative-label">History of Present Illness</div>
  <div class="narrative-content">
    <p>Maria Rodriguez is a 28-year-old woman presenting...</p>
    <p>She reports that symptoms began following...</p>
  </div>
</div>
```

---

### 4. List Component

**What it is:** Ordered or unordered list (numbered or bullets)

**Visual in Builder:**
```
┌───────────────────────────────────┐
│ 📋 Interventions Recommended      │
│ Type: Numbered List               │
│ Source: Static Template           │
│                          [Edit] [✕]│
└───────────────────────────────────┘
```

**Properties:**
```typescript
interface ListComponent {
  id: string;
  type: 'list';

  // Identity
  path: string;
  label: string;

  // List Type
  listType: 'ordered' | 'unordered';
  startNumber?: number;       // For ordered lists

  // Source
  source: 'prop' | 'computed' | 'static';
  dataPath?: string;          // Array path in data
  staticItems?: string[];     // Hardcoded list items
  template?: string;          // Template with variables

  // Display
  showLabel: boolean;
  labelPosition: 'above' | 'inline';

  // Formatting
  bulletStyle?: 'disc' | 'circle' | 'square' | 'none';
  numberStyle?: 'decimal' | 'alpha' | 'roman';
  indent: number;             // px
  itemSpacing: number;        // px between items
}
```

**Render Output:**
```html
<!-- Ordered List -->
<div class="list-component">
  <div class="list-label">Interventions Recommended</div>
  <ol class="list-content">
    <li>Individual psychotherapy (60 minutes weekly)</li>
    <li>Psychiatric medication management</li>
    <li>Care coordination with primary care physician</li>
  </ol>
</div>

<!-- Unordered List -->
<ul class="list-content list-bullets">
  <li>Deep breathing exercises</li>
  <li>Grounding techniques</li>
  <li>Social support contacts</li>
</ul>
```

---

### 5. Table Component

**What it is:** Structured data in rows/columns

**Visual in Builder:**
```
┌───────────────────────────────────┐
│ 📊 Diagnostic Impressions         │
│ Type: Table (4 columns)           │
│ Source: AI Generated              │
│                          [Edit] [✕]│
└───────────────────────────────────┘
```

**Properties:**
```typescript
interface TableComponent {
  id: string;
  type: 'table';

  // Identity
  path: string;
  label: string;

  // Structure
  columns: TableColumn[];

  // Source
  source: 'prop' | 'ai';
  dataPath?: string;          // Array of objects path
  prompt?: string;            // AI generates array
  context?: string[];

  // Display
  showLabel: boolean;
  showHeaders: boolean;

  // Styling
  borders: 'all' | 'rows' | 'none';
  alternateRows: boolean;     // Zebra striping
  headerBackground: string;
  headerTextColor: string;
  cellPadding: number;
}

interface TableColumn {
  id: string;
  header: string;             // Column header text
  field: string;              // Key in data object
  width?: string;             // "auto", "100px", "25%"
  align: 'left' | 'center' | 'right';
}
```

**Render Output:**
```html
<div class="table-component">
  <div class="table-label">Diagnostic Impressions</div>
  <table class="table-content">
    <thead>
      <tr>
        <th>ICD-10</th>
        <th>DSM-5</th>
        <th>Description</th>
        <th>Criteria</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>F33.1</td>
        <td>296.32</td>
        <td>Major Depressive Disorder, Recurrent, Moderate</td>
        <td>Depressed mood, loss of interest, weight changes...</td>
      </tr>
    </tbody>
  </table>
</div>
```

---

### 6. Grid Component

**What it is:** Multi-column layout for fields (like Mental Status Exam)

**Visual in Builder:**
```
┌───────────────────────────────────┐
│ 🔲 Mental Status Exam             │
│ Layout: 2 Column Grid             │
│ Contains: 11 fields               │
│                          [Edit] [✕]│
└───────────────────────────────────┘
```

**Properties:**
```typescript
interface GridComponent {
  id: string;
  type: 'grid';

  // Identity
  path: string;
  label: string;

  // Layout
  columns: number;            // 2, 3, or 4
  columnGap: number;          // px
  rowGap: number;             // px

  // Content
  fields: FieldComponent[];   // Fields arranged in grid

  // Display
  showLabel: boolean;

  // Styling
  cellBackground: string;
  cellBorder: boolean;
  cellPadding: number;
}
```

**Render Output:**
```html
<div class="grid-component">
  <div class="grid-label">Mental Status Exam</div>
  <div class="grid-content grid-2col">
    <div class="grid-cell">
      <span class="cell-label">Appearance:</span>
      <span class="cell-value">well-groomed</span>
    </div>
    <div class="grid-cell">
      <span class="cell-label">Behavior:</span>
      <span class="cell-value">cooperative</span>
    </div>
    <!-- ... more cells -->
  </div>
</div>
```

---

### 7. Alert/Highlight Component

**What it is:** Highlighted box for important info (like Chief Complaint)

**Visual in Builder:**
```
┌───────────────────────────────────┐
│ ⚠️ Chief Complaint                │
│ Style: Warning (Yellow)           │
│ Source: AI Generated              │
│                          [Edit] [✕]│
└───────────────────────────────────┘
```

**Properties:**
```typescript
interface AlertComponent {
  id: string;
  type: 'alert';

  // Identity
  path: string;
  label: string;

  // Source
  source: 'ai' | 'prop' | 'computed';
  prompt?: string;
  context?: string[];
  dataPath?: string;

  // Style
  variant: 'info' | 'warning' | 'error' | 'success';
  showIcon: boolean;

  // Colors (preset or custom)
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  borderLeft: boolean;        // Accent bar on left

  // Formatting
  fontSize: 'inherit' | 'small' | 'medium' | 'large';
  padding: number;
}
```

**Render Output:**
```html
<div class="alert alert-warning">
  <strong class="alert-label">CHIEF COMPLAINT</strong>
  <p class="alert-content">"I've been feeling really anxious and overwhelmed."</p>
</div>
```

---

### 8. Divider Component

**What it is:** Visual separator between sections

**Visual in Builder:**
```
┌───────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ Divider                           │
└───────────────────────────────────┘
```

**Properties:**
```typescript
interface DividerComponent {
  id: string;
  type: 'divider';

  // Style
  style: 'solid' | 'dashed' | 'dotted' | 'double';
  thickness: number;          // px
  color: string;

  // Spacing
  marginTop: number;          // px
  marginBottom: number;       // px

  // Width
  width: number;              // percentage (100 = full width)
}
```

**Render Output:**
```html
<hr class="divider divider-solid" style="border-top: 2px solid #d1d5db; margin: 20px 0;" />
```

---

### 9. Image Component

**What it is:** Logo, signature, diagram, etc.

**Visual in Builder:**
```
┌───────────────────────────────────┐
│ 🖼️ Facility Logo                  │
│ Source: Static URL                │
│ Align: Center                     │
│                          [Edit] [✕]│
└───────────────────────────────────┘
```

**Properties:**
```typescript
interface ImageComponent {
  id: string;
  type: 'image';

  // Source
  source: 'url' | 'base64' | 'path';
  imageUrl?: string;
  imageData?: string;         // Base64 encoded

  // Display
  alt: string;                // Alt text
  width?: number;             // px or %
  height?: number;
  align: 'left' | 'center' | 'right';

  // Spacing
  marginTop: number;
  marginBottom: number;
}
```

**Render Output:**
```html
<div class="image-component" style="text-align: center;">
  <img src="https://..." alt="Facility Logo" style="width: 200px;" />
</div>
```

---

### 10. Spacer Component

**What it is:** Empty space for layout control

**Visual in Builder:**
```
┌───────────────────────────────────┐
│ [  20px vertical space  ]         │
└───────────────────────────────────┘
```

**Properties:**
```typescript
interface SpacerComponent {
  id: string;
  type: 'spacer';

  // Size
  height: number;             // px
}
```

**Render Output:**
```html
<div class="spacer" style="height: 20px;"></div>
```

---

## Theme System

### Theme Definition

```typescript
interface Theme {
  id: string;
  name: string;

  // Typography
  typography: {
    fontFamily: string;           // "Open Sans", "Arial", "Times New Roman"
    baseFontSize: number;         // pt (10, 11, 12)
    lineHeight: number;           // 1.4, 1.6, 1.8

    // Heading sizes
    h1Size: number;               // pt
    h2Size: number;
    h3Size: number;

    // Text styles
    bodyColor: string;            // #1a1a1a
    linkColor: string;
    strongWeight: number;         // 600, 700
  };

  // Colors
  colors: {
    primary: string;              // Main brand color
    secondary: string;
    accent: string;

    // Semantic colors
    success: string;              // #10b981
    warning: string;              // #f59e0b
    error: string;                // #ef4444
    info: string;                 // #3b82f6

    // Neutral colors
    gray50: string;
    gray100: string;
    gray200: string;
    gray300: string;
    gray500: string;
    gray700: string;
    gray900: string;
  };

  // Spacing
  spacing: {
    unit: number;                 // Base unit (4px, 8px)
    sectionGap: number;           // Between sections
    fieldGap: number;             // Between fields
    paragraphGap: number;         // Between paragraphs
  };

  // Borders
  borders: {
    defaultColor: string;
    defaultWidth: number;         // px
    defaultStyle: 'solid' | 'dashed';
    radius: number;               // Border radius for cards/alerts
  };

  // Page Layout
  page: {
    maxWidth: string;             // "8.5in", "100%"
    padding: number;              // px
    backgroundColor: string;
  };

  // Component Defaults
  defaults: {
    sectionTitleTransform: 'uppercase' | 'capitalize' | 'none';
    sectionBorderBottom: boolean;
    fieldLabelPosition: 'above' | 'left';
    tableBorders: 'all' | 'rows' | 'none';
    tableAlternateRows: boolean;
  };
}
```

### Preset Themes

```typescript
const PRESET_THEMES: Theme[] = [
  {
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
  },

  {
    id: 'compact',
    name: 'Compact',
    typography: {
      fontFamily: 'Arial, sans-serif',
      baseFontSize: 11,
      lineHeight: 1.3,
      // ... smaller sizes, tighter spacing
    }
  },

  {
    id: 'formal-clinical',
    name: 'Formal Clinical',
    typography: {
      fontFamily: 'Times New Roman, serif',
      baseFontSize: 12,
      lineHeight: 1.6,
      // ... traditional medical formatting
    }
  }
];
```

---

## Preview System

### Live Preview in Builder

```
┌─────────────────────────────────────────────────────┐
│ Template Builder                           Preview ▼ │
├──────────────────┬──────────────────────────────────┤
│  Building        │  [Preview Pane]                  │
│  Canvas          │                                  │
│                  │  ┌────────────────────────────┐ │
│  [Sections...]   │  │ Patient: Maria Rodriguez   │ │
│                  │  │ DOB: 03/15/1996            │ │
│                  │  │ Age: 28                    │ │
│                  │  ├────────────────────────────┤ │
│                  │  │ CHIEF COMPLAINT            │ │
│                  │  │ "I've been anxious..."     │ │
│                  │  ├────────────────────────────┤ │
│                  │  │ Subjective                 │ │
│                  │  │  HPI: Maria Rodriguez is...│ │
│                  │  └────────────────────────────┘ │
│                  │                                  │
│                  │  Uses actual theme CSS          │
│                  │  Shows final output appearance  │
└──────────────────┴──────────────────────────────────┘
```

**How it Works:**

1. **User adds/edits components** in builder
2. **Preview regenerates** with sample data
3. **Applies current theme** CSS
4. **Shows exactly** what will be uploaded to EMR

**Implementation:**
```typescript
function generatePreview(template: Template, theme: Theme): string {
  // Convert template to SimplGen format
  const { interface, sourceMap } = convertToSimplGenFormat(template);

  // Use sample data
  const sampleData = generateSampleData(template);

  // Generate note with SimplGen engine
  const note = await generateNote(sampleData, sourceMap);

  // Render with theme
  const html = renderWithTheme(note, theme);

  return html;
}
```

---

## Component Palette Organization

### Palette UI

```
┌────────────────────┐
│ Component Palette  │
├────────────────────┤
│ 📦 LAYOUT          │
│  • Section         │
│  • Grid            │
│  • Divider         │
│  • Spacer          │
├────────────────────┤
│ 📝 CONTENT         │
│  • Text Field      │
│  • Narrative       │
│  • List            │
│  • Table           │
├────────────────────┤
│ 🎨 SPECIAL         │
│  • Alert Box       │
│  • Image           │
├────────────────────┤
│ 🔧 DATA            │
│  • Prop Field      │
│  • Computed Field  │
│  • AI Field        │
│  • Static Value    │
└────────────────────┘
```

---

## Summary

### Component Types We Support:
1. ✅ Section (container)
2. ✅ Field (single value)
3. ✅ Narrative (multi-paragraph)
4. ✅ List (ordered/unordered)
5. ✅ Table (rows/columns)
6. ✅ Grid (multi-column fields)
7. ✅ Alert (highlighted box)
8. ✅ Divider (separator)
9. ✅ Image (logos/signatures)
10. ✅ Spacer (layout control)

### Theme Controls:
- Typography (fonts, sizes, weights)
- Colors (primary, semantic, grays)
- Spacing (sections, fields, paragraphs)
- Borders (width, style, color, radius)
- Page layout (width, padding)
- Component defaults

### Preview System:
- Live preview pane
- Uses real theme CSS
- Shows final EMR output
- Updates as you build

**This gives users complete control over appearance while building templates.**
