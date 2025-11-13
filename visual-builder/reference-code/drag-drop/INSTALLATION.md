# Installation Guide

## Quick Install (Recommended)

If you don't already use `@xstate/store` or `gsap`:

```bash
npm install @yourname/drag-drop-animations @xstate/store gsap
```

**That's it!** You're ready to drag.

## Already Using @xstate/store or GSAP?

No problem! The library uses these as **peer dependencies**, so if you already have them installed, they won't be duplicated.

### Check what you have:

```bash
npm list @xstate/store gsap
```

### Install only what you need:

**If you have both:**
```bash
npm install @yourname/drag-drop-animations
```

**If you only have @xstate/store:**
```bash
npm install @yourname/drag-drop-animations gsap
```

**If you only have gsap:**
```bash
npm install @yourname/drag-drop-animations @xstate/store
```

## Version Requirements

- **React**: 18.0.0 or higher
- **@xstate/store**: 3.0.0 or higher (we use emits/effects features)
- **gsap**: 3.12.0 or higher

## Bundle Size

With peer dependencies approach:

| Scenario | Bundle Size Added |
|----------|-------------------|
| Fresh install (all deps) | ~21kb gzipped |
| Already have @xstate/store | ~20kb gzipped |
| Already have gsap | ~2kb gzipped |
| Already have both | ~1kb gzipped |

**Still smaller than react-dnd!** (~25kb)

## TypeScript Support

TypeScript types are included. No separate `@types` package needed.

```typescript
import type { BlockReorderConfig, BlockReorderCallbacks } from '@yourname/drag-drop-animations';
```

## Framework Support

Currently supports:
- ✅ React 18+
- ✅ Next.js 13+ (App Router & Pages Router)
- ✅ Remix
- ✅ Vite
- ✅ Create React App

Coming soon:
- Svelte adapter
- Vue adapter
- Vanilla JS (no framework)

## Quick Start

After installation:

```tsx
import { useBlockReorder } from '@yourname/drag-drop-animations';

function MyList() {
  const { containerRef } = useBlockReorder(
    {
      containerSelector: '.my-list',
      blockSelector: '.item',
      handleSelector: '.handle',
      flipEffect: true  // Enable 3D flip animation
    },
    {
      onReorder: (newOrder) => console.log('New order:', newOrder)
    }
  );

  return (
    <ul ref={containerRef} className="my-list">
      {items.map(item => (
        <li key={item.id} className="item" data-id={item.id}>
          <span className="handle">☰</span>
          {item.name}
        </li>
      ))}
    </ul>
  );
}
```

## What Gets Installed?

```
node_modules/
├── @yourname/drag-drop-animations/  ← Your library
├── @xstate/store/                   ← State management (1.1kb)
└── gsap/                             ← Animations (varies by usage)
```

No providers, no wrappers, no configuration files. Just import and use!

## Comparison to Other Libraries

### react-dnd
```bash
# Requires 2+ packages
npm install react-dnd react-dnd-html5-backend
# ~25kb gzipped + complex setup
```

### react-beautiful-dnd
```bash
npm install react-beautiful-dnd
# ~30kb gzipped + deprecated
```

### Your library
```bash
npm install @yourname/drag-drop-animations @xstate/store gsap
# ~21kb gzipped + simple setup
```

## Troubleshooting

### Peer Dependency Warnings

If you see warnings about peer dependencies:

```
npm WARN @yourname/drag-drop-animations@1.0.0 requires a peer of @xstate/store@>=3.0.0
```

Just install the missing dependency:

```bash
npm install @xstate/store
```

### Version Conflicts

If you have an older version of @xstate/store (v1 or v2):

```bash
npm install @xstate/store@latest
```

Our library requires v3+ for the emits/effects features needed for advanced animations.

### GSAP License

GSAP is free for most use cases. If you're using GSAP elsewhere with a commercial license, you're covered. If you're only using it through our library, the standard license applies.

Learn more: https://gsap.com/licensing/

## Next Steps

- [Quick Start Guide](./QUICKSTART.md)
- [API Documentation](./API.md)
- [Animation Effects](./ANIMATIONS.md)
- [Examples](./examples/)
