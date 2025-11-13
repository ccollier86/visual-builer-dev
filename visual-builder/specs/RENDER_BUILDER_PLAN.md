# Visual Builder — Render-Focused Plan (Biopsych Template First)

## 1. Purpose & Scope
- Deliver a WYSIWYG builder that can author the final rendered note template (not just form schemas) while staying 1:1 with `note-template.schema.json`.
- Initial target is the biopsych template; architecture must generalize to all collections.
- Builder output must be portable into the pipeline renderer and enforce lint+schema guarantees so users cannot create invalid note layouts.

### Reference Packet (local copies)
All canonical specs needed to implement this builder now live in `visual-builder/specs/reference/`:
- `0 - MVP AI Clincal Note Generation.md`
- `1 - Note Template Specs.md`
- `2 - Structured Output Specs.md`
- `3 - Prompt Template Specs.md`
- `4 - Final Compoosition Spec.md`
- `5 - Design Token Specs.md`
- `6 - Note Factory Specs.md`
- `NOTE_TEMPLATE_REFERENCE.md`
- `NOTE_TEMPLATE_TUTORIAL.md`
- `TEMPLATE_LIMITATIONS.md`

Any contributor can open those files locally without hunting through the wider repo, keeping the plan and its source requirements bundled together.

## 2. Core Product Outcomes
1. **Render-perfect preview** – canvas mirrors the pipeline renderer using sample data (faker + real anonymized entries) and design tokens.
2. **Schema-safe authoring** – every UI action writes to an internal graph that validates against note template schemas and lint rules in real time.
3. **Data-friendly binding** – non-technical authors can bind sections to clinical data via a friendly dictionary, never touching raw collection/field names.
4. **Reusable experience pieces** – snippets, token presets, and base templates make consistent headers/footers, signature sets, etc. trivial to reuse.
5. **Workflow-aware export** – output packages with metadata (inputCollections, prompts, submission hooks) ready for the single submission endpoint + adapters.

### UI Framework Commitment (Mantine v8)
- **Component library**: All UI primitives (layout grid, accordions, tabs/segmented controls, modal, drawers, notifications) will use Mantine v8 to maintain consistency and speed up development.
- **Hooks**: rely on Mantine hooks like `useDisclosure`, `useToggle`, `useForm`, `useHotkeys`, and `useClipboard` for inspector panels, confirmation dialogs, keyboard shortcuts.
- **Theme integration**: builder theme extends Mantine’s theme provider, mapping Mantine color tokens to our design token schema (e.g., `theme.colors.brand[6]` ↔ document accent token). This ensures palette components and canvas overlays share the same design language.
- **Advanced components**: use Mantine’s `Tree`, `Sortable` (if available) or integrate our drag/drop while styling handles/rails with Mantine components; `Prism` for JSON preview with syntax highlighting; `CodeHighlightTabs` for showing schema diffs; `ColorPicker`, `Slider`, `SegmentedControl`, `NumberInput`, etc. for style editing.
- **Extensions**: leverage Mantine’s `modals` manager for unlock-confirmation flows, `notifications` for lint/validation alerts, and `Spotlight` (command palette) for quick navigation to sections/fields.
- **Customization**: where Mantine components need custom visuals (e.g., insertion rails), wrap them with Mantine `Box`/`Paper`/`Card` so theming and keyboard focus states remain consistent.

## 3. High-Level UX Structure
- **Left Palette Sidebar**
  - Accordions for `Primitives`, `Snippets`, `Templates`, and `Data Dictionary`.
  - Search at top for quick jumping (“signature”, “psych history”).
- **Center Canvas + Outline Overlay**
  - Live render surface powered by the Form Factory renderer (using demo data).
  - Optional tree/outline column to show hierarchy + allow drag reordering.
- **Right Inspector**
  - Document-level settings (title, prompt, tokens, data sources).
  - Context-aware inspector for the selected primitive (content, AI/lookup bindings, design, behavior).
  - Validation + preview controls.
- **Top Toolbar**
  - Undo/redo, mode switch (render vs structure), lint status, export/share, “Preview with data” modal.

