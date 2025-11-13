import type { GhostConfig } from './types';

// Configuration interfaces
export interface BlockReorderConfig {
  containerSelector: string;
  blockSelector: string;
  handleSelector: string;
  animationDuration?: number; // ms
  throttleMs?: number; // 60fps = 16ms
  gpuAcceleration?: boolean;
  flipEffect?: boolean; // Enable 3D flip animation during reorder
}

export interface PaletteDragConfig {
  paletteItemSelector: string;
  dropZoneSelector: string;
  minimumMovement?: number; // px
  ghostConfig?: Partial<GhostConfig>;
}
