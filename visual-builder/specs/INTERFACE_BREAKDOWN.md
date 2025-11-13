# Visual Builder Interface Breakdown

This document decomposes the full builder UI into concrete components. Each section includes:
- ASCII layout sketch
- Feature list & sub-components
- Interaction rules, state, and data dependencies

The goal is to make every portion of the UI implementable as a discrete component from our Form Factory registry and shared design system.

---

## 1. Global Layout (Desktop)
```
+--------------------------------------------------------------------------------+
| Top Toolbar / Mode Switch / Status                                            |
| | Palette Sidebar | | Outline + Canvas (3-col capable) | | Inspector Panel |  |
| |                 | |                                  | |                  |  |
| |                 | |                                  | |                  |  |
+--------------------------------------------------------------------------------+
| Bottom Bar (lint summary, JSON preview toggle, autosave indicator)            |
+--------------------------------------------------------------------------------+
```
**Key Notes**
- Layout uses 12-column grid: Palette (3 cols), Canvas/Outline (6), Inspector (3).
- Canvas supports inner 3-column subgrid for primitives; Outline docks left of canvas content and can collapse.
- Bottom bar is optional for print/export views but always visible during editing.

---

## 2. Top Toolbar & Mode Switch
```
+----------------------------------------------------------------------------+
| LOGO | Template Name | Version Badge | [Render Template] [Attached Forms]  |
|----------------------------------------------------------------------------|
| Undo | Redo | Compare | Preview Data | Lint Status | Export | Share Link   |
+----------------------------------------------------------------------------+
```
**Sub-components & Features**
1. **Template Identity**
   - Displays editable title + slug; inline version badge.
   - Links to audit trail modal.
2. **Mode Switch Pills**
   - Toggles palette/canvas/inspector between render + forms contexts.
   - Shows per-mode validation dot (green/yellow/red).
3. **Action Cluster**
   - Undo/Redo history (keyboard shortcuts aware).
   - Compare: opens side-by-side diff vs previous version/snippet import.
   - Preview Data: choose mock dataset (biopsych sample, faker seed).
   - Lint Status: button with count; opens diagnostics drawer.
   - Export: dropdown (JSON bundle, push to repo, share preview link).
   - Share Link: generates read-only URL, copies to clipboard.

States & Behaviors
- Toolbar remains sticky.
- Mode switch dispatches global state change event (`builderContextChanged`).
- Lint status polls validation engine; clicking surfaces errors/warnings.

---

## 3. Compact Context Switcher
```
Toolbar right side:
[ Render Template | Attached Forms ]
```
**Why**
- Keeps canvas area unobstructed so the preview always mirrors the final output.
- Mode switch handles global render vs. form authoring; specific form management (selecting which collection to edit, attaching new ones) lives entirely in the left panel, keeping responsibilities clear.

**Features**
- Segmented control mirrors the global mode (render vs forms) and shows per-mode validation dot.
- When “Attached Forms” is active, the canvas + palette swap to form authoring mode; the currently selected form is highlighted in the left sidebar collection list.
- Tooltip drip shows current dataset, autosave cadence, and handler for the active form so users can confirm context without leaving the toolbar, but all switching/attaching happens in the sidebar.

This approach keeps the main view lean and prioritizes the WYSIWYG canvas, aligning with our “powerful but not overwhelming” requirement.

---

## 4. Palette Sidebar
```
+-----------------------------+
| ▾ Form Collections          |
|   • Clinical Intake         |
|   • Prescreen               |
|   (+ Attach Form)           |
|-----------------------------|
| Search [___________]        |
|-----------------------------|
| ▾ Primitives                |
|   • Section                 |
|   • Paragraph               |
|   • Table (3-col)           |
|   • Alert Panel             |
|-----------------------------|
| ▾ Snippets                  |
|   • Standard Header         |
|   • Signature Block         |
|-----------------------------|
| ▾ Templates                 |
|   • Biopsych Baseline       |
|   • SOAP Progress Note      |
+-----------------------------+
```
**Features & Workings**
1. **Form Collections Stack**
   - Lives at the top of the sidebar; lists attached forms with status dots.
   - Provides quick switch buttons so authors can hop between forms without reaching for the toolbar dropdown.
   - Inline `+ Attach Form` button opens the attach modal; entries support context menus for rename, duplicate, detach.
