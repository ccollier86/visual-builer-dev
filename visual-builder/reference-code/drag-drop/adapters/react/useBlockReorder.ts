/**
 * useBlockReorder - React hook wrapping BlockReorderController
 * Adapts pure core logic to React lifecycle
 */

import { useEffect, useRef } from 'react';
import { BlockReorderController } from '../../core/block-reorder';
import type { BlockReorderConfig, BlockReorderCallbacks } from '../../contracts';

/**
 * React hook for block reordering with GSAP drag
 *
 * @param config - Configuration for block reordering (selectors, animation settings)
 * @param callbacks - Event callbacks (onDragStart, onDragEnd, etc.)
 * @param blockCount - Number of blocks (triggers re-initialization when blocks are added/removed)
 * @returns Object containing containerRef to attach to the drag container element
 */
export function useBlockReorder(
  config: BlockReorderConfig,
  callbacks: BlockReorderCallbacks,
  blockCount: number
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<BlockReorderController | null>(null);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;

    // Wrap callbacks to track drag state internally
    const wrappedCallbacks: BlockReorderCallbacks = {
      onDragStart: (blockId: string) => {
        isDraggingRef.current = true;
        callbacks.onDragStart?.(blockId);
      },
      onDragEnd: (blockId: string, newOrder: string[]) => {
        isDraggingRef.current = false;
        callbacks.onDragEnd(blockId, newOrder);
      },
      onOrderChange: callbacks.onOrderChange
    };

    // Create controller once or re-create when not dragging
    if (!controllerRef.current) {
      const controller = new BlockReorderController(config, wrappedCallbacks);
      controllerRef.current = controller;
    }

    // Initialize/re-initialize draggables
    // CRITICAL: Only re-initialize if NOT currently dragging
    // This prevents destroying Draggables mid-drag
    if (!isDraggingRef.current && controllerRef.current) {
      controllerRef.current.initialize(containerRef.current);
    }

    // Cleanup only on unmount
    return () => {
      if (controllerRef.current) {
        controllerRef.current.destroy();
        controllerRef.current = null;
      }
    };
  }, [blockCount]); // Only re-init when block count changes

  return { containerRef };
}
