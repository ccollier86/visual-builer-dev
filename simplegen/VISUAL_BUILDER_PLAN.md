# Visual Template Builder - Clear Plan

## What We're Building

A visual interface to create SimplGen templates without writing code.

---

## The Final Output

The builder produces **template JSON** that looks like:

```json
{
  "id": "template-123",
  "name": "My Custom SOAP Note",
  "type": "soap",
  "sections": [
    {
      "id": "header",
      "title": "Header",
      "order": 0,
      "fields": [
        {
          "id": "field-1",
          "path": "header.patient.name",
          "label": "Patient Name",
          "source": "prop",
          "dataPath": "patient.name",
          "fieldType": "string"
        },
        {
          "id": "field-2",
          "path": "header.patient.age",
          "label": "Patient Age",
          "source": "computed",
          "computation": "age-from-dob",
          "fieldType": "number"
        }
      ]
    },
    {
      "id": "subjective",
      "title": "Subjective",
      "order": 1,
      "fields": [
        {
          "id": "field-3",
          "path": "subjective.chiefComplaint",
          "label": "Chief Complaint",
          "source": "ai",
          "prompt": "Format the chief complaint as a quote...",
          "context": ["clinicalIntake.chiefComplaint"],
          "fieldType": "string"
        }
      ]
    }
  ],
  "theme": {
    "id": "clean-professional",
    "fontFamily": "Open Sans",
    "fontSize": "10pt"
  }
}
```

This JSON is then:
1. Saved to database
2. Converted to SimplGen template.ts format (interface + sourceMap)
3. Used to generate notes

---

## The UI Layout

```
┌─────────────────────────────────────────────────────────┐
│  Template Builder: My Custom SOAP Note       [Save]     │
├──────────────────┬──────────────────────────────────────┤
│  Component       │  Canvas                              │
│  Palette         │                                      │
│                  │  ┌──────────────────────────────┐   │
│  Drag from here: │  │ Header Section               │   │
│                  │  │  • Patient Name (prop)       │   │
│  [Section]       │  │  • Age (computed)            │   │
│  [Text Field]    │  │  [+ Add Field]               │   │
│  [Computed]      │  └──────────────────────────────┘   │
│  [AI Field]      │                                      │
│  [List]          │  ┌──────────────────────────────┐   │
│  [Table]         │  │ Subjective Section           │   │
│                  │  │  • Chief Complaint (AI)      │   │
│                  │  │  • HPI (AI)                  │   │
│                  │  │  [+ Add Field]               │   │
│                  │  └──────────────────────────────┘   │
│                  │                                      │
│                  │  [+ Add Section]                     │
│                  │                                      │
└──────────────────┴──────────────────────────────────────┘
```

---

## State Management (@xstate/store)

```typescript
// stores/templateBuilderStore.ts

import { createStore } from '@xstate/store';

const templateBuilderStore = createStore(
  {
    // Current template being edited
    template: {
      id: null,
      name: 'Untitled Template',
      type: 'custom',
      sections: [],
      theme: { id: 'default' }
    },

    // UI state
    selectedSectionId: null,
    selectedFieldId: null,
    isFieldEditorOpen: false
  },
  {
    // ===== SECTION ACTIONS =====

    addSection: (ctx, event: { section: Section }) => ({
      template: {
        ...ctx.template,
        sections: [...ctx.template.sections, event.section]
      }
    }),

    reorderSections: (ctx, event: { sectionIds: string[] }) => {
      // Reorder based on array of IDs
      const ordered = event.sectionIds
        .map((id, index) => {
          const section = ctx.template.sections.find(s => s.id === id);
          return section ? { ...section, order: index } : null;
        })
        .filter(Boolean);

      return {
        template: {
          ...ctx.template,
          sections: ordered
        }
      };
    },

    removeSection: (ctx, event: { sectionId: string }) => ({
      template: {
        ...ctx.template,
        sections: ctx.template.sections.filter(s => s.id !== event.sectionId)
      }
    }),

    updateSection: (ctx, event: { sectionId: string; updates: Partial<Section> }) => ({
      template: {
        ...ctx.template,
        sections: ctx.template.sections.map(s =>
          s.id === event.sectionId ? { ...s, ...event.updates } : s
        )
      }
    }),

    // ===== FIELD ACTIONS =====

    addField: (ctx, event: { sectionId: string; field: Field }) => ({
      template: {
        ...ctx.template,
        sections: ctx.template.sections.map(s =>
          s.id === event.sectionId
            ? { ...s, fields: [...s.fields, event.field] }
            : s
        )
      }
    }),

    reorderFields: (ctx, event: { sectionId: string; fieldIds: string[] }) => {
      return {
        template: {
          ...ctx.template,
          sections: ctx.template.sections.map(section => {
            if (section.id !== event.sectionId) return section;

            const ordered = event.fieldIds
              .map(id => section.fields.find(f => f.id === id))
              .filter(Boolean);

            return { ...section, fields: ordered };
          })
        }
      };
    },

    removeField: (ctx, event: { sectionId: string; fieldId: string }) => ({
      template: {
        ...ctx.template,
        sections: ctx.template.sections.map(s =>
          s.id === event.sectionId
            ? { ...s, fields: s.fields.filter(f => f.id !== event.fieldId) }
            : s
        )
      }
    }),

    updateField: (ctx, event: { sectionId: string; fieldId: string; updates: Partial<Field> }) => ({
      template: {
        ...ctx.template,
        sections: ctx.template.sections.map(section =>
          section.id === event.sectionId
            ? {
                ...section,
                fields: section.fields.map(field =>
                  field.id === event.fieldId
                    ? { ...field, ...event.updates }
                    : field
                )
              }
            : section
        )
      }
    }),

    // ===== UI ACTIONS =====

    selectSection: (ctx, event: { sectionId: string | null }) => ({
      selectedSectionId: event.sectionId
    }),

    selectField: (ctx, event: { fieldId: string | null }) => ({
      selectedFieldId: event.fieldId
    }),

    openFieldEditor: (ctx) => ({
      isFieldEditorOpen: true
    }),

    closeFieldEditor: (ctx) => ({
      isFieldEditorOpen: false,
      selectedFieldId: null
    })
  }
);
```

