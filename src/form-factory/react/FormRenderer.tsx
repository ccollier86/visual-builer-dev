import React, { Fragment, useMemo } from 'react';
import type { FormSession } from '../session';
import { renderFormCollection } from '../renderer';
import type { FormComponentRegistry } from '../registry';
import type { RenderedFormField, RenderedFormGroup, RenderedFormSection, RenderedFormStep } from '../types';
import type { NoteTemplate } from '../../derivation/types';

interface FormRendererProps {
  template: NoteTemplate;
  session: FormSession;
  registry: FormComponentRegistry;
  onSubmit?: (event: React.FormEvent<HTMLFormElement>) => Promise<void> | void;
}

export function FormRenderer({ template, session, registry, onSubmit }: FormRendererProps) {
  const renderTree = useMemo(
    () =>
      renderFormCollection({
        template,
        collection: session.getCollection(),
        initialValues: session.getValues(),
      }),
    [template, session]
  );

  const currentStepIndex = session.getCurrentStepIndex();
  const currentStep = renderTree.steps[currentStepIndex];

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await session.submit();
    await onSubmit?.(event);
  };

  return (
    <form onSubmit={handleSubmit} className="form-factory">
      <Step key={currentStep.id} step={currentStep} registry={registry} session={session} />
      <nav className="form-navigation">
        <button
          type="button"
          disabled={currentStepIndex === 0}
          onClick={() => session.previousStep()}
        >
          Previous
        </button>
        {currentStepIndex < renderTree.steps.length - 1 ? (
          <button type="button" onClick={() => session.nextStep()}>
            Next
          </button>
        ) : (
          <button type="submit">Submit</button>
        )}
      </nav>
    </form>
  );
}

function Step({
  step,
  registry,
  session,
}: {
  step: RenderedFormStep;
  registry: FormComponentRegistry;
  session: FormSession;
}) {
  return (
    <section className="form-step">
      <header>
        <h2>{step.title}</h2>
        {step.description && <p>{step.description}</p>}
        {step.notes.map(note => (
          <p key={note.id ?? note.text} className={`note note-${note.variant ?? 'neutral'}`}>
            {note.text}
          </p>
        ))}
      </header>
      {step.sections.map(section => (
        <Section key={section.id ?? section.title} section={section} registry={registry} session={session} />
      ))}
      {step.groups.map(group => (
        <Group key={group.id} group={group} registry={registry} session={session} />
      ))}
      <FieldGrid fields={step.fields} registry={registry} session={session} />
    </section>
  );
}

function Section({
  section,
  registry,
  session,
}: {
  section: RenderedFormSection;
  registry: FormComponentRegistry;
  session: FormSession;
}) {
  return (
    <div className="form-section">
      <h3>{section.title}</h3>
      {section.description && <p>{section.description}</p>}
      {section.notes.map(note => (
        <p key={note.id ?? note.text} className={`note note-${note.variant ?? 'neutral'}`}>
          {note.text}
        </p>
      ))}
      <FieldGrid fields={section.fields} registry={registry} session={session} />
    </div>
  );
}

function Group({
  group,
  registry,
  session,
}: {
  group: RenderedFormGroup;
  registry: FormComponentRegistry;
  session: FormSession;
}) {
  const values = (session.getValue(group.id) as Record<string, unknown>[]) ?? [];

  return (
    <div className="form-group">
      <h4>{group.title}</h4>
      {group.notes.map(note => (
        <p key={note.id ?? note.text} className={`note note-${note.variant ?? 'neutral'}`}>
          {note.text}
        </p>
      ))}
      {values.map((entry, index) => (
        <div key={`${group.id}-${index}`} className="form-group-row">
          <FieldGrid
            fields={group.fields}
            registry={registry}
            session={session}
            prefix={`${group.id}.${index}`}
            valuesOverride={entry}
            onChange={(fieldId, value) => {
              const next = [...values];
              next[index] = { ...next[index], [fieldId]: value };
              session.setValue(group.id, next);
            }}
          />
          <button type="button" onClick={() => session.removeGroupItem(group.id, index)}>
            Remove
          </button>
        </div>
      ))}
      {group.repeatable && (
        <button type="button" onClick={() => session.appendGroupItem(group.id)}>
          Add Another
        </button>
      )}
    </div>
  );
}

function FieldGrid({
  fields,
  registry,
  session,
  prefix,
  valuesOverride,
  onChange,
}: {
  fields: RenderedFormField[];
  registry: FormComponentRegistry;
  session: FormSession;
  prefix?: string;
  valuesOverride?: Record<string, unknown>;
  onChange?: (fieldId: string, value: unknown) => void;
}) {
  if (fields.length === 0) return null;

  return (
    <div className="field-grid">
      {fields.map(field => {
        const renderer = registry.resolve(field.control);
        const value = valuesOverride?.[field.id] ?? session.getValue(field.id);
        const changeHandler = (nextValue: unknown) => {
          if (onChange) {
            onChange(field.id, nextValue);
          } else {
            session.setValue(field.id, nextValue);
          }
        };

        return (
          <div key={field.id} className={`field width-${field.width ?? 'full'}`}>
            <label htmlFor={field.id}>{field.label}</label>
            {field.description && <small>{field.description}</small>}
            {renderer ? (
              <Fragment>
                {renderer.render({
                  field,
                  value,
                  onChange: changeHandler,
                  context: { template: session.getTemplate(), collection: session.getCollection() },
                })}
              </Fragment>
            ) : (
              <div className="missing-renderer">No renderer for {field.control.type}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
