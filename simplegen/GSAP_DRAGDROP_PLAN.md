# GSAP Drag-Drop Implementation Plan

## What This Document Covers

1. **GSAP Setup** - How to initialize and configure GSAP Draggable
2. **Drag Interactions** - Each type of drag operation
3. **Visual Feedback** - Animations and indicators
4. **State Updates** - How drag events trigger state changes
5. **Edge Cases** - Handling complex scenarios

---

## GSAP Setup & Configuration

### Installation

```bash
npm install gsap
```

### Registration (React)

```typescript
// app/template-builder/page.tsx
'use client';

import { gsap } from 'gsap';
import { Draggable } from 'gsap/Draggable';

// Register plugin once at app level
gsap.registerPlugin(Draggable);
```

### Core Pattern

```typescript
useEffect(() => {
  // Initialize draggables
  const instances = Draggable.create('.draggable-item', {
    type: 'x,y',  // or just 'y' for vertical

    onDragStart: function() {
      // Visual feedback when drag starts
    },

    onDrag: function() {
      // Visual feedback during drag (drop indicators)
    },

    onDragEnd: function() {
      // Calculate new position/order
      // Update state
      // Reset visuals
    }
  });

  // Cleanup
  return () => instances.forEach(d => d.kill());
}, [dependencies]);
```

---

## Drag Interaction 1: Palette → Canvas (Create Section)

### Scenario

User drags "Section" block from palette and drops it on canvas to create a new section.

### Implementation

```typescript
// components/ComponentPalette.tsx
useEffect(() => {
  const paletteSections = Draggable.create('.palette-section', {
    type: 'x,y',

    // Keep palette item visual during drag
    // Don't actually move it - create ghost instead
    onPress: function() {
      createGhost(this.target);
    },

    onDragStart: function() {
      // Show valid drop zones
      document.querySelector('.template-canvas')
        .classList.add('accepting-section');
    },

    onDrag: function() {
      // Move ghost, not palette item
      updateGhostPosition(this.x, this.y);

      // Highlight canvas if cursor over it
      const canvas = document.querySelector('.template-canvas');
      const canvasRect = canvas.getBoundingClientRect();
      const cursorX = this.x + this.target.offsetLeft;
      const cursorY = this.y + this.target.offsetTop;

      const isOverCanvas = (
        cursorX > canvasRect.left &&
        cursorX < canvasRect.right &&
        cursorY > canvasRect.top &&
        cursorY < canvasRect.bottom
      );

      if (isOverCanvas) {
        canvas.classList.add('drop-target-active');

        // Show insertion point
        showInsertionLine(cursorY);
      } else {
        canvas.classList.remove('drop-target-active');
        hideInsertionLine();
      }
    },

    onDragEnd: function() {
      // Check if dropped on canvas
      const canvas = document.querySelector('.template-canvas');
      const canvasRect = canvas.getBoundingClientRect();
      const dropX = this.endX + this.target.offsetLeft;
      const dropY = this.endY + this.target.offsetTop;

      const droppedOnCanvas = (
        dropX > canvasRect.left &&
        dropX < canvasRect.right &&
        dropY > canvasRect.top &&
        dropY < canvasRect.bottom
      );

      if (droppedOnCanvas) {
        // Calculate insertion index based on Y position
        const insertIndex = calculateInsertionIndex(dropY);

        // CREATE NEW SECTION
        templateBuilderStore.send({
          type: 'addSection',
          section: {
            id: `section-${Date.now()}`,
            title: 'New Section',
            order: insertIndex,
            fields: []
          }
        });

        // Animate ghost into place
        animateGhostToPosition(insertIndex);
      }

      // Cleanup
      removeGhost();
      canvas.classList.remove('accepting-section', 'drop-target-active');
      hideInsertionLine();

      // Reset palette item (it never moved)
      gsap.set(this.target, { x: 0, y: 0 });
    }
  });

  return () => paletteSections.forEach(d => d.kill());
}, []);

// Helper: Create ghost element
function createGhost(paletteItem: HTMLElement) {
  const ghost = paletteItem.cloneNode(true) as HTMLElement;
  ghost.id = 'drag-ghost';
  ghost.style.position = 'fixed';
  ghost.style.pointerEvents = 'none';
  ghost.style.opacity = '0.8';
  ghost.style.zIndex = '9999';
  document.body.appendChild(ghost);
}

function updateGhostPosition(x: number, y: number) {
  const ghost = document.getElementById('drag-ghost');
  if (ghost) {
    ghost.style.left = `${x}px`;
    ghost.style.top = `${y}px`;
  }
}

function removeGhost() {
  const ghost = document.getElementById('drag-ghost');
  if (ghost) ghost.remove();
}

function calculateInsertionIndex(dropY: number): number {
  const sections = Array.from(
    document.querySelectorAll('.template-canvas .section-card')
  );

  // Find which section the drop is closest to
  let insertIndex = sections.length; // Default: append to end

  sections.forEach((section, index) => {
    const rect = section.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;

    if (dropY < midpoint && index < insertIndex) {
      insertIndex = index;
    }
  });

  return insertIndex;
}

function showInsertionLine(y: number) {
  let line = document.getElementById('insertion-line');
  if (!line) {
    line = document.createElement('div');
    line.id = 'insertion-line';
    line.style.position = 'absolute';
    line.style.height = '3px';
    line.style.backgroundColor = '#3b82f6';
    line.style.left = '0';
    line.style.right = '0';
    line.style.zIndex = '1000';
    document.querySelector('.template-canvas')?.appendChild(line);
  }

  line.style.top = `${y}px`;
  line.style.display = 'block';
}

function hideInsertionLine() {
  const line = document.getElementById('insertion-line');
  if (line) line.style.display = 'none';
}
```

