/**
 * BlockReorderController - Initialize GSAP Draggables for block reordering
 * Extracted from TemplateCanvas.tsx lines 37-141
 */

import { gsap } from 'gsap';
import { Draggable } from 'gsap/Draggable';
import type { BlockReorderConfig, BlockReorderCallbacks } from '../../contracts';
import { SlideAnimator } from './slide-animator';
import { DragStateManager } from '../state';
import type { DragConfig } from '../state';

gsap.registerPlugin(Draggable);

export class BlockReorderController {
  private draggables: Draggable[] = [];
  private config: Required<BlockReorderConfig>;
  private callbacks: BlockReorderCallbacks;
  private container: HTMLElement | null = null;
  private stateManager: DragStateManager;
  private animator: SlideAnimator;

  constructor(config: BlockReorderConfig, callbacks: BlockReorderCallbacks) {
    // Set defaults
    this.config = {
      animationDuration: 250,
      throttleMs: 16,
      gpuAcceleration: true,
      ...config
    };
    this.callbacks = callbacks;

    // Create state manager
    const stateConfig: DragConfig = {
      containerSelector: this.config.containerSelector,
      blockSelector: this.config.blockSelector,
      handleSelector: this.config.handleSelector,
      movementThreshold: 5,
      animationDuration: this.config.animationDuration,
      throttleMs: this.config.throttleMs,
      gpuAcceleration: this.config.gpuAcceleration
    };

    this.stateManager = new DragStateManager(stateConfig);

    // Pass state manager to animator
    this.animator = new SlideAnimator(
      this.stateManager,
      this.config.throttleMs,
      this.config.gpuAcceleration,
      this.config.flipEffect ?? false
    );
  }