---

## The Drag-Drop Interactions

### Interaction 1: Drag Section from Palette → Canvas

**User Action:**
- User clicks and drags "Section" block from palette
- Drags over canvas
- Drops

**What Happens (GSAP):**
```javascript
// Palette item follows cursor
Draggable.create('.palette-section', {
  type: 'x,y',

  onDragEnd: function() {
    // Where did we drop?
    const dropX = this.endX;
    const dropY = this.endY;

    // Is cursor over canvas?
    const canvasEl = document.querySelector('.template-canvas');
    const canvasRect = canvasEl.getBoundingClientRect();

    const droppedOnCanvas = (
      dropX > canvasRect.left &&
      dropX < canvasRect.right &&
      dropY > canvasRect.top &&
      dropY < canvasRect.bottom
    );

    if (droppedOnCanvas) {
      // CREATE NEW SECTION IN STATE
      templateBuilderStore.send({
        type: 'addSection',
        section: {
          id: `section-${Date.now()}`,
          title: 'New Section',
          order: template.sections.length,
          fields: []
        }
      });

      // Animate palette item back to original position
      gsap.to(this.target, { x: 0, y: 0, duration: 0.3 });
    } else {
      // Not on canvas - snap back
      gsap.to(this.target, { x: 0, y: 0, duration: 0.3 });
    }
  }
});
```

**What Updates:**
- State: `sections` array gets new section object
- React: Re-renders canvas with new section
- Visual: New section appears in canvas with animation

### Interaction 2: Drag Field from Palette → Section

