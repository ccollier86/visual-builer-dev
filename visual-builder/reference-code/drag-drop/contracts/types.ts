// Domain types (pure data structures)
export interface BlockPosition {
  id: string;
  top: number;
  height: number;
  index: number;
}

export interface DragState {
  isDragging: boolean;
  draggedId: string | null;
  originalIndex: number;
  targetIndex: number;
}

export interface GhostConfig {
  opacity: number;
  borderColor: string;
  borderStyle: string;
  zIndex: number;
}

export interface DropResult {
  type: 'canvas' | 'section';
  insertIndex: number;
  sectionId?: string;
}
