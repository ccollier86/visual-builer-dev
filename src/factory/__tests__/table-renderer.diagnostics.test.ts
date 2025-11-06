/**
 * Factory Diagnostics Tests
 *
 * Domain: factory/__tests__/table-renderer.diagnostics.test
 * Responsibility: Assert renderers emit diagnostics for mismatched template configuration.
 */

import { describe, expect, it, spyOn } from 'bun:test';
import type { NoteTemplate } from '../../derivation/types';
import type { RenderPayload } from '../../types/payloads';
import type { DesignTokens } from '../../tokens/types';
import defaultTokensRaw from '../../tokens/defaults/default-tokens.json';
import { renderNoteHTML } from '../core/renderer';

const tokens = defaultTokensRaw as DesignTokens;

describe('factory diagnostics', () => {
  it('warns when table column counts do not match mapped items', () => {
    const warn = spyOn(console, 'warn');

    const template: NoteTemplate = {
      id: 'table-diagnostic',
      name: 'Table Diagnostic Template',
      version: '1.0.0',
      prompt: { system: '', main: '', rules: [] },
      layout: [
        {
          id: 'diagnostic-section',
          type: 'section',
          title: 'DIAGNOSTICS',
          children: [
            {
              id: 'problem-table',
              type: 'table',
              title: 'Problem Table',
              props: {
                columns: ['First', 'Second'],
              },
              content: [
                {
                  id: 'table-source',
                  slot: 'ai',
                  outputPath: 'diagnostics[].first',
                  tableMap: [
                    { id: 'only-column', slot: 'ai', outputPath: 'diagnostics[].first' },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    const payload: RenderPayload = {
      diagnostics: [
        { first: 'Only column data' },
      ],
    };

    renderNoteHTML({ template, payload, tokens, options: {} });

    expect(warn.mock.calls.some(call => call[0]?.includes('table.column.empty'))).toBe(true);
    warn.mockRestore();
  });

  it('warns when list rows resolve to zero items', () => {
    const warn = spyOn(console, 'warn');

    const template: NoteTemplate = {
      id: 'list-diagnostic',
      name: 'List Diagnostic Template',
      version: '1.0.0',
      prompt: { system: '', main: '', rules: [] },
      layout: [
        {
          id: 'list-section',
          type: 'section',
          title: 'LIST',
          children: [
            {
              id: 'empty-list',
              type: 'list',
              content: [
                {
                  id: 'list-items',
                  slot: 'ai',
                  listItems: [
                    { id: 'item-text', slot: 'ai', outputPath: 'listItems[].text' },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    const payload: RenderPayload = {
      listItems: [],
    };

    renderNoteHTML({ template, payload, tokens, options: {} });

    expect(warn.mock.calls.some(call => call[0]?.includes('list.rows.empty'))).toBe(true);
    warn.mockRestore();
  });
});
