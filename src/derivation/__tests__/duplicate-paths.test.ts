import { describe, expect, it } from 'bun:test';
import { deriveAIS, deriveNAS } from '../../derivation';
import { DuplicatePathError } from '../errors';
import type { NoteTemplate } from '../types';

const baseTemplate: NoteTemplate = {
  id: 'tmpl_duplicate',
  name: 'Duplicate Path Template',
  version: '1.0.0',
  layout: [
    {
      id: 'section-1',
      type: 'section',
      title: 'Section',
      content: [],
    },
  ],
};

describe('duplicate path detection', () => {
  it('throws DuplicatePathError when AIS output paths overlap', () => {
    const template: NoteTemplate = {
      ...baseTemplate,
      layout: [
        {
          id: 'section-ai',
          type: 'group',
          content: [
            { id: 'ai-1', slot: 'ai', outputPath: 'assessment.summary' },
            { id: 'ai-2', slot: 'ai', outputPath: 'assessment.summary' },
          ],
        },
      ],
    };

    expect(() => deriveAIS(template)).toThrow(DuplicatePathError);
  });

  it('throws DuplicatePathError when NAS target paths overlap', () => {
    const template: NoteTemplate = {
      ...baseTemplate,
      layout: [
        {
          id: 'section-nas',
          type: 'group',
          content: [
            { id: 'lookup-1', slot: 'lookup', targetPath: 'patient.info' },
            { id: 'lookup-2', slot: 'computed', targetPath: 'patient.info' },
          ],
        },
      ],
    };

    expect(() => deriveNAS(template)).toThrow(DuplicatePathError);
  });

  it('detects duplicate NAS paths within listItems with explicit indices', () => {
    const template: NoteTemplate = {
      ...baseTemplate,
      layout: [
        {
          id: 'list-section',
          type: 'group',
          content: [
            {
              id: 'list-root',
              slot: 'lookup',
              targetPath: 'plan.tasks[0].description',
              listItems: [
                {
                  id: 'list-item-0',
                  slot: 'lookup',
                  targetPath: 'plan.tasks[0].description',
                },
              ],
            },
          ],
        },
      ],
    };

    expect(() => deriveNAS(template)).toThrow(DuplicatePathError);
  });

  it('detects duplicate NAS paths inside tableMap entries', () => {
    const template: NoteTemplate = {
      ...baseTemplate,
      layout: [
        {
          id: 'table-section',
          type: 'table',
          content: [
            {
              id: 'table-root',
              slot: 'lookup',
              targetPath: 'assessments.table.column',
              tableMap: {
                columnA: {
                  id: 'table-cell-a',
                  slot: 'lookup',
                  targetPath: 'assessments.table.column',
                },
              },
            },
          ],
        },
      ],
    };

    expect(() => deriveNAS(template)).toThrow(DuplicatePathError);
  });
});