2. **Search Bar**
   - Typeahead across primitives/snippets/dictionary entries.
   - Keyboard navigation (arrow + enter) for quick drop.
3. **Accordion Sections**
   - Remember collapsed state per user.
   - Each primitive tile shows icon + short description.
   - Drag-and-drop initiates with visual ghost using component preview.
4. **Dictionary Access (via search)**
   - Typing field names/synonyms surfaces virtual tiles that, when dragged, create bound primitives.
   - Full dictionary management lives elsewhere (dictionary service); here we only expose quick inserts for binding.
4. **Context Sensitivity**
   - In Forms mode, primitives list swaps to field controls, dictionary filters to available collections, snippets show form blocks.

Implementation Notes
- Powered by registry metadata; new components appear when registered with `builderMeta` (icon, description, allowed contexts).
- Drag manager enforces valid drop zones (no forms components in render mode).

---

## 5. Outline + Canvas Area
```
+------------------------------------------------------------------------+
| +-------------+ +---------------------------------------------------+  |
| | Outline     | | Canvas (3-column capable)                         |  |
| |-------------| | +----------------+ +----------------+ +----------+ |  |
| | • Header    | | | Column A       | | Column B       | | Column C| |  |
| |   ◦ Meta    | | | (Assessment)   | | (Vitals)       | | (...)   | |  |
| | • Section 1 | | +----------------+ +----------------+ +----------+ |  |
| |   ◦ Para    | |                                                       |
| |   ◦ Table   | |                                                       |
| | • Section 2 | |                                                       |
+------------------------------------------------------------------------+
```
**Outline Features**
- Hierarchical tree showing sections, subsections, primitives.
- Icons indicate node type (text, AI block, table, form field).
- Drag handles for reordering; drop cues show allowed placements.
- Context menu: duplicate, wrap, convert, jump to inspector, isolate view.

**Canvas Features**
- Real renderer (render mode) or Form Factory form renderer (form mode).
- Grid overlay toggle (1/2/3 columns). Authors can add row layout primitive to divide area; columns accept primitives/snippets.
- Hover mini-toolbar: `Duplicate | Wrap | Delete | Move`. Moves open multi-column placement UI.
- Sample data chip top-right opens dataset chooser.
- Multi-select via shift-click/drag marquee.

**State/Data**
- Canvas nodes map to template JSON nodes; editing updates shared store.
- Outline selection syncs to canvas highlight and inspector focus.

---

## 6. Inspector Panel
### 6.1 Document Settings (always visible)
```
┌ Template Meta ───────────────────────────────┐
| Name [____________________]                  |
| Slug [____________________]  Version [1.0.0] |
| Owner [dropdown]  Tags [pill editor]         |
├ Prompt Composer ─────────────────────────────┤
| System Prompt [textarea w/ helper text]      |
| Main Prompt   [textarea]                     |
| Rules (chips)                                |
|  • PERSONALIZATION  (✎) (✕)                 |
|  • NARRATIVE DEPTH  (✎) (✕)                |
|  [+ Add Rule]                                |
├ Input Collections ───────────────────────────┤
| [☑] Clinical Intake    sample: 120 entries   |
| [☑] Prescreen Intake   sample: 348 entries   |
| [ ] Assessment Scores                          |
| [+ Add Collection] (opens dictionary modal)  |
├ Style & Tokens ──────────────────────────────┤
| Font [Open Sans ▾]   Base Size [12]          |
| Color [●]  Muted [●]  Accent [●] (color pickers)|
| Spacing [slider]  Table Density [Normal ▾]   |
| Print Size [Letter ▾]  Margin [0.75in]       |
| [☑ Header]  [☑ Footer]                      |
├ Submission / Handlers ───────────────────────┤
| Endpoint [Single Submission ▾]               |
| Handler [biopsych-handler ▾]                 |
| Workflow Hooks [checklist]                   |
└──────────────────────────────────────────────┘
```
- Covers every root-level property in the biopsych schema (id/name/versions handled via meta row, style object via Style & Tokens, prompt object via Prompt Composer, input collections + submission metadata).
- `+ Add Rule` button inserts a new rule text input inline, fulfilling the “button that adds another AI rule” requirement.
- Color pickers and number steppers reuse shared components from the design system.

