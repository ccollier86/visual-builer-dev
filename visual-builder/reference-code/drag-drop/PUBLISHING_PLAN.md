# @catalystlabs/sorted - Publishing Plan

## 🎯 Package Overview

**Name**: `@catalystlabs/sorted`

**Tagline**: "Buttery smooth drag & drop. Sorted."

**What it does**: Two complementary drag systems in one tiny package:
1. **Reorder** - Sort/reorder items in lists with animations
2. **Palette Drag** - Drag items from a source (palette/sidebar) to drop zones

## 📦 Two Systems, One Package

### System 1: Reorder (Sorting)
**Use case**: Todo lists, Kanban boards, file managers, playlists

```tsx
import { useBlockReorder } from '@catalystlabs/sorted';

const { containerRef } = useBlockReorder(
  {
    containerSelector: '.list',
    blockSelector: '.item',
    handleSelector: '.handle',
    flipEffect: true  // Prop-driven animations!
  },
  {
    onReorder: (newOrder) => saveOrder(newOrder)
  }
);
```

**Features**:
- ✅ Vertical list reordering
- ✅ Boundary-crossing detection (proximity-based)
- ✅ Prop-driven animations (flip, slide, more coming)
- ✅ Smooth 60fps GSAP animations
- ✅ CSS selector-based (point to existing HTML)
- 🚧 Grid layouts (drag left/right for columns) - future

### System 2: Palette Drag (Add New Items)
**Use case**: Visual builders, form designers, component libraries, toolboxes

```tsx
import { usePaletteDrag } from '@catalystlabs/sorted';

usePaletteDrag(
  {
    paletteItemSelector: '.palette-item',
    dropZoneSelector: '[data-drop-zone]'
  },
  {
    onDrop: (result) => {
      // result.insertIndex - where to insert
      // result.componentType - what was dragged
      // result.dropZone - where it was dropped
      createNewItem(result);
    }
  }
);
```

**Features**:
- ✅ Drag from source to target
- ✅ Ghost element follows cursor
- ✅ Drop zone highlighting
- ✅ Insert position calculation
- ✅ Cancel on escape/invalid drop
- ✅ Works with any HTML structure

**Real-world example** (like Notion, Webflow, etc):
```
┌─────────────┬────────────────────────┐
│  Palette    │  Canvas                │
│             │                        │
│  [Button]   │  [Existing Item 1]     │
│  [Text]  ←──┼──→ Drop here!          │
│  [Image]    │  [Existing Item 2]     │
│             │                        │
└─────────────┴────────────────────────┘
```

## 🔧 How It Works

### Reorder System
**User perspective**: "I can drag items up/down to reorder them"

**How it works**:
1. User grabs drag handle
2. Library calculates item boundaries
3. As item crosses boundaries → triggers reorder
4. Items animate to new positions
5. Callback fires with new order

**Key tech**:
- `getBoundingClientRect()` for position tracking
- Euclidean distance for boundary detection
- GSAP for smooth animations
- @xstate/store for state management

### Palette Drag System
**User perspective**: "I can drag new items from a toolbar/palette onto my canvas"

**How it works**:
1. User grabs palette item
2. Ghost element follows cursor
3. Hover over drop zone → highlight + calculate insert position
4. Release → callback fires with item type + insert index
5. Your app creates the new item at that position

**Key tech**:
- Native drag events (`dragstart`, `dragover`, `drop`)
- Ghost element positioning
- Insert index calculation based on Y position
- Drop zone activation/highlighting

## 📚 Package Structure

```
@catalystlabs/sorted/
├── dist/
│   ├── index.js         # Main entry (both systems)
│   ├── index.mjs        # ESM version
│   ├── index.d.ts       # TypeScript types
│   └── react.js         # React-specific exports
├── src/
│   ├── index.ts         # Main exports
│   ├── contracts/       # TypeScript interfaces
│   ├── core/
│   │   ├── block-reorder/    # Reorder system
│   │   │   ├── drag-controller.ts
│   │   │   ├── slide-animator.ts
│   │   │   └── state/
│   │   └── palette-drag/     # Palette system
│   │       ├── drag-manager.ts
│   │       ├── ghost-renderer.ts
│   │       └── drop-calculator.ts
│   └── adapters/
│       └── react/       # React hooks
│           ├── useBlockReorder.ts
│           └── usePaletteDrag.ts
├── README.md
├── INSTALLATION.md
├── API.md
├── EXAMPLES.md
└── package.json
```

## 📖 API Design

### Core Exports

```typescript
// Main package exports
export { useBlockReorder } from './adapters/react/useBlockReorder';
export { usePaletteDrag } from './adapters/react/usePaletteDrag';

// Type exports
export type {
  BlockReorderConfig,
  BlockReorderCallbacks,
  PaletteDragConfig,
  PaletteDragCallbacks,
  DropResult
} from './contracts';
```

