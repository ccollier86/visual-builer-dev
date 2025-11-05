/**
 * Visual Template Builder - State Store
 * Uses @xstate/store for lightweight state management
 */

import { createStore } from '@xstate/store';
import type {
  Template,
  SectionComponent,
  FieldComponent,
  TemplateBuilderState,
  Theme
} from '../types/template';
import { DEFAULT_THEME } from './themes';

const EMPTY_TEMPLATE: Template = {
  id: null,
  name: 'Untitled Template',
  type: 'custom',
  sections: [],
  theme: DEFAULT_THEME
};

export const templateBuilderStore = createStore<TemplateBuilderState>(
  // Initial state
  {
    template: EMPTY_TEMPLATE,
    selectedSectionId: null,
    selectedFieldId: null,
    isFieldEditorOpen: false,
    isDragging: false
  },

  // Actions
  {
    // ===== TEMPLATE ACTIONS =====

    setTemplate: (ctx, event: { template: Template }) => ({
      template: event.template,
      selectedSectionId: null,
      selectedFieldId: null,
      isFieldEditorOpen: false
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

    // ===== SECTION ACTIONS =====

    addSection: (ctx, event: { section: SectionComponent; atIndex?: number }) => {
      const sections = [...ctx.template.sections];

      if (event.atIndex !== undefined) {
        sections.splice(event.atIndex, 0, event.section);
      } else {
        sections.push(event.section);
      }

      // Update order values
      sections.forEach((section, index) => {
        section.order = index;
      });

      return {
        template: {
          ...ctx.template,
          sections
        }
      };
    },

    reorderSections: (ctx, event: { sectionIds: string[] }) => {
      const sectionsMap = new Map(
        ctx.template.sections.map(s => [s.id, s])
      );

      const sections = event.sectionIds
        .map((id, index) => {
          const section = sectionsMap.get(id);
          if (section) {
            return { ...section, order: index };
          }
          return null;
        })
        .filter((s): s is SectionComponent => s !== null);

      return {
        template: {
          ...ctx.template,
          sections
        }
      };
    },

    removeSection: (ctx, event: { sectionId: string }) => {
      const sections = ctx.template.sections
        .filter(s => s.id !== event.sectionId)
        .map((s, index) => ({ ...s, order: index }));

      return {
        template: {
          ...ctx.template,
          sections
        },
        selectedSectionId: ctx.selectedSectionId === event.sectionId
          ? null
          : ctx.selectedSectionId
      };
    },

    updateSection: (ctx, event: { sectionId: string; updates: Partial<SectionComponent> }) => ({
      template: {
        ...ctx.template,
        sections: ctx.template.sections.map(section =>
          section.id === event.sectionId
            ? { ...section, ...event.updates }
            : section
        )
      }
    }),

    // ===== FIELD ACTIONS =====

    addField: (ctx, event: { sectionId: string; field: FieldComponent; atIndex?: number }) => ({
      template: {
        ...ctx.template,
        sections: ctx.template.sections.map(section => {
          if (section.id !== event.sectionId) return section;

          const fields = [...section.fields];

          if (event.atIndex !== undefined) {
            fields.splice(event.atIndex, 0, event.field);
          } else {
            fields.push(event.field);
          }

          // Update order values
          fields.forEach((field, index) => {
            field.order = index;
          });

          return { ...section, fields };
        })
      }
    }),

    reorderFields: (ctx, event: { sectionId: string; fieldIds: string[] }) => ({
      template: {
        ...ctx.template,
        sections: ctx.template.sections.map(section => {
          if (section.id !== event.sectionId) return section;

          const fieldsMap = new Map(section.fields.map(f => [f.id, f]));

          const fields = event.fieldIds
            .map((id, index) => {
              const field = fieldsMap.get(id);
              if (field) {
                return { ...field, order: index };
              }
              return null;
            })
            .filter((f): f is FieldComponent => f !== null);

          return { ...section, fields };
        })
      }
    }),

    removeField: (ctx, event: { sectionId: string; fieldId: string }) => ({
      template: {
        ...ctx.template,
        sections: ctx.template.sections.map(section => {
          if (section.id !== event.sectionId) return section;

          const fields = section.fields
            .filter(f => f.id !== event.fieldId)
            .map((f, index) => ({ ...f, order: index }));

          return { ...section, fields };
        })
      },
      selectedFieldId: ctx.selectedFieldId === event.fieldId
        ? null
        : ctx.selectedFieldId
    }),

    updateField: (ctx, event: { sectionId: string; fieldId: string; updates: Partial<FieldComponent> }) => ({
      template: {
        ...ctx.template,
        sections: ctx.template.sections.map(section => {
          if (section.id !== event.sectionId) return section;

          return {
            ...section,
            fields: section.fields.map(field =>
              field.id === event.fieldId
                ? { ...field, ...event.updates }
                : field
            )
          };
        })
      }
    }),

    // ===== UI STATE ACTIONS =====

    selectSection: (ctx, event: { sectionId: string | null }) => ({
      selectedSectionId: event.sectionId,
      selectedFieldId: null,
      isFieldEditorOpen: false
    }),

    selectField: (ctx, event: { fieldId: string | null }) => ({
      selectedFieldId: event.fieldId
    }),

    openFieldEditor: (ctx, event?: { fieldId: string }) => ({
      selectedFieldId: event?.fieldId || ctx.selectedFieldId,
      isFieldEditorOpen: true
    }),

    closeFieldEditor: (ctx) => ({
      isFieldEditorOpen: false
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