## 4. Palette Details
### 4.1 Primitives
- Section, subsection, paragraph, list, table, bullet cluster, alert/panel, signature block, divider.
- Each primitive carries defaults for padding, typography tokens, and data slots.
- Primitives are backed by the shared component library/Form Factory registry so anything dropped on the canvas is guaranteed renderable; new components only need registry metadata (props schema, design tokens, default bindings) to be exposed in the palette.

### 4.2 Snippets Library
- Header/footer bundles, consent statements, signature rows, insurance disclosure, clinician summary, etc.
- Dragging a snippet instantiates multiple primitives (e.g., header + metadata row) with locked bindings/tokens.
- Snippet metadata stores version, dependencies (tokens, dictionary paths), and edit locks (prevent accidental edits to legal copy).

### 4.3 Base Templates
- Pre-built biopsych, SOAP, simple progress note. Selecting one seeds the canvas + metadata in one click.
- Provide side-by-side diff vs current doc to avoid losing edits.

### 4.4 Data Dictionary Panel
- Human-friendly list grouped by collection (e.g., “Biopsych Intake → Current Stressors”).
- Cards display field type, availability (patient, clinician, AI), and sample value chip.
- Drag-and-drop binding: dropping on canvas attaches to hovered primitive, dropping on blank spawns default paragraph bound to that field.
- Dictionary search matches synonyms/aliases to hide raw field names.

## 5. Canvas Behavior
- Uses real renderer + mock data to show final PDF-like layout (including fonts, tokens, spacing).
- Hover actions: minimal toolbar (duplicate, wrap, delete, move) to avoid clutter.
- Selection syncs with outline + inspector; multi-select for batch operations (set token, convert to AI-driven, etc.).
- Reordering via drag handles or outline list; animations make structure changes obvious.
- Breakpoint toggle (print, desktop, narrow) to ensure layout integrity.
- Support up to three columns per row (e.g., assessments + vitals + signatures) using the same responsive grid the pipeline renderer ships with, so authors can drag primitives into side-by-side slots without touching CSS.

## 6. Inspector Architecture
### 6.1 Document Settings (top accordion)
- Name, slug, version, owner, tags.
- `inputCollections` picker with descriptions + sample counts.
- Primary prompt & supporting instructions (ties into prompt-composer).
- Submission behavior: default endpoint or custom handler key (for composite client), logging toggles, workflow hooks.
- Global design tokens (font stack, base size, colors, spacing scale, watermark options).

### 6.2 Selection Inspector
Tabs or nested accordions:
1. **Content** – choose static text, AI generated, or data lookup. When AI: select context sources (global data, custom query, manual prompt). Add rule chips (severity + text) inline.
2. **Data** – show current bindings, fallback strategies, formatters (dates, bulletization, joiners).
3. **Behavior** – conditional display (rules referencing dictionary), repeatable groups, dependency awareness.
4. **Design** – token pickers for typography, colors, margins, background, border styles. Show when overrides deviate from defaults.

### 6.3 Table/Composite Editor
- Table primitive opens modal to define columns/rows quickly (name, type, binding, width).
- Column-level inspector inherits same Content/Data/Design sections.

### 6.4 Validation & Guidance
- Inline lint badges referencing template lint rules (e.g., missing `inputCollections`, unbound AI slot, rule without severity).
- “Schema Preview” drawer reveals generated JSON for advanced users.

## 7. Data Dictionary System
- Backed by schema describing collections, friendly labels, descriptions, sample data fetchers, allowed operations (lookup, aggregate, AI context).
- Supports aliasing (e.g., “Therapist Name” -> `clinicianProfile.fullName`).
- Provides simple API for builder to request data for previews or to constrain inspector dropdowns.
- Allows attaching guidance text (“Collected during Pre-Screen; single entry per patient”) surfaced in tooltips.

## 8. AI Guidance & Rule Builder
- Every primitive supports AI state: `Static`, `AI Generated`, `Hybrid` (manual leading text + AI tail).
- When AI is selected, UI prompts for: context (collections + filters), instructions snippet, guardrails (max length, tone), quality checks (required fields, escalate on missing data).
- Rule builder is minimal: free-text input + severity (info/warning/error) + optional auto-fix flag. Displayed as chips.

## 9. Snippets & Design Tokens Interplay
- Snippets define required tokens; when dropped, builder checks whether document tokens satisfy prerequisites. If not, offer to import token overrides.
- Token inspector shows preview swatches and updates canvas live. Provide revert-to-default + “apply to entire document” options.

