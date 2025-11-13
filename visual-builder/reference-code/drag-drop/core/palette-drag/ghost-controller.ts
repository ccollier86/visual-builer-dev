/**
 * GhostController
 *
 * Responsibility: Create and manage ghost element during palette drag
 *
 * Extracted from: template-builder/page.tsx lines 60-200
 */

import { gsap } from 'gsap';
import type { GhostConfig } from '../../contracts';

export class GhostController {
  private ghost: HTMLDivElement | null = null;
  private config: GhostConfig;

  constructor(config: Partial<GhostConfig> = {}) {
    // Set defaults
    this.config = {
      opacity: 0.8,
      borderColor: '#3b82f6',
      borderStyle: '2px dashed',
      zIndex: 10000,
      ...config
    };
  }

  /**
   * Create ghost element from source element
   * Extracted from page.tsx lines 68-88
   */
  createGhost(sourceElement: HTMLElement): HTMLDivElement {
    // Get source position
    const rect = sourceElement.getBoundingClientRect();

    // Create ghost element
    const ghost = document.createElement('div');
    ghost.className = 'drag-ghost';
    ghost.innerHTML = sourceElement.innerHTML;
    ghost.style.cssText = `
      position: fixed;
      left: 0;
      top: 0;
      width: ${rect.width}px;
      pointer-events: none;
      z-index: ${this.config.zIndex};
      opacity: ${this.config.opacity};
      background: white;
      border: ${this.config.borderStyle} ${this.config.borderColor};
      border-radius: 6px;
      padding: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    `;

    document.body.appendChild(ghost);
    this.ghost = ghost;

    // Position ghost at source position using transform
    gsap.set(ghost, { x: rect.left, y: rect.top });

    return ghost;
  }

  /**
   * Move ghost to absolute position
   * Extracted from page.tsx lines 122-126
   */
  moveGhost(x: number, y: number): void {
    if (!this.ghost) return;

    gsap.set(this.ghost, { x, y });
  }

  /**
   * Get current ghost element
   */
  getGhost(): HTMLDivElement | null {
    return this.ghost;
  }

  /**
   * Get ghost bounding rect
   */
  getGhostRect(): DOMRect | null {
    return this.ghost?.getBoundingClientRect() ?? null;
  }

  /**
   * Get ghost center point
   */
  getGhostCenter(): { x: number; y: number } | null {
    if (!this.ghost) return null;

    const rect = this.ghost.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
  }

  /**
   * Remove ghost with optional animation
   * Extracted from page.tsx lines 187-199
   */
  removeGhost(animated: boolean = true): void {
    if (!this.ghost) return;

    const ghostElement = this.ghost;
    this.ghost = null; // Clear reference immediately

    if (animated) {
      gsap.to(ghostElement, {
        duration: 0.2,
        opacity: 0,
        scale: 0.8,
        onComplete: () => {
          if (document.body.contains(ghostElement)) {
            document.body.removeChild(ghostElement);
          }
        }
      });
    } else {
      if (document.body.contains(ghostElement)) {
        document.body.removeChild(ghostElement);
      }
    }
  }

  /**
   * Check if ghost exists
   */
  hasGhost(): boolean {
    return this.ghost !== null;
  }

  /**
   * Cleanup (for use in destroy/unmount)
   */
  cleanup(): void {
    if (this.ghost && document.body.contains(this.ghost)) {
      document.body.removeChild(this.ghost);
      this.ghost = null;
    }
  }
}