### 6.2 Form Settings (conditional accordion)
```
┌ Form Settings: Clinical Intake ─────────────┐
| Form Label [Clinical Intake]                |
| Description [textarea]                      |
| Instruction Hint [textarea]                 |
| Autosave [Off ▾ every 30s ▾ custom ▾]       |
| Visibility [Clinician / Patient toggles]    |
| Validators                                  |
|  • Required (☑)                             |
|  • Pattern  [/regex/] (✕)                   |
|  [+ Add Validator]                          |
| Submission Handler [dropdown]               |
└────────────────────────────────────────────┘
```
- Appears only when in forms mode and a form collection is selected.
- `+ Add Validator` spawns inline inputs for rule type + parameters.

### 6.3 Selection Accordions (context-aware)
```
┌ Selection Controls ────────────────────────────┐
| ▾ Content                                      |
|   Mode: (• Static) (○ AI) (○ Lookup) (○ Computed)
|   Guidance Editor [rich text]                  |
|   AI Rules                                     |
|     • Required narrative length  (severity ▾)  |
|     • Include coping attempts       (severity ▾)|
|     [+ Add AI Rule]                            |
|   Prompt Snippet [textarea]                    |
|   Formula Builder (when Computed) [expression editor + preview]
| ▾ Data                                         |
|   Binding [dictionary dropdown w/ search]      |
|   Sources [multi-select]                       |
|   Fallback Strategy [select + textarea]        |
|   Formatter [dropdown + props panel]           |
| ▾ Behavior                                     |
|   Display Conditions (builder: if/then blocks) |
|   Repeatable Group [toggle + min/max inputs]   |
|   Audience Visibility [Clinician/Patient]      |
| ▾ Design                                       |
|   Typography Token [dropdown]                  |
|   Color Token [dropdown or color picker]       |
|   Margin/Padding sliders                       |
|   Background/Border toggles                    |
└───────────────────────────────────────────────┘
```
- Accordions keep all configuration options visible within a single scroll context, matching the broader inspector vocabulary (document + form accordions) and reducing context switching.
- Sections can be individually collapsed so authors only see what they need; advanced panes (Behavior, Design) stay tucked away unless explicitly opened.
- `+ Add AI Rule` still lives inside the Content accordion, mirroring the schema’s rules array.
- Data accordion references the dictionary with inline search; Design surfaces token/color controls so overrides map back to the `style` object.

### 6.4 Additional Notes
- Analyzer panel to the right of tabs shows lint feedback for the currently selected node (missing targetPath, unbound lookup, etc.).
- Inspector scrolls independently and remains pinned so authors can edit long prompts without losing canvas context.
- Keyboard shortcuts: `⌘+Shift+[` to collapse/expand accordions, `⌘+Enter` to apply changes.

---

## 7. Bottom Bar
```
+----------------------------------------------------------------------------+
| Autosave: ON (last saved 0:32) | Diagnostics: 2 warnings | [View JSON]     |
+----------------------------------------------------------------------------+
```
Features
- Shows autosave status + ability to toggle manual mode (per permissions).
- Diagnostics summary mirrors toolbar badge; clicking jumps to issue list.
- `View JSON` opens side drawer with read-only template/form schema.
- Environment badge (dev/stage/prod) for clarity.

---

## 8. Component Catalog
For each major UI section we define a canonical component.

