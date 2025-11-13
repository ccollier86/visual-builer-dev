/**
 * Drag State Manager
 *
 * Central state management for drag & drop operations.
 * Tracks positions, drag sessions, and refreshes state after each reorder.
 *
 * KEY FIX: refreshPositions() ensures positions are always current after DOM updates.
 */

// ===== INTERFACES =====

export interface ItemState {
  id: string;
  element: HTMLElement;

  // Position (UPDATED after reorders)
  currentIndex: number;
  centerX: number;
  centerY: number;

  // Size
  width: number;
  height: number;
  totalHeight: number;

  // Animation state
  currentTransform: {
    x: number;
    y: number;
    scale: number;
    opacity: number;
  };
}

export interface ItemBoundary {
  itemId: string;
  type: 'top' | 'bottom';
  y: number; // Y coordinate of boundary
  crossed: boolean; // Has this boundary been crossed?
}

export interface DragSession {
  draggedId: string;
  draggedElement: HTMLElement;

  // Where it started (snapshot at drag start)
  startIndex: number;
  startCenterX: number;
  startCenterY: number;

  // Current mouse position (updated every frame)
  currentMouseX: number;
  currentMouseY: number;
  previousMouseY: number;

  // Current slot in list (where gap is)
  currentSlot: number;

  // Movement tracking
  direction: 'up' | 'down' | 'none';
  hasCrossedThreshold: boolean;

  // Boundary tracking - tracks what we've crossed to prevent re-trigger
  lastCrossedBoundary: string | null; // e.g., "item-b-top"
}

export interface DragConfig {
  containerSelector: string;
  blockSelector: string;
  handleSelector: string;
  movementThreshold: number;
  animationDuration: number;
  throttleMs: number;
  gpuAcceleration: boolean;
}

interface DragState {
  // Lifecycle
  isInitialized: boolean;
  isDragging: boolean;
  dragInProgress: boolean;

  // Item tracking (MUTABLE - updates after reorders)
  items: Map<string, ItemState>;
  itemOrder: string[];  // Current order of IDs (THIS IS the source of truth)

  // Drag session data (resets each drag)
  currentDrag: DragSession | null;

  // Configuration
  config: DragConfig;
}

// ===== DRAG STATE MANAGER CLASS =====

export class DragStateManager {
  private state: DragState;
  private listeners: Map<string, Function[]>;

  constructor(config: DragConfig) {
    this.state = {
      isInitialized: false,
      isDragging: false,
      dragInProgress: false,
      items: new Map(),
      itemOrder: [],
      currentDrag: null,
      config: config
    };

    this.listeners = new Map();
  }

  // ===== INITIALIZATION =====

  /**
   * Scan DOM and build initial state
   * Call this when blocks change (add/remove)
   */
  initialize(container: HTMLElement): void {
    const blocks = Array.from(
      container.querySelectorAll(this.state.config.blockSelector)
    ) as HTMLElement[];

    // Clear existing state
    this.state.items.clear();
    this.state.itemOrder = [];

    // Build item state for each block
    blocks.forEach((element, index) => {
      const id = element.dataset.blockId!;
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);

      const itemState: ItemState = {
        id: id,
        element: element,

        currentIndex: index,
        centerX: rect.left + rect.width / 2 + window.scrollX,
        centerY: rect.top + rect.height / 2 + window.scrollY,

        width: rect.width,
        height: rect.height,
        totalHeight: rect.height +
                     parseFloat(style.marginTop) +
                     parseFloat(style.marginBottom),

        currentTransform: {
          x: 0,
          y: 0,
          scale: 1,
          opacity: 1
        }
      };

      this.state.items.set(id, itemState);
      this.state.itemOrder.push(id);
    });

