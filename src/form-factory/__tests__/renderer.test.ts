import { describe, expect, it } from 'bun:test';
import type { NoteTemplate } from '../../derivation/types';
import { renderFormCollection } from '../renderer';

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
            ],
          },
        ],
      },
    ],
  } as NoteTemplate;
}

describe('renderFormCollection', () => {
  it('returns structured render tree with defaults', () => {
    const template = buildTemplate();
    const collection = template.inputCollections![0];

    const result = renderFormCollection({ template, collection });

    expect(result.collection.id).toBe('patient-intake');
    expect(result.meta.autoSave).toBe(true);
    expect(result.steps[0].fields[0].id).toBe('full-name');
  });
});