### Visual Flow

```
1. User presses on palette "Section"
   → Ghost element created
   → Follows cursor

2. User drags over canvas
   → Canvas highlights (border glow)
   → Blue insertion line appears

3. User releases
   → If on canvas: New section created at insertion point
   → If not on canvas: Nothing happens
   → Ghost animates away
   → Palette item stays in place
```

---

## Drag Interaction 2: Palette → Section (Create Field)

### Scenario

User drags "Text Field" from palette and drops it into a specific section to add a new field.

### Implementation

```typescript
// components/ComponentPalette.tsx
useEffect(() => {
  const paletteFields = Draggable.create('.palette-field', {
    type: 'x,y',

    onPress: function() {
      createGhost(this.target);
    },

    onDragStart: function() {
      // Highlight all sections as potential drop zones
      document.querySelectorAll('.section-card')
        .forEach(section => section.classList.add('accepting-field'));
    },

    onDrag: function() {
      const cursorX = this.x + this.target.offsetLeft;
      const cursorY = this.y + this.target.offsetTop;

      // Check which section cursor is over
      const sections = document.querySelectorAll('.section-card');
      let hoveredSection = null;

      sections.forEach(section => {
        const rect = section.getBoundingClientRect();
        const isOver = (
          cursorX > rect.left &&
          cursorX < rect.right &&
          cursorY > rect.top &&
          cursorY < rect.bottom
        );

        if (isOver) {
          section.classList.add('drop-target-active');
          hoveredSection = section;

          // Show insertion line within section
          const fieldsContainer = section.querySelector('.fields-list');
          if (fieldsContainer) {
            const insertY = calculateFieldInsertY(fieldsContainer, cursorY);
            showFieldInsertionLine(fieldsContainer, insertY);
          }
        } else {
          section.classList.remove('drop-target-active');
        }
      });

      if (!hoveredSection) {
        hideFieldInsertionLine();
      }
    },

    onDragEnd: function() {
      const dropX = this.endX + this.target.offsetLeft;
      const dropY = this.endY + this.target.offsetTop;

      // Find section dropped on
      const sections = document.querySelectorAll('.section-card');
      let targetSectionId = null;
      let insertIndex = 0;

      sections.forEach(section => {
        const rect = section.getBoundingClientRect();
        const droppedOnSection = (
          dropX > rect.left &&
          dropX < rect.right &&
          dropY > rect.top &&
          dropY < rect.bottom
        );

        if (droppedOnSection) {
          targetSectionId = section.dataset.sectionId;

          // Calculate field insertion index
          const fieldsContainer = section.querySelector('.fields-list');
          if (fieldsContainer) {
            insertIndex = calculateFieldInsertIndex(fieldsContainer, dropY);
          }
        }
      });

      if (targetSectionId) {
        // CREATE NEW FIELD
        const fieldType = this.target.dataset.fieldType;

        templateBuilderStore.send({
          type: 'addField',
          sectionId: targetSectionId,
          field: createFieldByType(fieldType, insertIndex)
        });
      }

      // Cleanup
      removeGhost();
      document.querySelectorAll('.section-card').forEach(section => {
        section.classList.remove('accepting-field', 'drop-target-active');
      });
      hideFieldInsertionLine();
      gsap.set(this.target, { x: 0, y: 0 });
    }
  });

  return () => paletteFields.forEach(d => d.kill());
}, []);

function createFieldByType(type: string, order: number): Field {
  const baseField = {
    id: `field-${Date.now()}`,
    label: 'New Field',
    path: '',
    order,
    fieldType: 'string' as const
  };

  switch (type) {
    case 'text':
      return { ...baseField, source: 'prop' as const, dataPath: '' };
    case 'computed':
      return { ...baseField, source: 'computed' as const, computation: 'age-from-dob' };
    case 'ai':
      return { ...baseField, source: 'ai' as const, prompt: '', context: [] };
    default:
      return { ...baseField, source: 'prop' as const };
  }
}
```

