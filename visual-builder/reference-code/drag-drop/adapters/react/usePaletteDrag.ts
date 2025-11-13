/**
 * usePaletteDrag - React hook wrapping palette drag logic with ghost pattern
 * Adapts pure core logic to React lifecycle
 * Extracted from page.tsx lines 41-215
 */

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { Draggable } from 'gsap/Draggable';
import { GhostController } from '../../core/palette-drag';
import type { PaletteDragConfig, PaletteDragCallbacks } from '../../contracts';

gsap.registerPlugin(Draggable);

/**
 * React hook for palette drag with ghost pattern
 *
 * Creates draggable palette items that spawn a ghost element on drag.
 * The original palette item stays in place while the ghost follows the cursor.
 *
 * @param config - Configuration for palette drag (selectors, ghost config)
 * @param callbacks - Event callbacks (onDragStart, onDragEnd, onDrop, etc.)
 * @returns Object containing containerRef to attach to the palette container element
 */
export function usePaletteDrag(
  config: PaletteDragConfig,
  callbacks: PaletteDragCallbacks
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const ghostControllerRef = useRef<GhostController | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const ghostElementRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return;

    // Initialize ghost controller
    ghostControllerRef.current = new GhostController(config.ghostConfig);

    // Small delay to ensure palette has rendered
    const timer = setTimeout(() => {
      const paletteItems = containerRef.current?.querySelectorAll(
        config.paletteItemSelector
      );

      if (!paletteItems || !paletteItems.length) {
        console.warn('[usePaletteDrag] No palette items found');
        return;
      }

      const draggables = Draggable.create(paletteItems, {
        type: 'x,y',
        dragClickables: false,
        minimumMovement: config.minimumMovement ?? 5,

        onPress: function() {
          const paletteId = this.target.dataset.paletteId || '';
          const componentType = this.target.dataset.componentType || '';

          // Create ghost element using controller
          const ghost = ghostControllerRef.current!.createGhost(
            this.target as HTMLElement
          );
          ghostElementRef.current = ghost;

          // Store component info on ghost
          ghost.dataset.paletteId = paletteId;
          ghost.dataset.componentType = componentType;

          // Make original semi-transparent to show it stays
          this.target.style.opacity = '0.3';
        },

        onDragStart: function() {
          isDraggingRef.current = true;

          const componentType = ghostElementRef.current?.dataset.componentType || '';
          const paletteId = ghostElementRef.current?.dataset.paletteId || '';

          // Call optional callback
          if (callbacks.onDragStart) {
            callbacks.onDragStart(componentType, paletteId);
          }
        },

        onDrag: function() {
          if (!ghostElementRef.current) {
            console.error('[usePaletteDrag] Ghost missing in onDrag');
            return;
          }

          // IMPORTANT: Keep original palette item locked in place
          gsap.set(this.target, { x: 0, y: 0 });

          // Get starting position
          const rect = this.target.getBoundingClientRect();

          // Move ghost with mouse offset from start position
          ghostControllerRef.current!.moveGhost(
            rect.left + this.x,
            rect.top + this.y
          );

          // Get ghost position for drop detection (optional external handling)
          // Consumers can implement updateDropIndicators if needed
        },

        onRelease: function() {
          // Restore palette item
          this.target.style.opacity = '1';

          // If user clicked but didn't drag (onDragEnd won't fire), clean up ghost
          if (!isDraggingRef.current && ghostElementRef.current) {
            ghostControllerRef.current!.removeGhost(false);
            ghostElementRef.current = null;
          }
        },

        onDragEnd: function() {
          isDraggingRef.current = false;

          // Restore original palette item and lock position
          this.target.style.opacity = '1';
          gsap.set(this.target, { x: 0, y: 0 });

          if (!ghostElementRef.current) {
            return;
          }

          const componentType = ghostElementRef.current.dataset.componentType || '';
          const paletteId = ghostElementRef.current.dataset.paletteId || '';

          // Use ghost's current position for drop detection
          const ghostRect = ghostElementRef.current.getBoundingClientRect();
          const centerX = ghostRect.left + ghostRect.width / 2;
          const centerY = ghostRect.top + ghostRect.height / 2;

          // Detect drop zone
          const dropResult = detectDropZone(centerX, centerY);

          // Handle drop or fail
          if (dropResult) {
            callbacks.onDrop(dropResult, componentType, paletteId);
          } else if (callbacks.onDropFail) {
            callbacks.onDropFail();
          }

          // Call optional onDragEnd callback
          if (callbacks.onDragEnd) {
            callbacks.onDragEnd();
          }

          // Remove ghost (with animation if successful drop)
          const animated = !!dropResult;
          ghostControllerRef.current!.removeGhost(animated);
          ghostElementRef.current = null;
        }
      });

      return () => {
        draggables.forEach(d => d.kill());
        if (ghostElementRef.current && ghostControllerRef.current) {
          ghostControllerRef.current.removeGhost(false);
          ghostElementRef.current = null;
        }
      };
    }, 100);

    return () => {
      clearTimeout(timer);
    };
  }, []); // Empty array = run ONCE on mount only

  /**
   * Detect drop zone at the given coordinates
   * Uses the dropZoneSelector from config
   */
  function detectDropZone(x: number, y: number) {
    const dropZone = document.querySelector(config.dropZoneSelector) as HTMLElement;
    if (!dropZone) return null;

    const rect = dropZone.getBoundingClientRect();
    const isOver =
      x >= rect.left &&
      x <= rect.right &&
      y >= rect.top &&
      y <= rect.bottom;

    if (!isOver) return null;

    // Calculate insert index based on existing blocks
    const blocks = Array.from(
      dropZone.querySelectorAll('.block-card')
    ) as HTMLElement[];

    let insertIndex = blocks.length;

    for (let i = 0; i < blocks.length; i++) {
      const blockRect = blocks[i].getBoundingClientRect();
      const blockMiddle = blockRect.top + blockRect.height / 2;

      if (y < blockMiddle) {
        insertIndex = i;
        break;
      }
    }

    return {
      type: 'canvas' as const,
      insertIndex
    };
  }

  return { containerRef };
}