### 8.1 `BuilderToolbar`
- Props: `context`, `title`, `slug`, `version`, `lintStatus`, `mockDatasets`.
- Emits events: `onModeChange`, `onPreview`, `onExport`, `onShare`.
- Sub-components: `ModeSwitch`, `HistoryCluster`, `PreviewButton`, `LintIndicator`, `ExportMenu`.

### 8.2 `ContextSwitcherControl`
- Props: `mode`, `formModeStatus`.
- Handles toggling between Render Template and Attached Forms views and surfacing per-mode validation dots.
- Sub-components: `ModeSegmentedControl`, `ModeStatusIndicator`.
- No attach/select affordances here; the sidebar `FormCollectionsList` is the canonical place for managing forms.

### 8.3 `PalettePanel`
- Props: `registryEntries`, `snippets`, `templates`, `dictionaryEntries`, `mode`, `formMetas`, `activeFormId`.
- Sub-components: `FormCollectionsList`, `PaletteSearch`, `PaletteAccordion`, `PaletteTile`, `DictionaryQuickResult`.
- Handles `onFormSelect`, `onAttachForm`, and `onFormContextAction` (rename/duplicate/detach) so the sidebar is the canonical hub for managing attached forms.

### 8.4 `OutlineTree`
- Props: `nodes`, `selectedId`, `expandedIds`.
- Sub-components: `TreeNode`, `NodeActions`, `DragHandle`.
- Keyboard shortcuts: arrow navigation, space to focus, delete to remove.

### 8.5 `RenderCanvas`
- Props: `layoutTree`, `mode`, `dataSet`, `selection`, `gridConfig`.
- Sub-components: `CanvasColumn`, `CanvasRow`, `NodeOverlay`, `MultiSelectBox`, `DataPreviewChip`.
- Connects to renderer engine (render mode) / Form Factory form renderer (forms mode).

### 8.6 `InspectorPanel`
- Props: `documentSettings`, `selection`, `dictionary`, `tokens`, `validationState`.
- Sub-components: `DocumentAccordion`, `FormSettingsAccordion`, `InspectorTabs`, `RuleList`, `BindingPicker`, `TokenPicker`.

### 8.7 `BottomStatusBar`
- Props: `autosaveState`, `diagnostics`, `environment`.
- Sub-components: `AutosaveIndicator`, `DiagnosticsSummary`, `JsonToggle`.

---

## 9. Interaction Workflows
1. **Drag Primitive to Canvas**
   - Palette tile drag starts -> drag layer shows preview -> drop on valid zone -> create node -> focus inspector `Content` tab.
2. **Attach Form**
   - Click `+ Attach Form` in the sidebar Form Collections stack -> modal with collection select, labels, autosave, handler -> on confirm adds the form to the sidebar list, selects it, and (if not already) switches the mode toggle to Attached Forms so the palette/canvas swap accordingly.
3. **Create Multi-Column Row**
   - Select row layout primitive -> inspector shows column count slider (1-3) -> adjust -> each column becomes drop zone. Canvas renders columns with handles to adjust width ratio (1:1:1, 2:1:1, etc.).
4. **Bind Data via Dictionary**
   - Drag dictionary entry to paragraph -> drop attaches binding -> inspector `Data` tab displays field details -> user chooses formatter/fallback.
5. **Configure Autosave & Validators**
   - In forms mode select field -> `Form Settings` accordion shows label/hint/validator toggles -> choose `Auto-save every 30s`, set `Required`. Validation engine updates the status dot next to that form in the toolbar dropdown.
6. **Preview & Export**
   - Click `Preview Data` -> choose dataset -> renderer updates -> bottom bar shows "Preview: Biopsych Sample". Export writes JSON via same pipeline.

---

