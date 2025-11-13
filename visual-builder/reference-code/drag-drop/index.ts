/**
 * Drag & Drop Library - Public API
 * Main entry point for the drag & drop library
 *
 * This library provides GSAP-based drag & drop functionality following
 * SOR/SOD/DI architecture principles:
 *
 * - contracts: Type definitions and interfaces
 * - core: Pure business logic (no React/Zustand dependencies)
 * - adapters: Framework-specific integrations (React hooks, Zustand)
 *
 * @example
 * ```typescript
 * // React + Zustand usage
 * import { useBlockReorder, createBlockReorderCallbacks } from './lib/drag-drop';
 * import { useTemplateBuilder } from './hooks/useTemplateBuilder';
 *
 * const store = useTemplateBuilder();
 * const { containerRef } = useBlockReorder(
 *   { containerSelector: '.canvas', blockSelector: '.block', handleSelector: '.handle' },
 *   createBlockReorderCallbacks(store),
 *   store.blocks.length  // Only re-initializes when blocks are added/removed
 * );
 * ```
 */

// Contracts (Types & Interfaces)
export type {
  BlockPosition,
  DragState,
  GhostConfig,
  DropResult,
  BlockReorderCallbacks,
  PaletteDragCallbacks,
  BlockReorderConfig,
  PaletteDragConfig
} from './contracts';

// Core (Pure Business Logic)
export {
  BlockReorderController,
  SlideAnimator,
  PositionCalculator
} from './core/block-reorder';

export {
  GhostController,
  DropDetector
} from './core/palette-drag';

export {
  enableGPUAcceleration,
  disableGPUAcceleration,
  gpuStyles,
  createThrottle,
  killAllTweens,
  resetTransform
} from './core/shared';

// Adapters (Framework Integration)
export {
  useBlockReorder,
  usePaletteDrag,
  createBlockReorderCallbacks,
  createPaletteDragCallbacks
} from './adapters';