---

## Drag Interaction 3: Reorder Sections in Canvas

### Scenario

User drags an existing section to reorder it within the canvas.

### Implementation

```typescript
// components/TemplateCanvas.tsx
useEffect(() => {
  if (!sections.length) return;

  const sectionDraggables = Draggable.create('.section-card', {
    type: 'y',
    bounds: '.template-canvas',

    onDragStart: function() {
      // Mark as dragging
      this.target.classList.add('is-dragging');

      // Visual feedback
      gsap.to(this.target, {
        duration: 0.2,
        scale: 1.05,
        opacity: 0.9,
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
        zIndex: 1000
      });
    },

    onDrag: function() {
      // Get dragged element's visual Y position
      const draggedTop = this.target.getBoundingClientRect().top;

      // Find all other sections
      const sections = Array.from(
        document.querySelectorAll('.section-card:not(.is-dragging)')
      ) as HTMLElement[];

      // Show drop indicators
      sections.forEach(section => {
        const rect = section.getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;

        // Clear previous indicators
        section.classList.remove('drop-above', 'drop-below');

        // Add indicator based on position
        if (draggedTop < midpoint) {
          section.classList.add('drop-above');
        } else {
          section.classList.add('drop-below');
        }
      });
    },

    onDragEnd: function() {
      // Visual cleanup
      this.target.classList.remove('is-dragging');
      gsap.to(this.target, {
        duration: 0.3,
        scale: 1,
        opacity: 1,
        boxShadow: 'none',
        zIndex: 1
      });

      // Calculate new order from DOM positions
      const allSections = Array.from(
        document.querySelectorAll('.section-card')
      ) as HTMLElement[];

      const positions = allSections.map(section => ({
        id: section.dataset.sectionId!,
        top: section.getBoundingClientRect().top
      }));

      // Sort by visual position
      positions.sort((a, b) => a.top - b.top);

      // Extract ordered IDs
      const newOrder = positions.map(p => p.id);

      // UPDATE STATE
      templateBuilderStore.send({
        type: 'reorderSections',
        sectionIds: newOrder
      });

      // Remove drop indicators
      allSections.forEach(section => {
        section.classList.remove('drop-above', 'drop-below');
      });

      // Reset GSAP transforms
      gsap.set('.section-card', { y: 0 });
    }
  });

  return () => sectionDraggables.forEach(d => d.kill());
}, [sections.length]); // Re-init when section count changes
```

### CSS for Drop Indicators

```css
/* Drop above indicator */
.section-card.drop-above::before {
  content: '';
  position: absolute;
  top: -2px;
  left: 0;
  right: 0;
  height: 4px;
  background: #3b82f6;
  border-radius: 2px;
  z-index: 10;
}

/* Drop below indicator */
.section-card.drop-below::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  right: 0;
  height: 4px;
  background: #3b82f6;
  border-radius: 2px;
  z-index: 10;
}

/* Section being dragged */
.section-card.is-dragging {
  cursor: grabbing !important;
  border: 2px dashed #3b82f6;
}
```

---

## Drag Interaction 4: Reorder Fields Within Section

### Scenario

User drags a field up or down within its parent section.

### Implementation

