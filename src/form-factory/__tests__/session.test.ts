import { describe, expect, it } from 'bun:test';
import type { NoteTemplate } from '../../derivation/types';
import { FormSession } from '../session';
import type { SubmissionAdapter, SubmitFormArgs } from '../types';

class MockSubmissionClient implements SubmissionAdapter {
  public calls: SubmitFormArgs[] = [];
  async submit(args: SubmitFormArgs): Promise<void> {
    this.calls.push(args);
  }
}

function buildTemplate(): NoteTemplate {
  return {
    id: 'tmpl-sdk',
    name: 'SDK Template',
    version: '1.0.0',
    layout: [],
    inputCollections: [
      {
        id: 'patient-intake',
        label: 'Patient Intake',
        version: '1.0.0',
        audience: 'public',
        mode: 'async',
        delivery: ['web'],
        autoSave: true,
        storage: { table: 'patient_intake' },
        steps: [
          {
            id: 'step-1',
            title: 'Basics',
            fields: [
              {
                id: 'full-name',
                label: 'Full Name',
                control: { type: 'text' },
              },
              {
                id: 'email',
                label: 'Email',
                control: { type: 'text' },
              },
            ],
          },
          {
            id: 'step-2',
            title: 'Details',
            fields: [
              {
                id: 'housing-status',
                label: 'Housing Status',
                control: { type: 'select', props: { options: ['Stable', 'Unstable'] } },
              },
            ],
          },
        ],
      },
    ],
  } as NoteTemplate;
}

describe('FormSession', () => {
  it('tracks step navigation and values', () => {
    const template = buildTemplate();
    const collection = template.inputCollections![0];
    const session = new FormSession({ template, collection });

    session.setValue('full-name', 'Jane Doe');
    expect(session.getValue('full-name')).toBe('Jane Doe');

    expect(session.getCurrentStepIndex()).toBe(0);
    session.nextStep();
    expect(session.getCurrentStepIndex()).toBe(1);
    session.nextStep();
    expect(session.getCurrentStepIndex()).toBe(1);
    session.previousStep();
    expect(session.getCurrentStepIndex()).toBe(0);
  });

  it('auto-saves when enabled', async () => {
    const template = buildTemplate();
    const collection = template.inputCollections![0];
    const mockSubmission = new MockSubmissionClient();

    const session = new FormSession({
      template,
      collection,
      submissionClient: mockSubmission,
      autoSaveIntervalMs: 10,
    });

    session.setValue('full-name', 'Jane Doe');
    await Bun.sleep(30);
    expect(mockSubmission.calls.length).toBeGreaterThan(0);
    session.dispose();
  });

  it('submits values via submission client', async () => {
    const template = buildTemplate();
    const collection = template.inputCollections![0];
    const mockSubmission = new MockSubmissionClient();

    const session = new FormSession({
      template,
      collection,
      submissionClient: mockSubmission,
      autoSaveIntervalMs: 10,
    });

    session.setValue('email', 'user@example.com');
    await session.submit();

    expect(mockSubmission.calls.at(-1)?.values.email).toBe('user@example.com');
    session.dispose();
  });
});
