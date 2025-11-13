/**
 * Zustand Store Adapter
 * Maps Zustand store methods to drag-drop callback interfaces
 */

import type { BlockReorderCallbacks, PaletteDragCallbacks, DropResult } from '../../contracts';
import type { Block, ComponentType } from '../../../../types/template';

/**
 * Store interface expected by adapters
 * This matches the useTemplateBuilder hook interface
 */
interface TemplateBuilderStore {
  addBlock: (block: Block, atIndex?: number) => void;
  reorderBlocks: (blockIds: string[]) => void;
  selectBlock: (blockId: string | null) => void;
  setDragging: (isDragging: boolean) => void;
}

/**
 * Create BlockReorderCallbacks from Zustand store
 *
 * Maps store actions to block reorder events:
 * - onDragStart: Set dragging state and select block
 * - onDragEnd: Update block order and clear dragging state
 *
 * @param store - Zustand store with template builder actions
 * @returns BlockReorderCallbacks for use with BlockReorderController
 */
export function createBlockReorderCallbacks(
  store: TemplateBuilderStore
): BlockReorderCallbacks {
  return {
    onDragStart: (blockId: string) => {
      store.setDragging(true);
      store.selectBlock(blockId);
    },

    onDragEnd: (blockId: string, newOrder: string[]) => {
      store.setDragging(false);
      store.reorderBlocks(newOrder);
    },

    onOrderChange: (newOrder: string[]) => {
      // Optional: Can be used for live preview during drag
      // Not implemented in current design
    }
  };
}

/**
 * Create PaletteDragCallbacks from Zustand store
 *
 * Maps store actions to palette drag events:
 * - onDragStart: Set dragging state
 * - onDragEnd: Clear dragging state
 * - onDrop: Create block and add to template
 * - onDropFail: Clear dragging state (no-op for now)
 *
 * @param store - Zustand store with template builder actions
 * @returns PaletteDragCallbacks for use with usePaletteDrag hook
 */
export function createPaletteDragCallbacks(
  store: TemplateBuilderStore
): PaletteDragCallbacks {
  return {
    onDragStart: (componentType: string, paletteId: string) => {
      store.setDragging(true);
    },

    onDragEnd: () => {
      store.setDragging(false);
    },

    onDrop: (result: DropResult, componentType: string, paletteId: string) => {
      // Create block from component type
      const block = createBlockFromType(componentType as ComponentType, paletteId);

      // Add block at the calculated insert index
      store.addBlock(block, result.insertIndex);

      // Clear dragging state
      store.setDragging(false);
    },

    onDropFail: () => {
      // Just clear dragging state
      store.setDragging(false);
    }
  };
}

/**
 * Create a new block from component type
 * This is the block factory that creates properly typed blocks
 *
 * @param type - Component type from palette
 * @param paletteId - Original palette item ID
 * @returns New block instance with defaults
 */
function createBlockFromType(type: ComponentType, paletteId: string): Block {
  const blockId = `${type}-${Date.now()}`;
  const order = 0; // Will be set by store based on insertIndex

  switch (type) {
    case 'section':
      return {
        id: blockId,
        type: 'section',
        order,
        title: 'New Section',
        layout: 'stacked',
        showTitle: true,
        titleStyle: {
          fontSize: 18,
          fontWeight: 600,
          color: '#1f2937',
          textTransform: 'uppercase',
          borderBottom: true,
          marginBottom: 16
        },
        spacing: {
          marginBottom: 24,
          paddingInside: 0
        },
        border: {
          enabled: false,
          color: '#e5e7eb',
          width: 1,
          style: 'solid'
        },
        background: {
          enabled: false,
          color: '#f9fafb'
        }
      };

    case 'field':
      return {
        id: blockId,
        type: 'field',
        order,
        path: `field_${Date.now()}`,
        label: 'New Field',
        source: 'prop',
        fieldType: 'string',
        dataPath: '',
        display: {
          inline: false,
          labelPosition: 'above',
          bold: false,
          italic: false,
          fontSize: 'inherit'
        }
      };

    case 'narrative':
      return {
        id: blockId,
        type: 'narrative',
        order,
        path: `narrative_${Date.now()}`,
        label: 'New Narrative',
        source: 'prop',
        dataPath: '',
        showLabel: true,
        labelStyle: 'title',
        paragraphSpacing: 12,
        textAlign: 'left',
        indentFirstLine: false
      };

    case 'list':
      return {
        id: blockId,
        type: 'list',
        order,
        path: `list_${Date.now()}`,
        label: 'New List',
        listType: 'unordered',
        source: 'prop',
        dataPath: '',
        showLabel: true,
        labelPosition: 'above',
        bulletStyle: 'disc',
        indent: 24,
        itemSpacing: 8
      };

    case 'table':
      return {
        id: blockId,
        type: 'table',
        order,
        path: `table_${Date.now()}`,
        label: 'New Table',
        columns: [],
        source: 'prop',
        dataPath: '',
        showLabel: true,
        showHeaders: true,
        borders: 'all',
        alternateRows: true,
        headerBackground: '#f3f4f6',
        headerTextColor: '#111827',
        cellPadding: 8
      };

    case 'grid':
      return {
        id: blockId,
        type: 'grid',
        order,
        path: `grid_${Date.now()}`,
        label: 'New Grid',
        columns: 2,
        columnGap: 16,
        rowGap: 16,
        fields: [],
        showLabel: true,
        cellBackground: '#ffffff',
        cellBorder: false,
        cellPadding: 8
      };

    case 'alert':
      return {
        id: blockId,
        type: 'alert',
        order,
        path: `alert_${Date.now()}`,
        label: 'Alert',
        source: 'prop',
        dataPath: '',
        variant: 'info',
        showIcon: true,
        backgroundColor: '#dbeafe',
        borderColor: '#3b82f6',
        textColor: '#1e40af',
        borderLeft: true,
        fontSize: 'inherit',
        padding: 12
      };

    case 'divider':
      return {
        id: blockId,
        type: 'divider',
        order,
        style: 'solid',
        thickness: 1,
        color: '#e5e7eb',
        marginTop: 16,
        marginBottom: 16,
        width: 100
      };

    case 'image':
      return {
        id: blockId,
        type: 'image',
        order,
        source: 'url',
        imageUrl: '',
        alt: 'Image',
        align: 'center',
        marginTop: 16,
        marginBottom: 16
      };

    case 'spacer':
      return {
        id: blockId,
        type: 'spacer',
        order,
        height: 24
      };

    default:
      // Fallback to field
      return {
        id: blockId,
        type: 'field',
        order,
        path: `field_${Date.now()}`,
        label: 'New Field',
        source: 'prop',
        fieldType: 'string',
        dataPath: '',
        display: {
          inline: false,
          labelPosition: 'above',
          bold: false,
          italic: false,
          fontSize: 'inherit'
        }
      };
  }
}
