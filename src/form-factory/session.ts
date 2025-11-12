import type { FormCollection, FormField, FormGroup, FormSection, FormStep, NoteTemplate } from '../derivation/types';
import type { RenderOptions, SubmissionAdapter } from './types';

export interface FormSessionOptions {
  template: NoteTemplate;
  collection: FormCollection;
  submissionClient?: SubmissionAdapter;
  initialValues?: Record<string, unknown>;
  autoSaveIntervalMs?: number;
  onAutoSave?: (values: Record<string, unknown>) => void | Promise<void>;
  onAutoSaveError?: (error: unknown) => void;
}

export class FormSession {
  private template: NoteTemplate;
  private collection: FormCollection;
  private submissionClient?: SubmissionAdapter;
  private values: Record<string, unknown>;
  private currentStepIndex = 0;
  private autoSaveInterval: number;
  private autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;
  private pendingAutoSave = false;
  private readonly onAutoSave?: (values: Record<string, unknown>) => void | Promise<void>;
  private readonly onAutoSaveError?: (error: unknown) => void;

  constructor(options: FormSessionOptions) {
    this.template = options.template;
    this.collection = options.collection;
    this.submissionClient = options.submissionClient;
    this.values = { ...(options.initialValues ?? {}) };
    this.autoSaveInterval = options.autoSaveIntervalMs ?? 1000;
    this.onAutoSave = options.onAutoSave;
    this.onAutoSaveError = options.onAutoSaveError;
  }

  getCollection(): FormCollection {
    return this.collection;
  }

  getTemplate(): NoteTemplate {
    return this.template;
  }

  getCurrentStep(): FormStep | undefined {
    return this.collection.steps?.[this.currentStepIndex];
  }

  getCurrentStepIndex(): number {
    return this.currentStepIndex;
  }

  getValues(): Record<string, unknown> {
    return { ...this.values };
  }

  setValue(fieldId: string, value: unknown): void {
    this.values[fieldId] = value;
    this.scheduleAutoSave();
  }

  getValue(fieldId: string): unknown {
    return this.values[fieldId];
  }

  nextStep(): number {
    const total = this.collection.steps?.length ?? 0;
    if (this.currentStepIndex < total - 1) {
      this.currentStepIndex += 1;
    }
    return this.currentStepIndex;
  }

  previousStep(): number {
    if (this.currentStepIndex > 0) {
      this.currentStepIndex -= 1;
    }
    return this.currentStepIndex;
  }

  async submit(): Promise<unknown> {
    this.clearAutoSaveTimer();
    if (!this.submissionClient) {
      throw new Error('No submission client configured for this session.');
    }
    const submission = await this.submissionClient.submit({
      collection: this.collection,
      values: this.getValues(),
    });
    return submission;
  }

  dispose(): void {
    this.disposed = true;
    this.clearAutoSaveTimer();
  }

  createRenderOptions(): RenderOptions {
    return {
      template: this.template,
      collection: this.collection,
      initialValues: this.getValues(),
    };
  }

  /**
   * Convenience helpers for repeatable groups.
   */
  appendGroupItem(groupId: string): void {
    const group = findGroupById(this.collection, groupId);
    if (!group) return;
    const groupFields = group.fields ?? [];
    const existing = (this.values[groupId] as Record<string, unknown>[]) ?? [];
    const newEntry: Record<string, unknown> = {};
    for (const field of groupFields) {
      newEntry[field.id] = undefined;
    }
    this.values[groupId] = [...existing, newEntry];
    this.scheduleAutoSave();
  }

  removeGroupItem(groupId: string, index: number): void {
    const existing = (this.values[groupId] as Record<string, unknown>[]) ?? [];
    if (index < 0 || index >= existing.length) return;
    const next = [...existing];
    next.splice(index, 1);
    this.values[groupId] = next;
    this.scheduleAutoSave();
  }

  private scheduleAutoSave(): void {
    if (this.disposed) return;
    if (!this.collection.autoSave || !this.submissionClient) {
      return;
    }
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
    }
    this.autoSaveTimer = setTimeout(() => {
      void this.performAutoSave();
    }, this.autoSaveInterval);
  }

  private async performAutoSave(): Promise<void> {
    if (this.disposed || this.pendingAutoSave) {
      return;
    }
    this.pendingAutoSave = true;
    try {
      await this.submissionClient?.submit({
        collection: this.collection,
        values: this.getValues(),
      });
      if (this.onAutoSave) {
        await this.onAutoSave(this.getValues());
      }
    } catch (error) {
      this.onAutoSaveError?.(error);
    } finally {
      this.pendingAutoSave = false;
    }
  }

  private clearAutoSaveTimer(): void {
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }
}

function findGroupById(collection: FormCollection, groupId: string): FormGroup | undefined {
  for (const step of collection.steps ?? []) {
    for (const group of step.groups ?? []) {
      if (group.id === groupId) {
        return group;
      }
    }
  }
  return undefined;
}