```typescript
// components/SectionCard.tsx
useEffect(() => {
  if (!section.fields.length) return;

  const fieldDraggables = Draggable.create(
    `.section-${section.id} .field-card`,
    {
      type: 'y',

      // CONSTRAINT: Can only drag within parent section
      bounds: function() {
        return this.target.closest('.fields-list');
      },

      onDragStart: function() {
        this.target.classList.add('is-dragging');
        gsap.to(this.target, {
          duration: 0.2,
          scale: 1.03,
          opacity: 0.8,
          boxShadow: '0 5px 15px rgba(0, 0, 0, 0.2)'
        });
      },

      onDrag: function() {
        const draggedTop = this.target.getBoundingClientRect().top;
        const fields = Array.from(
          this.target.closest('.fields-list')!
            .querySelectorAll('.field-card:not(.is-dragging)')
        ) as HTMLElement[];

        fields.forEach(field => {
          const rect = field.getBoundingClientRect();
          const midpoint = rect.top + rect.height / 2;

          field.classList.remove('drop-above', 'drop-below');

          if (draggedTop < midpoint) {
            field.classList.add('drop-above');
          } else {
            field.classList.add('drop-below');
          }
        });
      },

      onDragEnd: function() {
        this.target.classList.remove('is-dragging');
        gsap.to(this.target, {
          duration: 0.3,
          scale: 1,
          opacity: 1,
          boxShadow: 'none'
        });

        // Calculate new field order within this section
        const fieldsContainer = this.target.closest('.fields-list');
        const allFields = Array.from(
          fieldsContainer!.querySelectorAll('.field-card')
        ) as HTMLElement[];

        const positions = allFields.map(field => ({
          id: field.dataset.fieldId!,
          top: field.getBoundingClientRect().top
        }));

        positions.sort((a, b) => a.top - b.top);
        const newOrder = positions.map(p => p.id);

        // UPDATE STATE
        templateBuilderStore.send({
          type: 'reorderFields',
          sectionId: section.id,
          fieldIds: newOrder
        });

        // Cleanup
        allFields.forEach(field => {
          field.classList.remove('drop-above', 'drop-below');
        });
        gsap.set(`.section-${section.id} .field-card`, { y: 0 });
      }
    }
  );

  return () => fieldDraggables.forEach(d => d.kill());
}, [section.fields.length]);
```

---

## Smart Constraints

### Constraint 1: Fields Can't Escape Section

```typescript
bounds: function() {
  // Field can only move within its parent section
  return this.target.closest('.section-card');
}
```

GSAP physically prevents dragging outside bounds.

### Constraint 2: Palette Items Never Move

```typescript
// Palette items create ghosts, then snap back
onDragEnd: function() {
  // Always reset to origin
  gsap.set(this.target, { x: 0, y: 0 });
}
```

### Constraint 3: Invalid Drops Do Nothing

```typescript
onDragEnd: function() {
  if (!isValidDropTarget()) {
    // Don't update state
    // Just cleanup visuals
    return;
  }

  // Valid drop - proceed with state update
  store.send({ ... });
}
```

---

## Visual Feedback Summary

### During Drag

| Visual | When | CSS Class | Appearance |
|--------|------|-----------|------------|
| Item scaling | Drag starts | `.is-dragging` | Scale 1.05, opacity 0.9 |
| Shadow | Dragging | Inline style | `0 10px 30px rgba(0,0,0,0.3)` |
| Drop zone highlight | Cursor over | `.drop-target-active` | Border glow blue |
| Insertion line | Hovering between | `.insertion-line` | 3px blue line |
| Drop above | Over item top half | `.drop-above::before` | Blue line above |
| Drop below | Over item bottom half | `.drop-below::after` | Blue line below |

### Animations

```typescript
// Drag start
gsap.to(element, {
  duration: 0.2,
  scale: 1.05,
  opacity: 0.9,
  boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
  ease: 'power2.out'
});

// Drag end
gsap.to(element, {
  duration: 0.3,
  scale: 1,
  opacity: 1,
  boxShadow: 'none',
  ease: 'power2.out'
});

// New item appears
gsap.from(newElement, {
  duration: 0.4,
  opacity: 0,
  y: -20,
  ease: 'back.out(1.7)'
});

// Item removed
gsap.to(removedElement, {
  duration: 0.3,
  opacity: 0,
  x: 100,
  onComplete: () => removedElement.remove()
});
```

---

## State Update Flow

### Pattern

```
1. User performs drag gesture
   ↓
2. GSAP detects dragEnd
   ↓
3. Calculate new order from visual positions
   ↓
4. Send action to @xstate/store
   ↓
5. Store updates JSON
   ↓
6. React re-renders
   ↓
7. GSAP resets transforms (y: 0)
   ↓
8. Items appear in new order
```

### Example

