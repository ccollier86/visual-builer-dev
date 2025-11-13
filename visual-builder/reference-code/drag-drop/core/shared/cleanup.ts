import { gsap } from 'gsap';

/**
 * Kill all active GSAP tweens on the specified element(s).
 * Useful for cleanup when destroying drag interactions.
 *
 * @param selector - CSS selector string or HTMLElement reference
 */
export function killAllTweens(selector: string | HTMLElement): void {
  gsap.killTweensOf(selector);
}

/**
 * Reset all transform properties on an element to their default values.
 * Cleans up any drag/animation artifacts.
 *
 * @param element - The HTMLElement to reset
 */
export function resetTransform(element: HTMLElement): void {
  gsap.set(element, {
    x: 0,
    y: 0,
    scale: 1,
    opacity: 1,
    boxShadow: 'none',
    zIndex: 1,
    force3D: true
  });
}
