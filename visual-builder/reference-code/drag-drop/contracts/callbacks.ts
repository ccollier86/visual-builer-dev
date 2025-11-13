import type { DropResult } from './types';

// Callback interfaces (injected by consumers)
export interface BlockReorderCallbacks {
  onDragStart?: (blockId: string) => void;
  onDragEnd: (blockId: string, newOrder: string[]) => void;
  onOrderChange?: (newOrder: string[]) => void;
}

export interface PaletteDragCallbacks {
  onDragStart?: (componentType: string, paletteId: string) => void;
  onDragEnd?: () => void;
  onDrop: (result: DropResult, componentType: string, paletteId: string) => void;
  onDropFail?: () => void;
}
