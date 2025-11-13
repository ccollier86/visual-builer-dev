# Visual Builder Ideation (Biopsych Template Reference)

## Goals
- Provide an interactive editor for note templates (starting with the biopsych intake template) that lets authors drag/drop sections, configure AI slots, and define input collections in a single UI.
- Mirror the structure defined in `note-template.schema.json` (layout + inputCollections) so what you see is what the pipeline consumes.
- Support both render layout (final note) and form layout (patient/clinician inputs). Users should be able to switch contexts and reuse components across contexts.

## Core Panels / Elements
1. **Component Palette**
   - Layout primitives: header, section, paragraph, list, table, signature block, alert panel.
   - Form primitives: field, section, group, note block, multi-column row.
   - Custom registries: references to SHADCN controls, bespoke molecules.

2. **Template Tree / Outline**
   - Reflects `template.layout` hierarchy + `inputCollections` simultaneously.
   - Shows sections, nested children, and form steps. Selecting a node focuses properties panel.

3. **Canvas**
   - WYSIWYG preview for both note layout and form layout.
   - Should support responsive breakpoints and print preview toggles.

4. **Properties Panel**
   - Context-aware editor for the selected element.
   - Field metadata (paths, controls, validation, defaults).
   - Layout options (labels, colors, style hints, form layout columns/notes).

5. **Data / Schema Panel**
   - Shows AI slots, target paths, `aiDeps`, validation constraints.
   - Quick links to sample data entries (biopsych JSON).

6. **Actions Toolbar**
   - Undo/redo, version compare, JSON export, preview with sample data.
   - Lint diagnostics surfaced inline (ties into template linter).

## Workflow Stages
1. **Layout Editing**
   - Use biopsych template as baseline; authors can edit sections like “Subjective”, “Objective”, etc.
   - Drag list/table components, assign slot IDs, configure AI guidance.

2. **Form Authoring**
   - Switch to form view to define patient vs. clinician intake collections.
   - Visual steps (multi-step wizard). Configure auto-save, storage hints, audience flags.

3. **Validation / Preview**
   - Run template lint + schema validation from UI.
   - Render preview with sample data (biopsych JSON) using the existing builder pipeline.

4. **Publish / Version**
   - Save template versions, attach release notes, and push to pipeline.

## Next Steps
- Define component schema for palette entries.
- Map biopsych sections + intake forms into builder-friendly JSON (baseline template sample).
- Plan drag/drop interactions and storage of intermediate state (likely via Zustand or similar store).
- Design integration points with Form Factory SDK (component registry + renderer) for live previews.