## 10. Schema Coverage Checklist
| Schema Area | UI Surface |
|-------------|------------|
| `id`, `name`, `version` | Document Settings → Template Meta row |
| `style` (font, colors, spacing, tableDensity, print) | Document Settings → Style & Tokens (color pickers, sliders, toggles) |
| `prompt.system`, `prompt.main`, `prompt.rules` | Document Settings → Prompt Composer (textareas + rule chips) |
| `layout[].children[].content[]` (all slots: static, lookup, ai, computed) | Canvas + Inspector tabs (Content/Data/Behavior/Design) per primitive |
| `guidance`, `constraints`, `styleHints` | Content tab (guidance editor, +Add AI Rule), Data tab (constraints), Design tab (style tokens) |
| `source`, `lookup`, `targetPath`, `outputPath`, `aiDeps` | Data tab binding dropdown + sources multi-select |
| Table maps (e.g., diagnostic impressions) | Table primitive modal + column-level inspector |
| `inputCollections` & submission metadata | Document Settings → Input Collections + Submission/Handlers |
| Snippets/static plan lists | Palette (Snippets) + Canvas static primitives |
| Signature block, header info, computed formulas | Palette components + Content/Data/Behavior tabs (computed mode exposes formula editor) |

This ensures the builder can author the entire biopsych-intake template JSON without leaving the UI.

---

## 10. Data & State Dependencies
- **Global Store**: holds template JSON, form collections, registry metadata, dictionary entries, tokens, lint results, undo stack.
- **Renderer Pipeline**: reused from production; builder passes layout tree + tokens + mock data for WYSIWYG output.
- **Validation Engine**: runs on each mutation; provides structured errors for toolbar and bottom bar.
- **Submission Config**: tied to composite submission client names; stored in document settings.

---

## 11. Accessibility & Responsiveness
- Palette and inspector collapse for smaller viewports; canvas becomes focus area.
- Keyboard shortcuts cover all key actions (drag via keyboard, reorder via outline).
- Color usage aligned with design tokens; high-contrast mode toggle in toolbar.

---

## 12. Outstanding Questions
- Should we allow more than 3 columns for specialized layouts?
- How do we surface snippet version drift warnings in the UI (palette vs inspector)?
- Do forms need side-by-side preview with render (split view) for QA, or is single mode swap sufficient?

---

## 13. Appendix – Micro Schematics for Key Controls

### A1. FormCollectionsList (Sidebar)
```
┌ Attached Forms ────────────────────────┐
| Clinical Intake      ● Ready   (⋮)     |
|   Autosave: 30s   Handler: default     |
| Prescreen Intake     ○ Warning (⋮)     |
|   Autosave: Off    Handler: custom     |
| [+ Attach Form]                         |
└────────────────────────────────────────┘
```
- Status dot mirrors lint severity; menu `(⋮)` offers rename/duplicate/detach.
- Clicking row selects the form and syncs canvas/inspector context.

### A2. Attach Form Modal
```
┌ Attach Form Collection ────────────────┐
| Collection Type [dropdown]             |
| Friendly Label [__________________]    |
| Description  [textarea]                |
| Autosave [Off ▾ Every 30s ▾ Custom ▾]  |
| Custom Interval (when selected) [ 45 ] |
| Audience [☑ Clinician] [☑ Patient]    |
| Submission Handler [dropdown]          |
| Validators                             |
|   • Required (☑)                       |
|   [+ Add Validator]                    |
| [Cancel]                [Attach Form]  |
└────────────────────────────────────────┘
```

### A3. Palette Search & Results
```
┌ Search Components ─────────────────────┐
| 🔍 type to search…                     |
| Primitives                             |
|  [Section] [Paragraph] [Table 3-col]   |
| Snippets                               |
|  [Standard Header] [Signature Block]   |
| Data Matches                           |
|  [Clinical Intake ▸ Current Stressors] |
└────────────────────────────────────────┘
```

### A4. Snippet Tile Detail
```
┌ Signature Block ──────────────┐
| Desc: Provider signature row  |
| Tokens: header-accent         |
| [Drag Handle]   [Preview ▸]   |
└───────────────────────────────┘
```