    this.state.isInitialized = true;
    this.emit('initialized');
  }

  /**
   * CRITICAL: Refresh positions after DOM reorder
   * Call this after React updates the DOM with new order
   */
  refreshPositions(): void {
    this.state.items.forEach(item => {
      const rect = item.element.getBoundingClientRect();

      // Update positions (DOM has changed)
      item.centerX = rect.left + rect.width / 2 + window.scrollX;
      item.centerY = rect.top + rect.height / 2 + window.scrollY;

      // Update index based on DOM order
      const newIndex = this.state.itemOrder.indexOf(item.id);
      item.currentIndex = newIndex;

      // CRITICAL: Clear transform state to match DOM (transforms cleared after reorder)
      item.currentTransform.y = 0;
      item.currentTransform.x = 0;
      item.currentTransform.scale = 1;
      item.currentTransform.opacity = 1;
    });

    this.emit('positions-refreshed');
  }

  // ===== DRAG SESSION =====

  /**
   * Start a new drag session
   */
  startDrag(draggedId: string): void {
    const draggedItem = this.state.items.get(draggedId);
    if (!draggedItem) return;

    // Create drag session
    this.state.currentDrag = {
      draggedId: draggedId,
      draggedElement: draggedItem.element,

      startIndex: draggedItem.currentIndex,
      startCenterX: draggedItem.centerX,
      startCenterY: draggedItem.centerY,

      currentMouseX: draggedItem.centerX,
      currentMouseY: draggedItem.centerY,
      previousMouseY: draggedItem.centerY,

      // Current slot starts at original position
      currentSlot: draggedItem.currentIndex,

      direction: 'none',
      hasCrossedThreshold: false,

      lastCrossedBoundary: null
    };

    this.state.isDragging = true;
    this.state.dragInProgress = true;

    this.emit('drag-start', { draggedId });
  }

  /**
   * Update drag position (called every frame)
   * Direction instantly toggles which boundary triggers are enabled
   */
  updateDragPosition(mouseX: number, mouseY: number): void {
    if (!this.state.currentDrag) return;

    const session = this.state.currentDrag;

    // Update mouse position (viewport coordinates converted to page coordinates)
    session.previousMouseY = session.currentMouseY;
    session.currentMouseX = mouseX + window.scrollX;
    session.currentMouseY = mouseY + window.scrollY;

    // Calculate direction based on mouse movement delta
    const deltaY = session.currentMouseY - session.previousMouseY;

    if (Math.abs(deltaY) > 1) { // Minimum movement to detect direction
      session.direction = deltaY > 0 ? 'down' : 'up';
      session.hasCrossedThreshold = true;
    }

    // Check boundary crossings - only enabled boundaries respond
    if (session.direction !== 'none') {
      this.checkBoundaryCrossings();
    }

    this.emit('drag-move', {
      currentX: mouseX,
      currentY: mouseY,
      direction: session.direction
    });
  }

  /**
   * Check if MOUSE has crossed any item boundaries
   * CRITICAL: Only checks OTHER items' boundaries, NEVER the dragged item
   * Direction instantly toggles which boundaries are enabled:
   * - Moving UP → only TOP boundaries respond (bottom disabled)
   * - Moving DOWN → only BOTTOM boundaries respond (top disabled)
   *
   * Mouse position (not dragged element position) determines triggers
   */
  private checkBoundaryCrossings(): void {
    const session = this.state.currentDrag;
    if (!session) return;

    const currentMouseY = session.currentMouseY;
    const previousMouseY = session.previousMouseY;
    const direction = session.direction;

    // Check ONLY other items' boundaries (NOT dragged item)
    this.state.items.forEach(item => {
      // CRITICAL: Skip the item being dragged - NEVER check its boundaries
      if (item.id === session.draggedId) return;

      // Get OTHER item's CURRENT visual position (with transforms applied)
      const rect = item.element.getBoundingClientRect();
      const topY = rect.top + window.scrollY;
      const bottomY = rect.bottom + window.scrollY;

      // TOP boundaries ENABLED when moving UP (bottom boundaries disabled)
      if (direction === 'up') {
        const boundaryId = `${item.id}-top`;

        // Did MOUSE cross from below to above the top boundary?
        if (previousMouseY > topY && currentMouseY <= topY) {
          // Only trigger if different from last boundary
          if (session.lastCrossedBoundary !== boundaryId) {
            this.handleBoundaryCrossing(item, 'top');
            session.lastCrossedBoundary = boundaryId;
          }
        }
      }

      // BOTTOM boundaries ENABLED when moving DOWN (top boundaries disabled)
      else if (direction === 'down') {
        const boundaryId = `${item.id}-bottom`;

        // Did MOUSE cross from above to below the bottom boundary?
        if (previousMouseY < bottomY && currentMouseY >= bottomY) {
          // Only trigger if different from last boundary
          if (session.lastCrossedBoundary !== boundaryId) {
            this.handleBoundaryCrossing(item, 'bottom');
            session.lastCrossedBoundary = boundaryId;
          }
        }
      }
    });
  }

  /**
   * Handle a boundary crossing - reorder the list
   * One item at a time movement - take the crossed item's slot
   */
  private handleBoundaryCrossing(item: ItemState, boundaryType: 'top' | 'bottom'): void {
    const session = this.state.currentDrag;
    if (!session) return;

    // Find current positions in itemOrder
    const draggedIndex = this.state.itemOrder.indexOf(session.draggedId);
    const targetItemIndex = this.state.itemOrder.indexOf(item.id);

    // Determine new slot based on boundary type
    let newSlot: number;

    if (boundaryType === 'top') {
      // Crossed item's top going UP → take item's current slot
      newSlot = targetItemIndex;
    } else {
      // Crossed item's bottom going DOWN → take item's current slot
      // (not slot after - that would skip the item)
      newSlot = targetItemIndex;
    }

    // Don't trigger if we're already in this slot
    if (newSlot === draggedIndex) return;

    // Reorder the list
    const newOrder = [...this.state.itemOrder];
    // Remove dragged item from current position
    newOrder.splice(draggedIndex, 1);
    // Insert at new slot
    newOrder.splice(newSlot, 0, session.draggedId);

    // Update state
    this.state.itemOrder = newOrder;
    session.currentSlot = newSlot;

    // Update indices
    newOrder.forEach((id, index) => {
      const itemState = this.state.items.get(id);
      if (itemState) {
        itemState.currentIndex = index;
      }
    });

    // Emit reorder event for animation
    this.emit('reorder', { newOrder, currentSlot: newSlot });
  }

  /**
   * Get final order - itemOrder IS the current order
   */
  calculateFinalOrder(): string[] {
    return [...this.state.itemOrder];
  }

  /**
   * Get current slot where dragged item belongs
   */
  calculateTargetIndex(): number {
    const session = this.state.currentDrag;
    return session?.currentSlot ?? 0;
  }

  /**
   * Get items that need shifts based on gap between start and current position
   * Items shift to fill the gap or make room, staying in sync with drag movement
   * - Dragging DOWN (currentSlot > startIndex): items between start and current shift UP
   * - Dragging UP (currentSlot < startIndex): items between current and start shift DOWN
   */
  getItemsToShift(): {
    shiftUp: ItemState[];
    shiftDown: ItemState[];
  } {
    const session = this.state.currentDrag;
    if (!session) {
      return { shiftUp: [], shiftDown: [] };
    }

    const shiftUp: ItemState[] = [];
    const shiftDown: ItemState[] = [];

    const startIndex = session.startIndex;
    const currentSlot = session.currentSlot;

    // Items shift based on whether they're in the "gap" between start and current
    // CRITICAL: Use CURRENT position from itemOrder, not cached currentIndex
    this.state.items.forEach(item => {
      if (item.id === session.draggedId) return;

      // Get item's CURRENT position from itemOrder (just reordered)
      const itemIndex = this.state.itemOrder.indexOf(item.id);

      if (currentSlot > startIndex) {
        // Dragging DOWN: items at startIndex through before currentSlot shift UP
        // After reorder, immediate neighbor is AT startIndex, so use >=
        if (itemIndex >= startIndex && itemIndex < currentSlot) {
          shiftUp.push(item);
        }
      } else if (currentSlot < startIndex) {
        // Dragging UP: items after dragged item up to start position shift DOWN
        if (itemIndex > currentSlot && itemIndex <= startIndex) {
          shiftDown.push(item);
        }
      }
      // If currentSlot === startIndex, no items shift (back at start)
    });

    return { shiftUp, shiftDown };
  }

  /**
   * End drag session and update order
   * CRITICAL: Immediately erase ALL data not needed for visual presentation
   */
  endDrag(newOrder: string[]): void {
    if (!this.state.currentDrag) return;

    // Update item order
    this.state.itemOrder = newOrder;

    // Update indices
    newOrder.forEach((id, index) => {
      const item = this.state.items.get(id);
      if (item) {
        item.currentIndex = index;
      }
    });

    // CRITICAL: Immediately clear ALL transform state in data object
    // This erases all animation/drag data, leaving only position/order data
    // State should be "fresh as a newborn daisy" - no memory of drag session
    this.state.items.forEach(item => {
      item.currentTransform.x = 0;
      item.currentTransform.y = 0;
      item.currentTransform.scale = 1;
      item.currentTransform.opacity = 1;
    });

    // Clear drag session IMMEDIATELY (erase all session data)
    this.state.currentDrag = null;
    this.state.isDragging = false;
    this.state.dragInProgress = false;

    // Schedule position refresh for next frame (after React re-renders DOM)
    // This updates positions from DOM, but transform state already clean
    requestAnimationFrame(() => {
      this.refreshPositions();
    });

    this.emit('drag-end', { newOrder });
  }

  /**
   * Cancel drag (ESC key, etc.)
   * Erase all drag session data immediately
   */
  cancelDrag(): void {
    // Clear ALL transform state immediately
    this.state.items.forEach(item => {
      item.currentTransform.x = 0;
      item.currentTransform.y = 0;
      item.currentTransform.scale = 1;
      item.currentTransform.opacity = 1;
    });

    // Clear drag session
    this.state.currentDrag = null;
    this.state.isDragging = false;
    this.state.dragInProgress = false;

    this.emit('drag-cancel');
  }

  // ===== GETTERS =====

  getItemState(id: string): ItemState | undefined {
    return this.state.items.get(id);
  }

  getAllItems(): ItemState[] {
    return Array.from(this.state.items.values());
  }

  getCurrentOrder(): string[] {
    return [...this.state.itemOrder];
  }

  getDragSession(): DragSession | null {
    return this.state.currentDrag;
  }

  isDragging(): boolean {
    return this.state.isDragging;
  }

  // ===== EVENT SYSTEM =====

  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function): void {
    const callbacks = this.listeners.get(event);
    if (!callbacks) return;

    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  private emit(event: string, data?: any): void {
    const callbacks = this.listeners.get(event);
    if (!callbacks) return;

    callbacks.forEach(callback => callback(data));
  }

  // ===== CLEANUP =====

  destroy(): void {
    this.state.items.clear();
    this.state.itemOrder = [];
    this.state.currentDrag = null;
    this.listeners.clear();
  }
}
