# 🎯 Drag & Drop Animations

> Buttery smooth drag & drop with prop-driven animations. Easier than react-dnd.

[![npm version](https://img.shields.io/npm/v/@yourname/drag-drop-animations.svg)](https://www.npmjs.com/package/@yourname/drag-drop-animations)
[![Bundle size](https://img.shields.io/bundlephobia/minzip/@yourname/drag-drop-animations)](https://bundlephobia.com/package/@yourname/drag-drop-animations)
[![License](https://img.shields.io/npm/l/@yourname/drag-drop-animations.svg)](https://github.com/yourusername/drag-drop-animations/blob/main/LICENSE)

## ✨ Why This Library?

**Most drag & drop libraries are painful:**
- 😫 Wrap every item in special components
- 😫 Complex providers and configuration
- 😫 No animations or janky ones
- 😫 Heavy bundle sizes
- 😫 Steep learning curve

**This library is different:**
- ✅ **Point to your HTML** with CSS selectors - no wrapping
- ✅ **One hook** - `useBlockReorder()` and you're done
- ✅ **Animations via props** - `flipEffect: true` for 3D flips
- ✅ **Tiny bundle** - ~20kb (smaller than react-dnd)
- ✅ **Zero config** - works out of the box
- ✅ **Built-in undo/redo** - coming from @xstate/store

## 🚀 Quick Start

### Install

```bash
npm install @yourname/drag-drop-animations @xstate/store gsap
```

### Use

```tsx
import { useBlockReorder } from '@yourname/drag-drop-animations';

function TodoList() {
  const todos = ['Buy milk', 'Walk dog', 'Code'];

  const { containerRef } = useBlockReorder(
    {
      containerSelector: '.todo-list',
      blockSelector: '.todo-item',
      handleSelector: '.handle',
      flipEffect: true  // 🎬 3D flip animation!
    },
    {
      onReorder: (newOrder) => console.log('Reordered!', newOrder)
    }
  );

  return (
    <ul ref={containerRef} className="todo-list">
      {todos.map(todo => (
        <li key={todo} className="todo-item" data-id={todo}>
          <span className="handle">☰</span>
          {todo}
        </li>
      ))}
    </ul>
  );
}
```

**That's it!** No providers, no wrapping, just drag & drop with smooth animations.

## 🎬 Animation Effects

Switch animations with a prop:

```tsx
// Smooth slide (default)
<useBlockReorder({ flipEffect: false }) />

// 3D card flip
<useBlockReorder({ flipEffect: true }) />

// Coming soon: More effects!
```

## 🎯 Features

### Core
- ✅ **Vertical list reordering** - Smooth boundary-crossing detection
- ✅ **Drag handles** - Drag by specific element
- ✅ **Touch support** - Works on mobile
- ✅ **Accessibility** - Keyboard navigation support
- ✅ **TypeScript** - Full type safety included

### Animations (GSAP)
- ✅ **Smooth slide** - Items glide to new positions
- ✅ **3D flip** - Card flip effect during reorder
- ✅ **GPU accelerated** - Silky smooth 60fps
- ✅ **Prop-driven** - Change with one boolean

### State Management (@xstate/store)
- ✅ **Event-driven** - Clean state updates
- ✅ **Undo/redo ready** - Built-in history tracking
- ✅ **Lightweight** - Only ~1kb overhead

### Coming Soon
- 🚧 **Grid layouts** - Drag left/right to create columns
- 🚧 **Multi-select** - Drag multiple items at once
- 🚧 **Nested items** - Drag into folders/groups
- 🚧 **More effects** - Scale, fade, custom animations

## 📦 Bundle Size

With smart peer dependencies:

| Scenario | Size |
|----------|------|
| Fresh install | ~21kb gzipped |
| Already have @xstate/store | ~20kb gzipped |
| Already have GSAP | ~2kb gzipped |
| Already have both | ~1kb gzipped |

**Compare:**
- react-dnd: ~25kb + complex setup
- react-beautiful-dnd: ~30kb + deprecated
- **This library**: ~21kb + simple setup ✨

## 🎨 Examples

### Simple Todo List

```tsx
const { containerRef } = useBlockReorder(
  {
    containerSelector: '.todos',
    blockSelector: '.todo',
    handleSelector: '.drag-handle'
  },
  {
    onReorder: (ids) => saveTodos(ids)
  }
);
```

### With Flip Animation

```tsx
const { containerRef } = useBlockReorder(
  {
    containerSelector: '.items',
    blockSelector: '.item',
    handleSelector: '.handle',
    flipEffect: true  // 🎬 Cards flip!
  },
  { onReorder: saveOrder }
);
```

### With State Integration

```tsx
function MyList() {
  const [items, setItems] = useState([...]);

  const { containerRef } = useBlockReorder(
    { /* config */ },
    {
      onReorder: (newOrder) => {
        const reordered = newOrder.map(id =>
          items.find(item => item.id === id)
        );
        setItems(reordered);
      }
    }
  );

  return <div ref={containerRef}>...</div>;
}
```

## 📚 Documentation

- [Installation Guide](./INSTALLATION.md) - All install scenarios
- [API Reference](./API.md) - Full API docs
- [Animation Effects](./ANIMATIONS.md) - Effect options
- [Examples](./examples/) - Code examples
- [TypeScript Guide](./TYPESCRIPT.md) - Type usage

## 🤔 Why @xstate/store?

**TL;DR**: It's tiny (~1kb) and gives you undo/redo for free.

Benefits:
- Event-driven model perfect for drag operations
- Built-in undo/redo with smart skipping
- Effects system for animation orchestration
- Smaller than Zustand/Redux
- Modern reactive API

**But you don't need to know it!** The library handles everything internally.

## 🆚 Comparison

### vs react-dnd

| Feature | react-dnd | This Library |
|---------|-----------|--------------|
| Setup complexity | High | Low |
| Wrap components? | Yes | No |
| Provider needed? | Yes | No |
| Animation support | Manual | Built-in |
| Bundle size | 25kb | 21kb |
| Learning curve | Steep | Gentle |
| CSS selectors | No | Yes |

### vs react-beautiful-dnd

| Feature | react-beautiful-dnd | This Library |
|---------|---------------------|--------------|
| Maintained? | No (deprecated) | Yes |
| Animation quality | Good | Excellent |
| Customization | Limited | Flexible |
| Performance | Good | Better (GSAP) |
| TypeScript | Partial | Full |

## 🏗️ Architecture

Simple and clean:

```
Your App
    ↓
useBlockReorder hook
    ↓
@xstate/store (state) + GSAP (animations)
    ↓
Your HTML (via CSS selectors)
```

No magic, no hidden complexity. Just:
1. Point to your HTML with selectors
2. Get callbacks when order changes
3. Enjoy smooth animations

## 🤝 Contributing

Contributions welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md).

## 📄 License

MIT © [Your Name]

## 🙏 Credits

Built with:
- [@xstate/store](https://stately.ai/docs/xstate-store) - State management
- [GSAP](https://gsap.com) - Animations
- Love ❤️

---

**Made with ☕ by [Your Name]**

[⭐ Star on GitHub](https://github.com/yourusername/drag-drop-animations) | [📦 View on npm](https://www.npmjs.com/package/@yourname/drag-drop-animations) | [🐛 Report Bug](https://github.com/yourusername/drag-drop-animations/issues)
