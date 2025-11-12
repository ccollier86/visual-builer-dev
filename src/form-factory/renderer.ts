import type { FormCollection, FormField, FormGroup, FormSection, FormStep, NoteTemplate } from '../derivation/types';
import type {
  RenderOptions,
  RenderedForm,
  RenderedFormField,
  RenderedFormGroup,
  RenderedFormNote,
  RenderedFormSection,
  RenderedFormStep,
} from './types';

export function renderFormCollection(options: RenderOptions): RenderedForm {
  const { collection, template } = options;

  const steps = (collection.steps ?? []).map(step => renderStep(step));

  return {
    collection,
    steps,
    meta: {
      autoSave: Boolean(collection.autoSave),
      multiStep: collection.multiStep !== false,
      allowUpdates: Boolean(collection.allowUpdates),
    },
  };

  function renderStep(step: FormStep): RenderedFormStep {
    return {
      id: step.id,
      title: step.title,
      description: step.description,
      notes: renderNotes(step.notes),
      sections: (step.sections ?? []).map(section => renderSection(section)),
      groups: (step.groups ?? []).map(group => renderGroup(group)),
      fields: renderFields(step.fields),
    };
  }

  function renderSection(section: FormSection): RenderedFormSection {
    return {
      id: section.id,
      title: section.title,
      description: section.description,
      layout: section.layout,
      notes: renderNotes(section.notes),
      fields: renderFields(section.fields),
    };
  }

  function renderGroup(group: FormGroup): RenderedFormGroup {
    return {
      id: group.id,
      title: group.title,
      repeatable: Boolean(group.repeatable),
      minItems: group.minItems,
      maxItems: group.maxItems,
      layout: group.layout,
      notes: renderNotes(group.notes),
      fields: renderFields(group.fields),
    };
  }

  function renderFields(fields?: FormField[]): RenderedFormField[] {
    if (!fields) return [];
    return fields.map(field => ({
      id: field.id,
      label: field.label,
      description: field.description,
      control: field.control,
      targetPath: field.targetPath,
      validation: field.validation,
      defaults: field.defaults,
      repeatable: Boolean(field.repeatable),
      width: field.width,
    }));
  }

  function renderNotes(notes?: RenderedFormNote[]): RenderedFormNote[] {
    if (!notes) return [];
    return notes.map(note => ({ ...note }));
  }
}
