import { describe, expect, it } from 'bun:test';
import type { ContentItem, NoteTemplate } from '../../derivation/types';
import { lintNoteTemplate } from '../lint';

function buildTemplate(content: ContentItem[]): NoteTemplate {
  return {
    id: 'tmpl-lint',
    name: 'Lint Template',
    version: '1.0.0',
    layout: [
      {
        id: 'section',
        type: 'section',
        content,
      },
    ],
  };
}

describe('lintNoteTemplate', () => {
  it('flags AI slots without source or aiDeps', () => {
    const template = buildTemplate([
      {
        slot: 'ai',
        id: 'summary',
        outputPath: 'summary.text',
      },
    ]);

    const result = lintNoteTemplate(template);
    expect(result.errors.some(issue => issue.code === 'ai.deps.required')).toBe(true);
  });

  it('checks table column alignment', () => {
    const template: NoteTemplate = {
      id: 'tmpl-table',
      name: 'Table Template',
      version: '1.0.0',
      layout: [
        {
          id: 'diagnostic-table',
          type: 'table',
          props: {
            columns: ['One', 'Two'],
          },
          content: [
            {
              slot: 'ai',
              id: 'table-root',
              outputPath: 'diagnostic.rows[]',
              tableMap: [
                {
                  slot: 'ai',
                  id: 'col-a',
                  outputPath: 'diagnostic.rows[].a',
                  source: ['data.a'],
                },
              ],
              source: ['data'],
            },
          ],
        },
      ],
    };

    const result = lintNoteTemplate(template);
    expect(result.errors.some(issue => issue.code === 'table.column.empty')).toBe(true);
  });

  it('warns on duplicate aiDeps entries', () => {
    const template = buildTemplate([
      {
        slot: 'ai',
        id: 'summary',
        outputPath: 'summary.text',
        source: ['facts.overview'],
        aiDeps: ['facts.overview', 'facts.overview'],
      },
    ]);

    const result = lintNoteTemplate(template);
    expect(result.warnings.some(issue => issue.code === 'ai.deps.duplicate')).toBe(true);
  });

  it('warns on unknown style hint keys', () => {
    const template = buildTemplate([
      {
        slot: 'ai',
        id: 'tone-test',
        outputPath: 'tone.text',
        source: ['facts'],
        styleHints: { unexpectedHint: true },
      },
    ]);

    const result = lintNoteTemplate(template);
    expect(result.warnings.some(issue => issue.code === 'styleHint.unknown')).toBe(true);
  });

  it('flags duplicate form collection ids', () => {
    const template = buildTemplate([
      { slot: 'ai', id: 'summary', outputPath: 'summary.text' },
    ]);

    template.inputCollections = [createCollection('intake'), createCollection('intake')];

    const result = lintNoteTemplate(template);
    expect(result.errors.some(issue => issue.code === 'form.collection.id.duplicate')).toBe(true);
  });

  it('warns when a form step has no fields', () => {
    const template = buildTemplate([
      { slot: 'ai', id: 'summary', outputPath: 'summary.text' },
    ]);

    template.inputCollections = [
      {
        ...createCollection('public-intake'),
        steps: [
          {
            id: 'empty-step',
            title: 'Empty Step',
            description: 'Contains no fields',
            fields: [],
          },
        ],
      },
    ];

    const result = lintNoteTemplate(template);
    expect(result.warnings.some(issue => issue.code === 'form.step.empty')).toBe(true);
  });

  it('warns when repeatable field targetPath is not array', () => {
    const template = buildTemplate([
      { slot: 'ai', id: 'summary', outputPath: 'summary.text' },
    ]);

    template.inputCollections = [
      {
        ...createCollection('clinical'),
        steps: [
          {
            id: 'contacts',
            title: 'Contacts',
            fields: [
              {
                id: 'contact',
                label: 'Contact',
                control: { type: 'text' },
                repeatable: true,
                targetPath: 'nas.contacts.primary',
              },
            ],
          },
        ],
      },
    ];

    const result = lintNoteTemplate(template);
    expect(result.warnings.some(issue => issue.code === 'form.field.target.repeatable')).toBe(true);
  });

  it('errors when prefillFrom references unknown field', () => {
    const template = buildTemplate([
      { slot: 'ai', id: 'summary', outputPath: 'summary.text' },
    ]);

    template.inputCollections = [
      {
        ...createCollection('clinician'),
        steps: [
          {
            id: 'housing',
            title: 'Housing',
            fields: [
              {
                id: 'housing-status',
                label: 'Housing Status',
                control: { type: 'select', props: { options: ['Stable', 'Unstable'] } },
                defaults: { prefillFrom: 'unknownField' },
              },
            ],
          },
        ],
      },
    ];

    const result = lintNoteTemplate(template);
    expect(result.errors.some(issue => issue.code === 'form.field.prefill.unknown')).toBe(true);
  });
});

function createCollection(id: string) {
  return {
    id,
    label: `Collection ${id}`,
    version: '1.0.0',
    audience: 'public' as const,
    mode: 'async' as const,
    delivery: ['web'] as const,
    storage: { table: `${id}_submissions` },
    steps: [
      {
        id: 'main',
        title: 'Main Step',
        fields: [
          {
            id: 'field-1',
            label: 'Field 1',
            control: { type: 'text' as const },
          },
        ],
      },
    ],
  };
}