```typescript
// Step 3: Calculate
const positions = elements.map(el => ({
  id: el.dataset.id,
  top: el.getBoundingClientRect().top
}));
positions.sort((a, b) => a.top - b.top);
const newOrder = positions.map(p => p.id);

// Step 4: Send action
store.send({ type: 'reorderSections', sectionIds: newOrder });

// Step 7: Reset (after React re-renders)
gsap.set('.section-card', { y: 0 });
```

---

## Edge Cases & Solutions

### Edge Case 1: Rapid Clicks/Drags

**Problem:** User clicks multiple times fast, creates duplicate draggables

**Solution:**
```typescript
let isDragging = false;

onDragStart: function() {
  if (isDragging) return;
  isDragging = true;
  // ... drag logic
},

onDragEnd: function() {
  // ... cleanup
  isDragging = false;
}
```

### Edge Case 2: React Re-render During Drag

**Problem:** React re-renders, DOM nodes change, GSAP loses reference

**Solution:**
```typescript
// Don't re-init during drag
const [isDragging, setIsDragging] = useState(false);

useEffect(() => {
  if (isDragging) return; // Skip re-init if drag in progress

  const draggables = Draggable.create(...);
  return () => draggables.forEach(d => d.kill());
}, [items, isDragging]);
```

### Edge Case 3: Empty Section (No Fields)

**Problem:** Can't calculate insertion index if section has no fields

**Solution:**
```typescript
function calculateFieldInsertIndex(fieldsContainer, dropY) {
  const fields = fieldsContainer.querySelectorAll('.field-card');

  if (fields.length === 0) {
    return 0; // First field
  }

  // ... normal calculation
}
```

### Edge Case 4: Scrolling While Dragging

**Problem:** Canvas is scrollable, drag positions get out of sync

**Solution:**
```typescript
Draggable.create('.item', {
  type: 'y',

  // Update positions on scroll
  onDrag: function() {
    const scrollTop = document.querySelector('.template-canvas').scrollTop;
    const adjustedY = this.y + scrollTop;
    // Use adjustedY for calculations
  }
});
```

---

## Performance Optimization

### 1. Use `will-change` CSS

```css
.section-card,
.field-card {
  will-change: transform;
}
```

Tells browser to optimize for transform animations.

### 2. Debounce Indicator Updates

```typescript
import { debounce } from 'lodash';

const updateIndicators = debounce((y) => {
  showDropIndicator(y);
}, 16); // ~60fps

onDrag: function() {
  updateIndicators(this.y);
}
```

### 3. Limit Draggable Count

If 100+ sections, don't make them all draggable at once. Use virtualization or pagination.

---

## Testing Strategy

### Manual Tests

1. **Palette → Canvas**
   - Drag section from palette
   - Drop on empty canvas → Creates first section
   - Drop between sections → Inserts at correct position
   - Drop outside canvas → No action

2. **Palette → Section**
   - Drag field from palette
   - Drop on section → Creates field
   - Drop on section with fields → Inserts at correct position
   - Drop outside section → No action

3. **Reorder Sections**
   - Drag section up → Reorders correctly
   - Drag section down → Reorders correctly
   - Drag to same position → No change

4. **Reorder Fields**
   - Drag field up within section → Reorders
   - Drag field down within section → Reorders
   - Try to drag outside section → Blocked by bounds

### Automated Tests

```typescript
// Mock GSAP for tests
jest.mock('gsap', () => ({
  gsap: {
    to: jest.fn(),
    set: jest.fn(),
    registerPlugin: jest.fn()
  },
  Draggable: {
    create: jest.fn(() => [{ kill: jest.fn() }])
  }
}));

test('adds section when dropped on canvas', () => {
  // Simulate drag-drop
  const dropEvent = createDropEvent(/* ... */);

  // Verify state updated
  expect(store.getSnapshot().context.template.sections).toHaveLength(1);
});
```

---

## Summary

### GSAP Handles:
- ✅ Visual dragging (smooth, 60fps)
- ✅ Click point attachment (no offset)
- ✅ Bounds enforcement
- ✅ Position calculation
- ✅ Animations (scale, fade, slide)

### Store Handles:
- ✅ JSON state updates
- ✅ Reorder logic
- ✅ Add/remove operations

### React Handles:
- ✅ Re-rendering on state change
- ✅ Component lifecycle

### Clean Separation:
```
GSAP → Visual + Position Calculation
Store → Data Mutations
React → Rendering
```

**No conflicts. Each tool does what it's best at.**