### A5. AI Rule Stack
```
AI Rules
[PERSONALIZATION | Severity: Error ▾ | ✎ | ✕]
[NARRATIVE DEPTH  | Severity: Warn  ▾ | ✎ | ✕]
[+ Add AI Rule]
```
- Add opens inline inputs: `[Rule text ____] [Severity ▾] [Save]`.

### A6. Prompt / Guidance Editor
```
Guidance
┌─────────────────────────────┐
| Use direct quotes for chief |
| complaint…                  |
└─────────────────────────────┘
Tokens: [patient.name] [provider.fullName]
```

### A7. Formula Builder (Computed Slot)
```
┌ Formula Builder ───────────────────────┐
| Expression                            |
| [ facility.city + ', ' + facility... ]|
| Preview: Springfield, IL 62704         |
| Data Browser ▾ (patient, facility, …)  |
└────────────────────────────────────────┘
```

### A8. Binding Picker + Sources
```
Binding
┌──────────────────────────────┐
| 🔍 search field name         |
| Biopsych Intake              |
|   • Current Stressors        |
|   • Support Network          |
| Clinical Intake              |
|   • Diagnoses[].code         |
└──────────────────────────────┘

Sources
[✓] clinical_intake.structured.chiefComplaint
[✓] patient_intake.primaryConcerns
[ ] assessments.gad7
```

### A9. Fallback & Formatter Panel
```
Fallback Strategy [Use fallback text ▾]
┌──────────────────────────┐
| If empty, output "N/A"   |
└──────────────────────────┘
Formatter [Date ▾]
┌──────────────┐
| Pattern: MMM d, yyyy |
└──────────────┘
```

### A10. Behavior Conditions
```
Display Conditions
IF [Field ▾] [equals ▾] [value ____]
AND [Collection ▾] [has data]
Logic: [All ▾]
[+ Add Condition]
```

### A11. Repeatable Group Controls
```
Repeatable Group [☑ Enable]
Min Items [ 1 ]   Max Items [ 4 ]
Empty State Text [________________]
```

### A12. Design Overrides
```
Typography Token [Body/Medium ▾]
Color Token      [Accent-1 ▾] [🎨]
Margin [─●────]  Padding [─●────]
Background [None ▾]  Border [Solid ▾]
```

### A13. Table Column Editor
```
┌ Table Columns ─────────────────────────┐
| # | Header         | Type   | Binding |
| 1 | ICD-10         | AI     | …       |
| 2 | DSM-5 Code     | Lookup | …       |
| 3 | Description    | Lookup | …       |
| 4 | Criteria       | AI     | …       |
| [ + Add Column ]                        |
└────────────────────────────────────────┘
```

### A14. Validator Stack (Form Settings)
```
Validators
[Required] (☑)
[Pattern ] (/^[A-Z]{2}\d+/)  (✎) (✕)
[+ Add Validator]
```

### A15. Autosave Selector
```
Autosave
(•) Off   ( ) Every 30s   ( ) Custom
Custom Interval: [ 45 ] seconds
```

These schematics capture the “little pieces” so implementation stays aligned with the intended interaction patterns.

---

## 14. Schema Enforcement & Mock Data Strategy

### 14.1 Enforcing `note-template.schema.json`
- **Schema-coupled component registry**: every primitive/snippet advertises `allowedSlots`, `propsSchema`, and `styleConstraints`. The builder only allows configuration options that exist in the schema (e.g., `alertPanel.props.variant` must be one of the enum values defined under `layout.*.props.variant`).
- **Realtime validation**: mutations pass through a schema-aware middleware that runs AJV (or our existing schema-validator) against the entire template. Errors bubble to the toolbar/bottom bar and inline badges, preventing export while violations remain.
- **Lint rules for limitations**: tie into `template-linter` and `TEMPLATE_LIMITATIONS.md` so things like “AI slots must specify `source`” or “computed formulas require previewable paths” surface as warnings/errors immediately.
- **Target path guardrails**: Data binding picker only exposes valid `targetPath` slots discovered from the schema; it validates types (string vs array) to stop invalid placements (e.g., trying to drop an array field into a string target).
- **Style tokens + design system**: Style & Tokens accordion maps 1:1 to the `style` object — fonts, colors, spacing, tableDensity, print settings. Inputs enforce ranges/defaults from schema (e.g., spacing must be numeric, print margin uses `pattern: ^\d+(\.\d+)?(in|cm)$`).
- **Computed/formula safety**: formula builder parses expressions and checks referenced fields against schema paths before allowing save, ensuring we don’t reference undefined data.
- **Export gate**: “Review & Export” runs schema validation + lint sweeps; download/publish buttons stay disabled until both pass. This is how we “build out perfectly” per the canonical schema.

