import React from 'react';
import type { ChangeEvent } from 'react';
import type { FormComponentRenderer, FormComponentRenderProps } from '../types';
import { FormComponentRegistry } from '../registry';

export function createReactRegistry(): FormComponentRegistry {
  const registry = new FormComponentRegistry();
  registerPrimitiveControls(registry);
  return registry;
}

function registerPrimitiveControls(registry: FormComponentRegistry): void {
  registry.register('text', makeInput('text'));
  registry.register('textarea', {
    render: ({ field, value, onChange }) => (
      <textarea
        id={field.id}
        value={(value as string) ?? ''}
        onChange={(event) => onChange(event.target.value)}
      />
    ),
  });
  registry.register('number', makeInput('number'));
  registry.register('date', makeInput('date'));
  registry.register('select', {
    render: ({ field, value, onChange }) => {
      const options = (field.control.props as { options?: string[] })?.options ?? [];
      return (
        <select
          id={field.id}
          value={(value as string) ?? ''}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">Select...</option>
          {options.map(option => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    },
  });
  registry.register('multiselect', {
    render: ({ field, value, onChange }) => {
      const options = (field.control.props as { options?: string[] })?.options ?? [];
      const selected = (value as string[]) ?? [];
      const toggle = (option: string, checked: boolean) => {
        if (checked) {
          onChange([...selected, option]);
        } else {
          onChange(selected.filter(item => item !== option));
        }
      };
      return (
        <div id={field.id}>
          {options.map(option => (
            <label key={option}>
              <input
                type="checkbox"
                checked={selected.includes(option)}
                onChange={(event) => toggle(option, event.target.checked)}
              />
              {option}
            </label>
          ))}
        </div>
      );
    },
  });
  registry.register('checkbox', {
    render: ({ field, value, onChange }) => (
      <input
        id={field.id}
        type="checkbox"
        checked={Boolean(value)}
        onChange={(event) => onChange(event.target.checked)}
      />
    ),
  });
}

function makeInput(type: 'text' | 'number' | 'date'):
  FormComponentRenderer {
  return {
    render: ({ field, value, onChange }: FormComponentRenderProps) => (
      <input
        id={field.id}
        type={type}
        value={(value as string | number | undefined) ?? ''}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
      />
    ),
  };
}
