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
});