### TypeScript Types

```typescript
// Reorder system
interface BlockReorderConfig {
  containerSelector: string;
  blockSelector: string;
  handleSelector: string;
  animationDuration?: number;
  flipEffect?: boolean;
  gridMode?: boolean; // Future
}

interface BlockReorderCallbacks {
  onDragStart?: (blockId: string) => void;
  onDragEnd?: (blockId: string, newOrder: string[]) => void;
  onOrderChange?: (newOrder: string[]) => void;
}

// Palette drag system
interface PaletteDragConfig {
  paletteItemSelector: string;
  dropZoneSelector: string;
  ghostConfig?: GhostConfig;
  minimumMovement?: number;
}

interface PaletteDragCallbacks {
  onDragStart?: (type: string, id: string) => void;
  onDragEnd?: () => void;
  onDrop?: (result: DropResult) => void;
  onDropFail?: () => void;
}

interface DropResult {
  componentType: string;
  paletteId: string;
  dropZone: string;
  insertIndex: number;
  insertBeforeId: string | null;
}
```

## 💡 Use Cases

### Use Case 1: Todo App (Reorder only)
```tsx
import { useBlockReorder } from '@catalystlabs/sorted';

function TodoList({ todos }) {
  const { containerRef } = useBlockReorder(
    {
      containerSelector: '.todos',
      blockSelector: '.todo',
      handleSelector: '.handle'
    },
    {
      onReorder: (ids) => updateTodoOrder(ids)
    }
  );

  return (
    <ul ref={containerRef} className="todos">
      {todos.map(todo => (
        <li key={todo.id} className="todo" data-id={todo.id}>
          <span className="handle">☰</span>
          {todo.text}
        </li>
      ))}
    </ul>
  );
}
```

### Use Case 2: Form Builder (Both systems!)
```tsx
import { useBlockReorder, usePaletteDrag } from '@catalystlabs/sorted';

function FormBuilder() {
  // Palette: Drag new components from sidebar
  usePaletteDrag(
    {
      paletteItemSelector: '.component-item',
      dropZoneSelector: '.form-canvas'
    },
    {
      onDrop: (result) => {
        // User dragged "Text Input" from palette
        addComponent(result.componentType, result.insertIndex);
      }
    }
  );

  // Reorder: Sort existing components
  const { containerRef } = useBlockReorder(
    {
      containerSelector: '.form-canvas',
      blockSelector: '.component',
      handleSelector: '.drag-handle',
      flipEffect: true
    },
    {
      onReorder: (order) => updateComponentOrder(order)
    }
  );

  return (
    <div style={{ display: 'flex' }}>
      {/* Sidebar with draggable components */}
      <aside className="palette">
        <div className="component-item" data-type="text">Text Input</div>
        <div className="component-item" data-type="checkbox">Checkbox</div>
        <div className="component-item" data-type="button">Button</div>
      </aside>

      {/* Canvas where components live */}
      <main ref={containerRef} className="form-canvas" data-drop-zone="canvas">
        {components.map(c => (
          <div key={c.id} className="component" data-id={c.id}>
            <span className="drag-handle">☰</span>
            <ComponentRenderer {...c} />
          </div>
        ))}
      </main>
    </div>
  );
}
```

### Use Case 3: Visual Page Builder (Like Notion/Webflow)
```tsx
import { useBlockReorder, usePaletteDrag } from '@catalystlabs/sorted';

function PageBuilder() {
  const [blocks, setBlocks] = useState([]);

  // Add new blocks from palette
  usePaletteDrag(
    {
      paletteItemSelector: '.block-type',
      dropZoneSelector: '.page-canvas'
    },
    {
      onDrop: (result) => {
        const newBlock = createBlock(result.componentType);
        setBlocks(prev => {
          const updated = [...prev];
          updated.splice(result.insertIndex, 0, newBlock);
          return updated;
        });
      }
    }
  );

  // Reorder existing blocks
  const { containerRef } = useBlockReorder(
    {
      containerSelector: '.page-canvas',
      blockSelector: '.block',
      handleSelector: '.block-handle'
    },
    {
      onReorder: (order) => {
        setBlocks(prev => order.map(id => prev.find(b => b.id === id)));
      }
    }
  );

  return (
    <div className="builder">
      <BlockPalette />
      <div ref={containerRef} className="page-canvas">
        {blocks.map(block => (
          <Block key={block.id} {...block} />
        ))}
      </div>
    </div>
  );
}
```

## 🎨 Both Systems Together

The magic is they **work together seamlessly**:

1. User drags "Button" from palette → Drops on canvas
2. `usePaletteDrag` callback fires → You create the button
3. Button is now in the list
4. User can now reorder it with other items using `useBlockReorder`

**No conflicts, no complex coordination needed.**

