import type {
  FormCollection,
  FormControl,
  FormField,
  FormGroup,
  FormSection,
  FormStep,
  NoteTemplate,
} from '../derivation/types';

export interface RenderedForm {
  collection: FormCollection;
  steps: RenderedFormStep[];
  meta: {
    autoSave: boolean;
    multiStep: boolean;
    allowUpdates: boolean;
  };
}

export interface RenderedFormStep {
  id: string;
  title: string;
  description?: string;
  notes: RenderedFormNote[];
  sections: RenderedFormSection[];
  groups: RenderedFormGroup[];
  fields: RenderedFormField[];
}

export interface RenderedFormSection {
  id?: string;
  title: string;
  description?: string;
  layout?: RenderedLayoutHints;
  notes: RenderedFormNote[];
  fields: RenderedFormField[];
}

export interface RenderedFormGroup {
  id: string;
  title: string;
  repeatable: boolean;
  minItems?: number;
  maxItems?: number;
  layout?: RenderedLayoutHints;
  notes: RenderedFormNote[];
  fields: RenderedFormField[];
}

export interface RenderedFormField {
  id: string;
  label: string;
  description?: string;
  control: FormControl;
  targetPath?: string;
  validation?: FormField['validation'];
  defaults?: FormField['defaults'];
  repeatable: boolean;
  width?: 'full' | 'half' | 'third' | 'quarter';
}

export interface RenderedFormNote {
  id?: string;
  text: string;
  variant?: 'info' | 'warning' | 'success' | 'neutral';
}

export interface RenderedLayoutHints {
  columns?: number;
  columnGap?: string;
}

export interface RegistryComponent {
  type: string;
  componentId?: string;
}

export interface RegisteredComponentMeta {
  type: string;
  componentId?: string;
  renderer: FormComponentRenderer;
}

export interface FormComponentRenderer {
  render(props: FormComponentRenderProps): unknown;
}

export interface FormComponentRenderProps {
  field: RenderedFormField;
  value: unknown;
  onChange: (value: unknown) => void;
  context: FormRenderContext;
}

export interface FormRenderContext {
  collection: FormCollection;
  template: NoteTemplate;
}

export interface RenderOptions {
  template: NoteTemplate;
  collection: FormCollection;
  initialValues?: Record<string, unknown>;
}

export interface SubmissionClientOptions {
  endpoint: string;
  headers?: Record<string, string>;
  fetchImpl?: typeof fetch;
}

export interface SubmitFormArgs {
  collection: FormCollection;
  values: Record<string, unknown>;
}

export interface SubmissionAdapter {
  submit(args: SubmitFormArgs): Promise<unknown>;
}

export type SubmissionHandler = (args: SubmitFormArgs, next: SubmissionAdapter | undefined) => Promise<unknown>;
