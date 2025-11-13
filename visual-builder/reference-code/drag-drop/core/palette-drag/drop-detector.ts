/**
 * DropDetector
 *
 * Responsibility: Detect drop zones and calculate insert positions
 *
 * Extracted from: template-builder/page.tsx lines 238-276
 */

import type { DropResult } from '../../contracts';

export class DropDetector {
  /**
   * Detect drop zone at given coordinates
   * Extracted from page.tsx lines 238-249
   */
  detectDrop(x: number, y: number, dropZoneSelector: string): DropResult | null {
    const point = { x, y };

    // Check if point is over drop zone (canvas)
    const canvas = document.querySelector(dropZoneSelector);
    if (canvas && this.isPointOverElement(point, canvas as HTMLElement)) {
      const insertIndex = this.calculateInsertIndex(y, '.block-card');
      return { type: 'canvas', insertIndex };
    }

    return null;
  }

  /**
   * Check if point is over element
   * Extracted from page.tsx lines 251-259
   */
  isPointOverElement(point: { x: number; y: number }, el: HTMLElement): boolean {
    const rect = el.getBoundingClientRect();
    return (
      point.x >= rect.left &&
      point.x <= rect.right &&
      point.y >= rect.top &&
      point.y <= rect.bottom
    );
  }

  /**
   * Calculate insert index based on cursor Y position
   * Extracted from page.tsx lines 261-276
   */
  calculateInsertIndex(y: number, blockSelector: string): number {
    const blocks = Array.from(document.querySelectorAll(blockSelector)) as HTMLElement[];

    if (blocks.length === 0) return 0;

    for (let i = 0; i < blocks.length; i++) {
      const rect = blocks[i].getBoundingClientRect();
      const midpoint = rect.top + rect.height / 2;

      if (y < midpoint) {
        return i;
      }
    }

    return blocks.length;
  }

  /**
   * Get blocks within drop zone
   */
  getDropZoneBlocks(dropZoneSelector: string, blockSelector: string): HTMLElement[] {
    const dropZone = document.querySelector(dropZoneSelector);
    if (!dropZone) return [];

    return Array.from(dropZone.querySelectorAll(blockSelector)) as HTMLElement[];
  }

  /**
   * Check if any drop zone is active
   */
  hasActiveDropZone(x: number, y: number, dropZoneSelector: string): boolean {
    const point = { x, y };
    const dropZones = Array.from(document.querySelectorAll(dropZoneSelector));

    for (const zone of dropZones) {
      if (this.isPointOverElement(point, zone as HTMLElement)) {
        return true;
      }
    }

    return false;
  }
}
