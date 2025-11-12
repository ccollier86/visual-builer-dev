import type { FormControl } from '../derivation/types';
import type { FormComponentRenderer, RegisteredComponentMeta } from './types';

export class FormComponentRegistry {
  private components = new Map<string, RegisteredComponentMeta>();

  constructor() {
    this.registerDefaults();
  }

  register(typeOrId: string, renderer: FormComponentRenderer): void {
    this.components.set(typeOrId, {
      type: typeOrId,
      componentId: typeOrId,
      renderer,
    });
  }

  resolve(control: FormControl): RegisteredComponentMeta | undefined {
    if (control.componentId && this.components.has(control.componentId)) {
      return this.components.get(control.componentId);
    }
    if (this.components.has(control.type)) {
      return this.components.get(control.type);
    }
    return undefined;
  }

  private registerDefaults(): void {
    const noopRenderer: FormComponentRenderer = {
      render: (props) => ({
        type: 'primitive',
        field: props.field,
        value: props.value,
      }),
    };

    const defaults = ['text', 'textarea', 'number', 'date', 'select', 'multiselect', 'checkbox'];
    for (const key of defaults) {
      this.register(key, noopRenderer);
    }

    // placeholder for custom
    this.register('custom', {
      render: (props) => ({
        type: 'custom',
        componentId: props.field.control.componentId,
        field: props.field,
      }),
    });
  }
}