### 14.2 Render Fidelity
- Canvas uses the same renderer (`src/factory/.../renderer.ts`) plus design tokens so what we see matches the eventual PDF/HTML output.
- Multi-column layout uses section/row primitives defined in schema so print + responsive behavior stay in sync.
- Style overrides (typography tokens, colors, background) map directly into `styleHints` / `style` fields stored alongside layout nodes, ensuring any design tweak is encoded in the template JSON.

### 14.3 Mock Data / Faker Strategy for AI & Preview Slots
- **Collection-driven fakes**: create a `mockDataProvider` module that reads `inputCollections` (clinical intake, prescreen, assessments) and generates representative objects. Use `@faker-js/faker` plus curated sample libraries (e.g., canonical DSM narratives) keyed to field types.
- **Slot-aware generation**:
  - *Lookup slots*: pull from mock collection data; when array types, auto-pick 1‑3 realistic entries.
  - *AI slots*: run through a lightweight heuristic generator (e.g., faker paragraphs seeded with context hints). Optionally, feed the mock data through our actual AI composition in “preview” mode for high fidelity, but default to deterministic filler so previews stay fast.
  - *Computed slots*: evaluate the formula using mock data; if any field missing, show fallback placeholder (“<missing facility.city>”).
  - *Static slots*: render as-is; builder shows them exactly as they’ll appear.
- **Section/subheading realism**: for headers, lists, plan sections, create seed data describing what “Clinical Formulation” or “Risk Assessment” should look like and feed into faker templates so previews feel clinically relevant (e.g., `faker.helpers.arrayElement` over curated sentences for Chief Complaint).
- **Preview dataset chooser**: toolbar “Preview Data” button lets authors pick from `m-rodriguez-biopsych-sample.json`, faker-generated data, or uploaded JSON to see real outputs.
- **Testing harness**: nightly job runs the schema + lint suite across exported templates using the same mock data provider, guaranteeing regressions are caught.

Together these steps enforce the document schema, respect its constraints, and provide believable preview data (even for AI-generated sections) so authors always see a realistic, valid note before publishing.

---

## 15. Canvas Interaction & Drag/Drop Implementation Plan

### 15.1 Goals
- Support three drag scenarios: (1) palette primitive/snippet → canvas placement; (2) outline/canvas reordering; (3) intra-canvas restructuring (wrapping in rows/columns, moving between columns).
- Leverage the in-house drag/drop reference (`visual-builder/reference-code/drag-drop`) for buttery animations, but tailor it to our column-aware canvas.
- Guarantee deterministic placement (no “appears at bottom” surprises) by snapping drops to explicit insertion markers.

### 15.2 Architecture Overview
1. **Drag Sources**
   - Palette tiles act as drag sources; on drag start we materialize a `dragPreview` card showing the primitive name + icon.
   - Canvas nodes (sections, paragraphs, tables) expose handles (☰) for reordering using the `useBlockReorder` hook from the reference lib; we wrap each column/list in its own hook instance so reorder math stays local.
2. **Drop Targets**
   - Canvas renders “insertion rails” between nodes. When dragging over, we highlight the target rail + show placement tooltip (“Drop into SUBSECTION · Column 2”).
   - For multi-column rows, each column provides nested rails; dropping onto an empty column auto-inserts at index 0.