**User Action:**
- User drags "Text Field" from palette
- Hovers over "Header Section" in canvas
- Section highlights (shows it's a valid drop zone)
- Drops

**What Happens (GSAP):**
```javascript
Draggable.create('.palette-field', {
  type: 'x,y',

  onDrag: function() {
    // Highlight sections when hovering
    const sections = document.querySelectorAll('.section-card');
    sections.forEach(section => {
      const rect = section.getBoundingClientRect();
      const cursorOver = (
        this.x > rect.left && this.x < rect.right &&
        this.y > rect.top && this.y < rect.bottom
      );

      if (cursorOver) {
        section.classList.add('drop-target-active');
      } else {
        section.classList.remove('drop-target-active');
      }
    });
  },

  onDragEnd: function() {
    // Which section did we drop on?
    const sections = document.querySelectorAll('.section-card');
    let targetSectionId = null;

    sections.forEach(section => {
      const rect = section.getBoundingClientRect();
      const droppedHere = (
        this.endX > rect.left && this.endX < rect.right &&
        this.endY > rect.top && this.endY < rect.bottom
      );

      if (droppedHere) {
        targetSectionId = section.dataset.sectionId;
      }

      section.classList.remove('drop-target-active');
    });

    if (targetSectionId) {
      // CREATE NEW FIELD IN THAT SECTION
      const fieldType = this.target.dataset.fieldType; // 'text', 'computed', 'ai'

      templateBuilderStore.send({
        type: 'addField',
        sectionId: targetSectionId,
        field: createNewField(fieldType)
      });
    }

    // Reset palette item position
    gsap.to(this.target, { x: 0, y: 0, duration: 0.3 });
  }
});

function createNewField(type: string): Field {
  const baseField = {
    id: `field-${Date.now()}`,
    label: 'New Field',
    path: '',
    fieldType: 'string'
  };

  switch (type) {
    case 'text':
      return { ...baseField, source: 'prop', dataPath: '' };
    case 'computed':
      return { ...baseField, source: 'computed', computation: 'age-from-dob' };
    case 'ai':
      return { ...baseField, source: 'ai', prompt: '', context: [] };
    default:
      return { ...baseField, source: 'prop' };
  }
}
```

**What Updates:**
- State: Section's `fields` array gets new field object
- React: Re-renders section with new field
- Visual: New field appears in section with slide-in animation

### Interaction 3: Reorder Sections in Canvas

**User Action:**
- User clicks and drags "Subjective Section"
- Drags it above "Header Section"
- Blue line appears showing drop position
- Drops

**What Happens (GSAP):**
```javascript
Draggable.create('.section-card', {
  type: 'y',
  bounds: '.template-canvas',

  onDragStart: function() {
    // Visual feedback
    this.target.classList.add('is-dragging');
    gsap.to(this.target, {
      scale: 1.05,
      opacity: 0.9,
      boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
    });
  },

  onDrag: function() {
    // Show drop indicator between sections
    const sections = document.querySelectorAll('.section-card:not(.is-dragging)');
    const draggedY = this.y + this.target.offsetTop;

    sections.forEach(section => {
      const rect = section.getBoundingClientRect();
      const midpoint = rect.top + rect.height / 2;

      // Show line above or below based on cursor position
      if (draggedY < midpoint) {
        section.classList.add('drop-above');
        section.classList.remove('drop-below');
      } else {
        section.classList.add('drop-below');
        section.classList.remove('drop-above');
      }
    });
  },

  onDragEnd: function() {
    // Remove visual feedback
    this.target.classList.remove('is-dragging');
    gsap.to(this.target, { scale: 1, opacity: 1, boxShadow: 'none' });

    // Calculate new order from visual positions
    const allSections = Array.from(
      document.querySelectorAll('.section-card')
    );

    const positions = allSections.map(el => ({
      id: el.dataset.sectionId,
      top: el.getBoundingClientRect().top
    }));

    // Sort by position
    positions.sort((a, b) => a.top - b.top);

    // Extract ordered IDs
    const newOrder = positions.map(p => p.id);

    // UPDATE STATE
    templateBuilderStore.send({
      type: 'reorderSections',
      sectionIds: newOrder
    });

    // Remove all drop indicators
    document.querySelectorAll('.section-card').forEach(el => {
      el.classList.remove('drop-above', 'drop-below');
    });

    // Reset transforms
    gsap.set('.section-card', { y: 0 });
  }
});
```

**What Updates:**
- State: `sections` array reordered, `order` fields updated
- React: Re-renders sections in new order
- Visual: Sections animate to new positions

### Interaction 4: Reorder Fields within Section

**Same pattern as sections, but scoped to fields array within one section:**

```javascript
Draggable.create('.field-card', {
  type: 'y',
  bounds: function() {
    // Bound to parent section only
    return this.target.closest('.section-card');
  },

  onDragEnd: function() {
    const sectionId = this.target.closest('.section-card').dataset.sectionId;
    const fields = this.target.closest('.fields-list').querySelectorAll('.field-card');

    const positions = Array.from(fields).map(el => ({
      id: el.dataset.fieldId,
      top: el.getBoundingClientRect().top
    }));

    positions.sort((a, b) => a.top - b.top);
    const newOrder = positions.map(p => p.id);

    templateBuilderStore.send({
      type: 'reorderFields',
      sectionId,
      fieldIds: newOrder
    });

    gsap.set('.field-card', { y: 0 });
  }
});
```

---

## Smart Constraints

### Constraint 1: Fields Can't Leave Sections

```javascript
Draggable.create('.field-card', {
  type: 'y',

  // GSAP bounds keeps it inside parent
  bounds: function() {
    return this.target.closest('.section-card');
  }
});
```

The field physically can't be dragged outside its section.

### Constraint 2: Must Drop on Valid Zone

```javascript
onDragEnd: function() {
  const targetSection = findSectionUnderCursor(this.endX, this.endY);

  if (!targetSection) {
    // NOT dropped on valid zone - snap back
    gsap.to(this.target, { x: 0, y: 0 });
    return; // Don't update state
  }

  // Valid drop - update state
  templateBuilderStore.send({ ... });
}
```

### Constraint 3: Palette Items Always Snap Back

```javascript
// Palette items NEVER move permanently
// They always return to palette after drop
gsap.to(paletteItem, { x: 0, y: 0, duration: 0.3 });
```

---

## Component Structure (React)

```
app/template-builder/
├── page.tsx                    # Main page
└── components/
    ├── TemplateHeader.tsx      # Name, save, test buttons
    ├── ComponentPalette.tsx    # Left sidebar with draggable blocks
    ├── TemplateCanvas.tsx      # Main editing area
    ├── SectionCard.tsx         # Renders a section (draggable)
    ├── FieldCard.tsx           # Renders a field (draggable)
    ├── FieldEditorModal.tsx    # Edit field details (source, prompt, etc)
    └── PreviewButton.tsx       # Generate sample note
```

---

## Key Files to Create

### 1. Types
```typescript
// types/template.ts
export interface Template {
  id: string | null;
  name: string;
  type: 'soap' | 'dap' | 'biopsych' | 'custom';
  sections: Section[];
  theme: Theme;
}

export interface Section {
  id: string;
  title: string;
  order: number;
  fields: Field[];
}

export interface Field {
  id: string;
  path: string;
  label: string;
  source: 'prop' | 'computed' | 'ai';
  fieldType: 'string' | 'number' | 'boolean' | 'array' | 'object';

  // For prop fields
  dataPath?: string;

  // For computed fields
  computation?: 'age-from-dob' | 'full-address' | 'name-with-credentials';

  // For AI fields
  prompt?: string;
  context?: string[];
}

export interface Theme {
  id: string;
  name?: string;
  fontFamily?: string;
  fontSize?: string;
}
```

### 2. Store
```typescript
// stores/templateBuilderStore.ts
// (Already shown above)
```

### 3. Custom Hook
```typescript
// hooks/useTemplateBuilder.ts
import { useSelector } from './useStore';
import { templateBuilderStore } from '../stores/templateBuilderStore';

export function useTemplateBuilder() {
  const template = useSelector(
    templateBuilderStore,
    state => state.context.template
  );

  const selectedSectionId = useSelector(
    templateBuilderStore,
    state => state.context.selectedSectionId
  );

  return {
    template,
    selectedSectionId,
    addSection: (section) => templateBuilderStore.send({ type: 'addSection', section }),
    removeSection: (sectionId) => templateBuilderStore.send({ type: 'removeSection', sectionId }),
    addField: (sectionId, field) => templateBuilderStore.send({ type: 'addField', sectionId, field }),
    // ... more helper methods
  };
}
```

### 4. Converter (Template JSON → SimplGen Format)
```typescript
// utils/templateConverter.ts

export function convertToSimplGenFormat(template: Template): {
  interface: string;
  sourceMap: Record<string, SourceMapEntry>;
} {
  // Build TypeScript interface from sections/fields
  const interfaceCode = generateInterface(template);

  // Build sourceMap from fields
  const sourceMap = {};

  template.sections.forEach(section => {
    section.fields.forEach(field => {
      sourceMap[field.path] = {
        source: field.source,
        ...(field.dataPath && { dataPath: field.dataPath }),
        ...(field.prompt && { prompt: field.prompt }),
        ...(field.context && { context: field.context })
      };
    });
  });

  return { interface: interfaceCode, sourceMap };
}

function generateInterface(template: Template): string {
  // Convert flat field paths to nested structure
  // Generate TypeScript interface code
  // Return as string
}
```

---

## Summary: What's Actually Happening

1. **User drags from palette** → GSAP detects drop → Store adds JSON object → React re-renders
2. **User reorders in canvas** → GSAP calculates new positions → Store reorders array → React re-renders
3. **User clicks field** → Opens modal to edit (source, dataPath, prompt, etc.) → Updates JSON
4. **User clicks Save** → Converts template JSON to SimplGen format → Saves to database
5. **User clicks Preview** → Uses SimplGen engine with template → Shows generated note

**It's all just:**
- GSAP = Visual drag feedback + position calculation
- @xstate/store = JSON state management
- React = Render the JSON as UI
- SimplGen converter = JSON → template.ts file

No magic. Just animated JSON editing.

---

## Next Steps

1. Create the types
2. Create the store
3. Build TemplateCanvas with basic section rendering
4. Add GSAP to make sections draggable
5. Add ComponentPalette
6. Wire up palette → canvas drop
7. Add field dragging
8. Build FieldEditorModal
9. Create converter to SimplGen format
10. Test end-to-end