## 📦 Installation Scenarios

### Scenario 1: Fresh Install
```bash
npm install @catalystlabs/sorted @xstate/store gsap
```

### Scenario 2: Already Have Dependencies
```bash
npm install @catalystlabs/sorted
# Reuses existing @xstate/store and/or gsap
```

### Scenario 3: Only Need One System
```tsx
// Just reorder
import { useBlockReorder } from '@catalystlabs/sorted';

// Just palette drag
import { usePaletteDrag } from '@catalystlabs/sorted';

// Tree-shaking removes unused code!
```

## 🎯 Marketing Positioning

### Tagline Options
- "Buttery smooth drag & drop. Sorted."
- "Drag & drop that just works. Sorted."
- "The drag & drop library that doesn't suck."
- "Two drag systems. One tiny package. Sorted."

### Key Differentiators

**vs react-dnd:**
- ❌ react-dnd: Wrap every item, complex providers
- ✅ sorted: CSS selectors, one hook

**vs react-beautiful-dnd:**
- ❌ react-beautiful-dnd: Deprecated, animations limited
- ✅ sorted: Maintained, GSAP animations, more features

**vs @dnd-kit:**
- ❌ @dnd-kit: Complex sensors/modifiers system
- ✅ sorted: Simple config objects

### Target Audience
1. **App builders** - Todo apps, project management
2. **No-code tools** - Visual page builders, form designers
3. **Design tools** - Component libraries, layout systems
4. **Content management** - Blog editors, doc builders

## 📊 Bundle Size Analysis

```
@catalystlabs/sorted breakdown:
├── Core reorder logic:        ~8kb
├── Core palette logic:        ~6kb
├── React adapters:            ~3kb
├── @xstate/store (peer):      ~1kb
└── GSAP (peer):              varies

Total with peers: ~20kb gzipped
If user has GSAP: ~9kb gzipped
If user has both: ~8kb gzipped
```

**Tree-shaking**: If user only imports one system, the other is removed!

## 🚀 Publishing Checklist

### Pre-publish
- [ ] Build library with tsup
- [ ] Test in fresh React app
- [ ] Test with existing @xstate/store project
- [ ] Test with existing GSAP project
- [ ] TypeScript types working
- [ ] Examples working
- [ ] Documentation complete

### Documentation Needed
- [ ] README.md (overview, quick start)
- [ ] INSTALLATION.md (all scenarios)
- [ ] API.md (full API reference)
- [ ] EXAMPLES.md (common use cases)
- [ ] ANIMATIONS.md (effect options)
- [ ] TYPESCRIPT.md (type usage)
- [ ] MIGRATION.md (from react-dnd, etc)

### Examples to Include
- [ ] Simple todo list (reorder only)
- [ ] Form builder (both systems)
- [ ] Page builder (both systems)
- [ ] File manager (reorder + nested)
- [ ] Kanban board (multi-list reorder)

### Release Steps
1. Create GitHub repo
2. Setup CI/CD (GitHub Actions)
3. Build library
4. Test locally with `npm link`
5. Publish to npm
6. Create demo site
7. Write blog post
8. Share on Twitter/Reddit/HN

## 🎬 Demo Ideas

### Interactive Demo Site
- Live playground where you can try both systems
- Code sandbox embeds
- Copy-paste ready examples
- Animation effect switcher
- Performance metrics shown

### Video Demo
- 30 second teaser showing both systems
- Compare to react-dnd side-by-side
- Show prop-driven animation switching
- "From install to working in 2 minutes"

## 💰 Monetization (Optional)

**Free tier** (MIT license):
- Both drag systems
- All basic animations
- Open source

**Pro tier** (paid):
- Advanced grid layouts
- Custom animation builders
- Priority support
- Commercial license for closed-source

## 📈 Success Metrics

- npm downloads/week
- GitHub stars
- Bundle size vs competitors
- Developer satisfaction (surveys)
- Usage in production apps

## 🔮 Future Features

### Short-term (v1.1-v1.5)
- [ ] Grid layouts (drag left/right for columns)
- [ ] Multi-select drag
- [ ] Nested/hierarchical items
- [ ] More animation effects
- [ ] Accessibility improvements

### Long-term (v2.0+)
- [ ] Touch gestures (swipe to delete, etc)
- [ ] Virtual scrolling support
- [ ] Svelte adapter
- [ ] Vue adapter
- [ ] Vanilla JS (no framework)
- [ ] Mobile-first drag patterns

## 📝 Notes

- Both systems are **independent but complementary**
- Users can use one or both
- Tree-shaking ensures unused code is removed
- @xstate/store as peer dep = no duplication if user already has it
- GSAP as peer dep = same benefit
- Focus on **developer experience** - make it ridiculously easy

---

**Next step**: Copy this folder to separate repo and start building docs/examples!