3. **Reference Library Integration**
   - `useBlockReorder` handles reorder animations within a column/list. We extend it with a plugin that dispatches builder actions (insert, move, wrap) instead of directly mutating DOM order.
   - For palette → canvas drops, we still use the library’s smooth entry animation: after the insert action completes, call the hook’s `snapToIndex(newIndex)` helper so the item glides to its slot rather than popping.
   - Coordinates: containerSelector targets `.canvas-column[data-column-id="..." ]`; blockSelector targets `.canvas-node`. Handle selectors map to `.node-handle` spans.
4. **Outline Sync**
   - Outline uses the same reorder hook but in vertical mode only. On reorder events we update the shared layout tree, which automatically re-renders the canvas (ensuring both views stay in lockstep).
5. **Accessibility**
   - Keyboard reordering uses arrow keys + space to pick up/drop. We call into the same reorder actions, ensuring parity with pointer DnD.

### 15.3 Canvas Layout Rendering
- Canvas grid uses CSS subgrid: each row is a flex container with up to three `.canvas-column` children, each hosting `.canvas-node` items.
- Selected node overlay shows bounding box, quick actions (duplicate, wrap in row, delete), and the data binding summary.
- Grid overlay toggle (mentioned earlier) now also surfaces draggable hotspots for multi-column adjustments (drag gutter to change width ratio 1:1:1 → 2:1:1).
- When a snippet inserts multiple nodes, we animate them sequentially so authors can visually parse what happened.

### 15.4 Drag Error Handling / Guardrails
- Illegal drops (e.g., trying to drop a table inside a static header) snap back with shake animation + tooltip referencing schema rule.
- If a drop would exceed schema limits (e.g., more than N children), we show inline error and block insertion.
- Undo/redo integration: each drag operation dispatches a `builder.history.commit({ type: 'reorder', payload })` event so users can revert instantly.

### 15.5 Tuning Reference Implementation
- `visual-builder/reference-code/drag-drop/core` already supports configurable container/block selectors and GSAP animations. We’ll:
  - Add “ghost rails” API so hovering over gaps shows placeholder node; this is crucial for palette → canvas insert.
  - Extend `onReorder` payload to include `{fromColumn, toColumn}` so moving between columns is first-class.
  - Provide a `usePaletteDragPreview` helper that syncs with the same GSAP timeline so palette drags feel consistent with canvas reorders.

---

## 16. Raw Schema Editor & Diff View

### 16.1 Rationale
- Advanced users sometimes need to tweak JSON directly (e.g., bulk rename slots, edit formulas). We’ll expose a guarded editor so manual changes are possible without encouraging casual edits.

### 16.2 Access Flow
1. Toolbar button `View JSON` → opens drawer (read-only by default, showcasing syntax-highlighted template JSON with tree view).
2. “Unlock Editing” button requires confirmation dialog (“Manual edits bypass safeguards; continue?”). Once confirmed for the session, editor switches to writable mode.
3. Editor built with Monaco or CodeMirror 6 to get JSON schema validation + autocompletion. We feed `note-template.schema.json` into the editor so it highlights invalid structures inline.

### 16.3 Safeguards
- Every keystroke (debounced) runs the same schema + lint pipelines. Errors appear in an “Issues” gutter and the Save button disables until resolved.
- Manual edits update the global store; the canvas/outline rerender from the resulting AST so visual state stays in sync.
- Provide “Discard manual edits” button that reverts to the last valid state produced via UI interactions.

### 16.4 Diff & History
- Editor drawer includes a diff tab comparing current JSON vs. last exported version; green/red highlights help reviewers spot modifications.
- Save action automatically captures a history snapshot so undo/redo spans both UI-driven and manual changes.

### 16.5 Formatting & Tokens
- On save we run Prettier (or fast-json-stable-stringify) to normalize formatting, preventing noisy diffs.
- For large templates, we lazy-load only the necessary sections (virtualized editor) to keep performance snappy.

These additions round out the plan: best-in-class drag/drop tuned for our canvas, and a power-user JSON editor with guardrails that keep the template schema authoritative.