  initialize(container: HTMLElement): void {
    this.container = container;

    // Setup 3D perspective for flip effect
    if (this.config.flipEffect) {
      container.style.perspective = '1000px';
      container.style.perspectiveOrigin = 'center center';
    }

    // Initialize state manager (caches positions)
    this.stateManager.initialize(container);

    // Listen for reorder events and animate items to new positions
    this.stateManager.on('reorder', (data: any) => {
      const newOrder: string[] = data.newOrder;
      const currentSlot: number = data.currentSlot;

      // Animate items to their new positions based on reorder
      this.animator.animateBlocksToMakeRoom(0, 0); // Triggers animation based on current state
    });

    const blockElements = Array.from(
      container.querySelectorAll(this.config.blockSelector)
    ) as HTMLElement[];

    if (!blockElements.length) return;

    // Setup transform-style for 3D transforms
    if (this.config.flipEffect) {
      blockElements.forEach(block => {
        block.style.transformStyle = 'preserve-3d';
      });
    }

    // Capture animator reference for use in onDrag callback
    const animator = this.animator;

    // Create draggables individually with specific trigger for each
    this.draggables = blockElements.map(block => {
      const handle = block.querySelector(this.config.handleSelector) as HTMLElement;
      if (!handle) return null;

      return Draggable.create(block, {
        type: 'y',
        bounds: container,
        trigger: handle, // THIS block's specific handle only

        onDragStart: () => {
          // Ensure clean state - clear any lingering transforms from previous drags
          if (this.container) {
            const allBlocks = this.container.querySelectorAll(this.config.blockSelector);
            gsap.set(allBlocks, {
              y: 0,
              clearProps: 'transform',
              force3D: this.config.gpuAcceleration
            });
          }

          block.classList.add('is-dragging');

          // Start drag session in state manager
          const blockId = block.dataset.blockId;
          if (blockId) {
            this.stateManager.startDrag(blockId);
          }

          // Visual feedback - make dragged item semi-transparent
          gsap.to(block, {
            duration: 0.15,
            scale: 1.02,
            opacity: 0.9,
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
            zIndex: 1000,
            force3D: this.config.gpuAcceleration,
            ease: 'power3.out'
          });

          // Call optional callback
          if (blockId && this.callbacks.onDragStart) {
            this.callbacks.onDragStart(blockId);
          }
        },

        onDrag: function() {
          // 'this' is the Draggable instance
          // Get MOUSE position (not dragged element position)
          const mouseX = this.pointerX;
          const mouseY = this.pointerY;

          // Pass to animator (which uses state manager)
          animator.animateBlocksToMakeRoom(mouseX, mouseY);
        },

        onDragEnd: () => {
          const draggedElement = block;
          const blockId = draggedElement.dataset.blockId;

          // Kill ALL ongoing animations immediately
          if (this.container) {
            const allBlocks = this.container.querySelectorAll(this.config.blockSelector);
            gsap.killTweensOf(allBlocks);
          }

          draggedElement.classList.remove('is-dragging');

          // Get new order from state manager (already calculated during drag)
          const newOrder = this.stateManager.calculateFinalOrder();

          // Remove indicators
          this.removeAllDropIndicators();

          // CRITICAL: Update React state FIRST while transforms are still in place
          // This ensures DOM reorders to match visual positions
          if (blockId) {
            // End drag session in state manager
            this.stateManager.endDrag(newOrder);

            // Call React callback to trigger re-render
            this.callbacks.onDragEnd(blockId, newOrder);
          }

          // Wait for React to re-render (double RAF ensures DOM has updated)
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              // Query ALL blocks fresh from the DOM after React re-render
              if (!this.container) return;

              const allBlocks = Array.from(
                this.container.querySelectorAll(this.config.blockSelector)
              ) as HTMLElement[];

              // NOW clear all transforms on ALL blocks
              // DOM has reordered, items are in correct positions
              // Clearing transforms will have no visual effect because:
              // - Items were at position X with transform Y
              // - React moved them in DOM to position X+Y
              // - Clearing transform Y leaves them at X+Y (no jump)
              allBlocks.forEach(block => {
                gsap.set(block, {
                  x: 0,
                  y: 0,
                  clearProps: 'transform',
                  force3D: this.config.gpuAcceleration
                });
              });

              // Reset dragged element visual state only
              gsap.set(draggedElement, {
                scale: 1,
                opacity: 1,
                boxShadow: 'none',
                zIndex: 1,
                force3D: this.config.gpuAcceleration
              });
            });
          });
        },

        onRelease: () => {
          // BACKUP: Aggressive cleanup if drag is cancelled
          if (!block.classList.contains('is-dragging')) return;

          gsap.killTweensOf(block);
          block.classList.remove('is-dragging');

          gsap.set(block, {
            scale: 1,
            opacity: 1,
            boxShadow: 'none',
            zIndex: 1,
            x: 0,
            y: 0,
            force3D: this.config.gpuAcceleration
          });
        }
      })[0]; // Draggable.create returns array, get first element
    }).filter((d): d is Draggable => d !== null);
  }

  destroy(): void {
    // Cleanup draggables
    this.draggables.forEach(d => d.kill());
    this.draggables = [];

    // Cleanup state manager
    this.stateManager.destroy();

    // Cleanup animator
    this.animator.cleanup();

    this.container = null;
  }

  private calculateBlockOrder(): string[] {
    if (!this.container) return [];

    const allBlocks = Array.from(
      this.container.querySelectorAll(this.config.blockSelector)
    ) as HTMLElement[];

    const positions = allBlocks.map(block => ({
      id: block.dataset.blockId!,
      top: block.getBoundingClientRect().top
    }));

    positions.sort((a, b) => a.top - b.top);

    return positions.map(p => p.id);
  }

  private removeAllDropIndicators(): void {
    if (!this.container) return;
    this.container.querySelectorAll(this.config.blockSelector).forEach(el => {
      el.classList.remove('drop-above', 'drop-below');
    });
  }

  // Public method to update drop indicators (called from external animation logic)
  updateDropIndicators(draggedEl: HTMLElement, dragY: number): void {
    if (!this.container) return;

    const blocks = Array.from(
      this.container.querySelectorAll(`${this.config.blockSelector}:not(.is-dragging)`)
    ) as HTMLElement[];

    const draggedTop = draggedEl.getBoundingClientRect().top;

    blocks.forEach(block => {
      const rect = block.getBoundingClientRect();
      const midpoint = rect.top + rect.height / 2;

      block.classList.remove('drop-above', 'drop-below');

      if (draggedTop < midpoint) {
        block.classList.add('drop-above');
      } else {
        block.classList.add('drop-below');
      }
    });
  }
}
