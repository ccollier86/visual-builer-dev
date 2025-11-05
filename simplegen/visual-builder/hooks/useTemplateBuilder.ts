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
 * Get selected section
 */
export function useSelectedSection() {
  return useSelector(templateBuilderStore, (state) => {
    const { selectedSectionId, template } = state.context;
    if (!selectedSectionId) return null;
    return template.sections.find(s => s.id === selectedSectionId) || null;
  });
}

/**
 * Get selected field (with its parent section)
 */
export function useSelectedField() {
  return useSelector(templateBuilderStore, (state) => {
    const { selectedFieldId, template } = state.context;
    if (!selectedFieldId) return null;

    for (const section of template.sections) {
      const field = section.fields.find(f => f.id === selectedFieldId);
      if (field) {
        return { section, field };
      }
    }

    return null;
  });
}

/**
 * Convenience hook with common actions
 */
export function useTemplateBuilder() {
  const state = useTemplateBuilderState();
  const template = state.template;
  const sections = template.sections;

  return {
    // State
    template,
    sections,
    selectedSectionId: state.selectedSectionId,
    selectedFieldId: state.selectedFieldId,
    isFieldEditorOpen: state.isFieldEditorOpen,
    isDragging: state.isDragging,

    // Template actions
    setTemplate: (template: typeof state.template) =>
      templateBuilderStore.send({ type: 'setTemplate', template }),

    updateTemplateName: (name: string) =>
      templateBuilderStore.send({ type: 'updateTemplateName', name }),

    updateTemplateType: (type: typeof template.type) =>
      templateBuilderStore.send({ type: 'updateTemplateType', type }),

    setTheme: (theme: typeof template.theme) =>
      templateBuilderStore.send({ type: 'setTheme', theme }),

    // Section actions
    addSection: (section: (typeof sections)[0], atIndex?: number) =>
      templateBuilderStore.send({ type: 'addSection', section, atIndex }),

    reorderSections: (sectionIds: string[]) =>
      templateBuilderStore.send({ type: 'reorderSections', sectionIds }),

    removeSection: (sectionId: string) =>
      templateBuilderStore.send({ type: 'removeSection', sectionId }),

    updateSection: (sectionId: string, updates: Partial<(typeof sections)[0]>) =>
      templateBuilderStore.send({ type: 'updateSection', sectionId, updates }),

    // Field actions
    addField: (sectionId: string, field: any, atIndex?: number) =>
      templateBuilderStore.send({ type: 'addField', sectionId, field, atIndex }),

    reorderFields: (sectionId: string, fieldIds: string[]) =>
      templateBuilderStore.send({ type: 'reorderFields', sectionId, fieldIds }),

    removeField: (sectionId: string, fieldId: string) =>
      templateBuilderStore.send({ type: 'removeField', sectionId, fieldId }),

    updateField: (sectionId: string, fieldId: string, updates: any) =>
      templateBuilderStore.send({ type: 'updateField', sectionId, fieldId, updates }),

    // UI actions
    selectSection: (sectionId: string | null) =>
      templateBuilderStore.send({ type: 'selectSection', sectionId }),

    selectField: (fieldId: string | null) =>
      templateBuilderStore.send({ type: 'selectField', fieldId }),

    openFieldEditor: (fieldId?: string) =>
      templateBuilderStore.send({ type: 'openFieldEditor', fieldId }),

    closeFieldEditor: () =>
      templateBuilderStore.send({ type: 'closeFieldEditor' }),

    setDragging: (isDragging: boolean) =>
      templateBuilderStore.send({ type: 'setDragging', isDragging })
  };
}
