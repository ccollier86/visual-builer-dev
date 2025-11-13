/**
 * PositionCalculator - Calculate block positions and order
 * Extracted from TemplateCanvas.tsx lines 175-190
 */

import type { BlockPosition } from '../../contracts';

export class PositionCalculator {
  /**
   * Calculate the current visual order of blocks based on their DOM position
   * Returns array of block IDs in top-to-bottom order
   */
  calculateBlockOrder(container: HTMLElement, blockSelector: string): string[] {
    const allBlocks = Array.from(
      container.querySelectorAll(blockSelector)
    ) as HTMLElement[];

    const positions = allBlocks.map(block => ({
      id: block.dataset.blockId!,
      top: block.getBoundingClientRect().top
    }));

    positions.sort((a, b) => a.top - b.top);

    return positions.map(p => p.id);
  }

  /**
   * Get detailed position data for all blocks
   * Useful for advanced layout calculations
   */
  getBlockPositions(container: HTMLElement, blockSelector: string): BlockPosition[] {
    const allBlocks = Array.from(
      container.querySelectorAll(blockSelector)
    ) as HTMLElement[];

    const positions = allBlocks.map((block, index) => {
      const rect = block.getBoundingClientRect();
      return {
        id: block.dataset.blockId!,
        top: rect.top,
        height: rect.height,
        index
      };
    });

    positions.sort((a, b) => a.top - b.top);

    return positions;
  }

  /**
   * Calculate where a dragged block would be inserted based on cursor Y position
   * Returns the target index in the block array
   */
  calculateInsertIndex(blocks: HTMLElement[], cursorY: number): number {
    if (blocks.length === 0) return 0;

    // Find the block whose midpoint is closest to cursor
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const rect = block.getBoundingClientRect();
      const midpoint = rect.top + rect.height / 2;

      if (cursorY < midpoint) {
        return i; // Insert before this block
      }
    }

    // If cursor is below all blocks, insert at end
    return blocks.length;
  }

  /**
   * Calculate insert index based on a dragged element's center position
   * Accounts for the element moving from its original position
   */
  calculateInsertIndexWithOriginal(
    blocks: HTMLElement[],
    draggedEl: HTMLElement,
    draggedCenter: number
  ): number {
    const draggedId = draggedEl.dataset.blockId;
    const originalIndex = blocks.findIndex(el => el.dataset.blockId === draggedId);

    if (originalIndex === -1) {
      // Element not in list, treat as new insertion
      return this.calculateInsertIndex(blocks, draggedCenter);
    }

    let targetIndex = originalIndex;

    blocks.forEach((block, index) => {
      if (block === draggedEl) return;

      const rect = block.getBoundingClientRect();
      const midpoint = rect.top + rect.height / 2;

      // Moving DOWN: if dragged center is below this block's midpoint
      if (index < originalIndex && draggedCenter > midpoint) {
        if (index + 1 > targetIndex) targetIndex = index + 1;
      }
      // Moving UP: if dragged center is above this block's midpoint
      else if (index > originalIndex && draggedCenter < midpoint) {
        if (index < targetIndex) targetIndex = index;
      }
    });

    return targetIndex;
  }
}