## 10. Layout Editing & Tree Management
- Outline tree lists every node with icons; supports drag reorder, wrap/unwrap, convert (paragraph → list) operations.
- Bulk operations: multi-select nodes to apply shared settings (e.g., mark as clinician-only, change color token).
- History stack captures structure + inspector edits for undo/redo.

## 11. Validation + Export Flow
1. Realtime validation hooks into existing lint rules (`form.collection.*`, `form.field.*`, render-specific rules).
2. “Review & Export” button runs full schema validation, displays blocking vs non-blocking issues.
3. Export payload includes:
   - Template JSON (layout + metadata + prompts).
   - Token overrides + snippet references.
   - Submission adapter config (if custom handlers attached).
4. Provide option to push directly into repo (git integration) or download JSON bundle.

## 12. Ensuring Final Render Product Readiness
- Canvas is powered by the same renderer used for final PDFs, guaranteeing fidelity.
- Builder enforces completion of all render-required fields (title, sections, tokens) before export.
- Data bindings rely on dictionary definitions, so final template always points to resolvable paths.
- Users can preview final rendered HTML/PDF with actual sample data to confirm before publishing.

## 13. Submission Endpoint & Adapters
- Document-level settings map to the single submission endpoint; builder emits handler hints (e.g., `onSubmit: biopsych-handler`).
- Composite submission client picks handler based on template slug; builder lets authors choose from approved handlers or request new ones.
- Supports attaching workflow metadata (e.g., notify care team, enqueue follow-up) without duplicating endpoints.

## 14. Implementation Phases
1. **Data foundation** – define dictionary schema + sample data services; expose lint metadata via API.
2. **Renderer integration** – embed Form Factory renderer, wire mock data + token previews.
3. **Palette/snippet system** – implement registry + drag/drop interactions + snippet metadata.
4. **Inspector + validation** – build document & selection inspector, connect to lint engine.
5. **Export + submission config** – finalize JSON mapping, integrate with repo pipeline + submission adapters.
6. **UX polish** – guided mode, tooltips, accessibility, theme cleanup.

## 15. Attached Form Collections Within the Same UI
- **Mode toggle + status bar**: add a pill switch (e.g., "Render Template" / "Attached Forms") in the top toolbar. Switching modes swaps the palette, canvas renderer, outline, and inspector while retaining shared metadata (tokens, prompts, submission settings) at the document level.
- **Two-column context indicator**: directly under the toolbar, show two compact cards—`Main Document` and the currently focused form collection. Cards display validation state and key metadata (collection name, autosave status). A "+ Attach Form" button on the card stack opens a modal to create/select collections, choose audience, autosave cadence, and submission behaviors.
- **Palette swapping**: when the Forms context is active the left sidebar replaces render primitives/snippets with form-centric components (input field, lookup, repeater, signature capture, consent checkbox, etc.) plus form snippets (e.g., “Demographics block”). Data dictionary entries filter to fields relevant for that collection and continue to support drag/drop binding.
- **Inspector adjustments**:
  - Document tab persists but gains a `Form Settings` accordion whenever a collection is focused (label, helper text, hint badges, validators, autosave toggles, notes/visibility flags, submission hook selection).
  - Primitive inspector surfaces form options: control type, placeholder/defaults, binding path (dictionary pick or custom), validators (required, regex, length), conditional logic, repeatable group settings, error messaging, accessibility hints.
- **Canvas renderer**: in Forms mode, render via Form Factory’s form renderer to preview interactive controls using mock data. Provide quick simulation actions ("Fill with sample", "Trigger validation") so authors can test flows without leaving the builder.
- **Shared outline**: tree lists both render sections and attached form steps; forms appear under their collection card and support drag reorder, duplication, and conversion between question types.
- **Linked metadata**: selecting any form element highlights its data binding + corresponding `inputCollections` entry. Inspector shows the resulting schema fragment so authors always know how submissions map into the pipeline.

## 16. Open Questions
- How to version snippets/snippet dependencies (semantic version vs timestamp)?
- Do we need collaborative editing (multi-user presence) in v1?
- What is the minimum viable dataset for mock previews (single exemplar per collection or faker rules)?
- Should users be able to edit raw JSON in-app, or is read-only preview sufficient?
