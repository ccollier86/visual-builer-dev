/**
 * React Hook for Template Builder Store
 */

import { useEffect, useState } from 'react';
import type { Store } from '@xstate/store';
import { templateBuilderStore } from '../stores/templateBuilderStore';
import type { TemplateBuilderState } from '../types/template';

/**
 * Subscribe to @xstate/store changes
 */
export function useSelector<T extends Store<any, any>, R>(
  store: T,
  selector: (snapshot: ReturnType<T['getSnapshot']>) => R
): R {
  const [value, setValue] = useState(() => selector(store.getSnapshot()));

  useEffect(() => {
    const subscription = store.subscribe((state) => {
      setValue(selector(state));
    });

    return () => subscription.unsubscribe();
  }, [store, selector]);

  return value;
}

/**
 * Get entire template builder state
 */
export function useTemplateBuilderState() {
  return useSelector(templateBuilderStore, (state) => state.context);
}

/**
 * Get just the template
 */
export function useTemplate() {
  return useSelector(templateBuilderStore, (state) => state.context.template);
}

/**
 * Get selected block
 */
export function useSelectedBlock() {
  return useSelector(templateBuilderStore, (state) => {
    const { selectedBlockId, template } = state.context;
    if (!selectedBlockId) return null;
    return template.blocks.find(b => b.id === selectedBlockId) || null;
  });
}

/**
 * Convenience hook with common actions
 */
export function useTemplateBuilder() {
  const state = useTemplateBuilderState();
  const template = state.template;
  const blocks = template.blocks;

  return {
    // State
    template,
    blocks,
    selectedBlockId: state.selectedBlockId,
    isBlockEditorOpen: state.isBlockEditorOpen,
    isDragging: state.isDragging,

    // Template actions
    setTemplate: (template: typeof state.template) =>
      templateBuilderStore.send({ type: 'setTemplate', template }),

    updateTemplateName: (name: string) =>
      templateBuilderStore.send({ type: 'updateTemplateName', name }),

    updateTemplateType: (templateType: typeof template.type) =>
      templateBuilderStore.send({ type: 'updateTemplateType', templateType }),

    setTheme: (theme: typeof template.theme) =>
      templateBuilderStore.send({ type: 'setTheme', theme }),

    // Block actions (unified for all block types)
    addBlock: (block: (typeof blocks)[0], atIndex?: number) =>
      templateBuilderStore.send({ type: 'addBlock', block, atIndex }),

    reorderBlocks: (blockIds: string[]) =>
      templateBuilderStore.send({ type: 'reorderBlocks', blockIds }),

    removeBlock: (blockId: string) =>
      templateBuilderStore.send({ type: 'removeBlock', blockId }),

    updateBlock: (blockId: string, updates: Partial<(typeof blocks)[0]>) =>
      templateBuilderStore.send({ type: 'updateBlock', blockId, updates }),

    // UI actions
    selectBlock: (blockId: string | null) =>
      templateBuilderStore.send({ type: 'selectBlock', blockId }),

    openBlockEditor: (blockId?: string) =>
      templateBuilderStore.send({ type: 'openBlockEditor', blockId }),

    closeBlockEditor: () =>
      templateBuilderStore.send({ type: 'closeBlockEditor' }),

    setDragging: (isDragging: boolean) =>
      templateBuilderStore.send({ type: 'setDragging', isDragging })
  };
}
