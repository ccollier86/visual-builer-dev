import { gsap } from 'gsap';

/**
 * Enable GPU acceleration on an element for smoother animations.
 * Forces the browser to use 3D transforms which are hardware accelerated.
 */
export function enableGPUAcceleration(element: HTMLElement): void {
  gsap.set(element, { force3D: true });
}

/**
 * Disable GPU acceleration on an element.
 * Returns the element to normal 2D rendering.
 */
export function disableGPUAcceleration(element: HTMLElement): void {
  gsap.set(element, { force3D: false });
}

/**
 * CSS styles that hint to the browser to use GPU acceleration.
 * Apply these inline or via CSS classes for better drag performance.
 */
export const gpuStyles = {
  willChange: 'transform',
  transform: 'translateZ(0)'
};
