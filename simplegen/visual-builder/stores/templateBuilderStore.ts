/**
 * Visual Template Builder - State Store
 * Uses @xstate/store for lightweight state management
 */

import { createStore } from '@xstate/store';
import type {
  Template,
  Block,
  TemplateBuilderState,
  Theme
} from '../types/template';
import { DEFAULT_THEME } from './themes';

const EMPTY_TEMPLATE: Template = {
  id: null,
  name: 'Untitled Template',
  type: 'custom',
  blocks: [],
  theme: DEFAULT_THEME
};

export const templateBuilderStore = createStore<TemplateBuilderState>(
  // Initial state
  {
    template: EMPTY_TEMPLATE,
    selectedBlockId: null,
    isBlockEditorOpen: false,
    isDragging: false
  },

  // Actions
  {
    // ===== TEMPLATE ACTIONS =====

    setTemplate: (ctx, event: { template: Template }) => ({
      template: event.template,
      selectedBlockId: null,
      isBlockEditorOpen: false
    }),

    updateTemplateName: (ctx, event: { name: string }) => ({
      template: {
        ...ctx.template,
        name: event.name
      }
    }),

    updateTemplateType: (ctx, event: { type: Template['type'] }) => ({
      template: {
        ...ctx.template,
        type: event.type
      }
    }),

    setTheme: (ctx, event: { theme: Theme }) => ({
      template: {
        ...ctx.template,
        theme: event.theme
      }
    }),

    // ===== BLOCK ACTIONS (Unified - works for any block type) =====

    addBlock: (ctx, event: { block: Block; atIndex?: number }) => {
      const blocks = [...ctx.template.blocks];

      if (event.atIndex !== undefined) {
        blocks.splice(event.atIndex, 0, event.block);
      } else {
        blocks.push(event.block);
      }

      // Update order values
      blocks.forEach((block, index) => {
        block.order = index;
      });

      return {
        template: {
          ...ctx.template,
          blocks
        }
      };
    },

    reorderBlocks: (ctx, event: { blockIds: string[] }) => {
      const blocksMap = new Map(
        ctx.template.blocks.map(b => [b.id, b])
      );

      const blocks = event.blockIds
        .map((id, index) => {
          const block = blocksMap.get(id);
          if (block) {
            return { ...block, order: index };
          }
          return null;
        })
        .filter((b): b is Block => b !== null);

      return {
        template: {
          ...ctx.template,
          blocks
        }
      };
    },

    removeBlock: (ctx, event: { blockId: string }) => {
      const blocks = ctx.template.blocks
        .filter(b => b.id !== event.blockId)
        .map((b, index) => ({ ...b, order: index }));

      return {
        template: {
          ...ctx.template,
          blocks
        },
        selectedBlockId: ctx.selectedBlockId === event.blockId
          ? null
          : ctx.selectedBlockId
      };
    },

    updateBlock: (ctx, event: { blockId: string; updates: Partial<Block> }) => ({
      template: {
        ...ctx.template,
        blocks: ctx.template.blocks.map(block =>
          block.id === event.blockId
            ? { ...block, ...event.updates }
            : block
        )
      }
    }),

    // ===== UI STATE ACTIONS =====

    selectBlock: (ctx, event: { blockId: string | null }) => ({
      selectedBlockId: event.blockId
    }),

    openBlockEditor: (ctx, event?: { blockId: string }) => ({
      selectedBlockId: event?.blockId || ctx.selectedBlockId,
      isBlockEditorOpen: true
    }),

    closeBlockEditor: (ctx) => ({
      isBlockEditorOpen: false
    }),

    setDragging: (ctx, event: { isDragging: boolean }) => ({
      isDragging: event.isDragging
    })
  }
);

// Helper functions for common operations
export function getSectionById(state: TemplateBuilderState, sectionId: string): SectionComponent | undefined {
  return state.template.sections.find(s => s.id === sectionId);
}

export function getFieldById(state: TemplateBuilderState, sectionId: string, fieldId: string): FieldComponent | undefined {
  const section = getSectionById(state, sectionId);
  return section?.fields.find(f => f.id === fieldId);
}

export function getSelectedSection(state: TemplateBuilderState): SectionComponent | undefined {
  if (!state.selectedSectionId) return undefined;
  return getSectionById(state, state.selectedSectionId);
}

export function getSelectedField(state: TemplateBuilderState): { section: SectionComponent; field: FieldComponent } | undefined {
  if (!state.selectedFieldId) return undefined;

  for (const section of state.template.sections) {
    const field = section.fields.find(f => f.id === state.selectedFieldId);
    if (field) {
      return { section, field };
    }
  }

  return undefined;
}
