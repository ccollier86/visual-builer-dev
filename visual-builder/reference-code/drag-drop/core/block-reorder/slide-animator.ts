/**
 * SlideAnimator - Animate blocks sliding to make room during drag
 * Extracted from TemplateCanvas.tsx lines 202-303
 *
 * ALGORITHM: Proximity-based drag reordering using Euclidean distance
 * See: simplegen/visual-builder/DRAG_REORDER_ALGORITHM_DESIGN.md
 */

import { gsap } from 'gsap';
import type { DragStateManager } from '../state';

export class SlideAnimator {
  private lastAnimateCall = 0;
  private throttleMs: number;
  private gpuAcceleration: boolean;
  private flipEffect: boolean;
  private movementThreshold: number = 5; // pixels before direction is detected

  private stateManager: DragStateManager;

  constructor(
    stateManager: DragStateManager,
    throttleMs: number = 16,
    gpuAcceleration: boolean = true,
    flipEffect: boolean = false
  ) {
    this.stateManager = stateManager;
    this.throttleMs = throttleMs;
    this.gpuAcceleration = gpuAcceleration;
    this.flipEffect = flipEffect;
    this.movementThreshold = 5;
  }

  animateBlocksToMakeRoom(currentCenterX: number, currentCenterY: number): void {
    // Throttle
    const now = Date.now();
    if (now - this.lastAnimateCall < this.throttleMs) return;
    this.lastAnimateCall = now;

    // Update state manager with current position
    this.stateManager.updateDragPosition(currentCenterX, currentCenterY);

    // Calculate target index (state manager does proximity detection)
    const targetIndex = this.stateManager.calculateTargetIndex();

    // Get items to shift (state manager handles directional filtering)
    const { shiftUp, shiftDown } = this.stateManager.getItemsToShift();

    // Get dragged item for shift distance
    const session = this.stateManager.getDragSession();
    if (!session) return;

    const draggedItem = this.stateManager.getItemState(session.draggedId);
    if (!draggedItem) return;

    const shiftDistance = draggedItem.totalHeight;

    // Animate items shifting UP
    shiftUp.forEach(item => {
      // Update state manager FIRST so visual position checks are accurate
      item.currentTransform.y = -shiftDistance;

      // Standard slide/flip animation
      gsap.to(item.element, {
        y: -shiftDistance,
        rotationX: this.flipEffect ? 360 : 0, // Full flip if enabled
        duration: 0.35,
        ease: 'power2.out',
        force3D: true,
        transformOrigin: 'center center',
        overwrite: 'auto'
      });
    });

    // Animate items shifting DOWN
    shiftDown.forEach(item => {
      // Update state manager FIRST so visual position checks are accurate
      item.currentTransform.y = shiftDistance;

      // Standard slide/flip animation
      gsap.to(item.element, {
        y: shiftDistance,
        rotationX: this.flipEffect ? -360 : 0, // Flip opposite direction
        duration: 0.35,
        ease: 'power2.out',
        force3D: true,
        transformOrigin: 'center center',
        overwrite: 'auto'
      });
    });

    // Reset items NOT shifting
    const allItems = this.stateManager.getAllItems();
    const shiftingIds = new Set([
      ...shiftUp.map(i => i.id),
      ...shiftDown.map(i => i.id)
    ]);

    allItems.forEach(item => {
      if (item.id === session.draggedId) return;
      if (shiftingIds.has(item.id)) return;

      // Update state manager FIRST
      item.currentTransform.y = 0;

      // This item should return to 0
      gsap.to(item.element, {
        y: 0,
        rotationX: 0, // Reset rotation
        duration: 0.25,
        ease: 'power2.out',
        force3D: true,
        overwrite: 'auto'
      });
    });
  }

  /**
   * Calculate the target index where the dragged element would be inserted
   * based on its current position
   */
  calculateTargetIndex(): number {
    return this.stateManager.calculateTargetIndex();
  }

  cleanup(): void {
    // State manager handles cleanup
    // Just reset animation throttle
    this.lastAnimateCall = 0;
  }

}
