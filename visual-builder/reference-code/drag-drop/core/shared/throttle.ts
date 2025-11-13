/**
 * Creates a throttle function that limits execution to a specified interval.
 * Useful for performance-critical operations like drag animations.
 *
 * @param ms - Milliseconds between allowed executions (default: 16ms for ~60fps)
 * @returns A function that returns true if enough time has passed since last call
 *
 * @example
 * const shouldRun = createThrottle(16);
 *
 * function onDrag() {
 *   if (!shouldRun()) return;
 *   // Expensive operation here
 * }
 */
export function createThrottle(ms: number = 16) {
  let lastCall = 0;

  return function shouldRun(): boolean {
    const now = Date.now();
    if (now - lastCall < ms) return false;
    lastCall = now;
    return true;
  };
}
