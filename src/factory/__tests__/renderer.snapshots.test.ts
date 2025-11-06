/**
 * Factory Snapshot Tests
 *
 * Domain: factory/__tests__/renderer.snapshots.test
 * Responsibility: Ensure rendered HTML matches expected structure for critical components.
 */

import { describe, expect, it } from 'bun:test';
import type { NoteTemplate } from '../../derivation/types';
import type { RenderPayload } from '../../types/payloads';
import type { DesignTokens } from '../../tokens/types';
import defaultTokensRaw from '../../tokens/defaults/default-tokens.json';
import { renderNoteHTML } from '../core/renderer';

const tokens = defaultTokensRaw as DesignTokens;

describe('factory renderer snapshots', () => {
  it('matches snapshot for header, alert, table, and signature layout', () => {
    const template: NoteTemplate = {
      id: 'snapshot-template',
      name: 'Snapshot Template',
      version: '1.0.0',
      prompt: { system: '', main: '', rules: [] },
      layout: [
        {
          id: 'header',
          type: 'header',
          children: [
            {
              id: 'patient-info',
              type: 'patientBlock',
              title: 'PATIENT',
              content: [
                { id: 'patient-name', slot: 'lookup', targetPath: 'header.patient.name' },
                { id: 'patient-dob', slot: 'lookup', targetPath: 'header.patient.dob' },
                { id: 'patient-age', slot: 'lookup', targetPath: 'header.patient.age' },
              ],
            },
          ],
        },
        {
          id: 'alerts',
          type: 'alertPanel',
          title: 'Chief Complaint',
          props: { variant: 'info' },
          content: [
            { id: 'complaint', slot: 'static', text: 'Patient reports persistent insomnia.' },
          ],
        },
        {
          id: 'assessment',
          type: 'section',
          title: 'ASSESSMENT',
          children: [
            {
              id: 'diagnostic-table',
              type: 'table',
              title: 'DIAGNOSTIC IMPRESSIONS',
              props: {
                columns: ['ICD-10', 'DSM-5', 'Description'],
              },
              content: [
                {
                  id: 'diagnostic-rows',
                  slot: 'ai',
                  tableMap: [
                    { id: 'icd', slot: 'ai', outputPath: 'assessment.diagnostics[].icd' },
                    { id: 'dsm', slot: 'ai', outputPath: 'assessment.diagnostics[].dsm' },
                    { id: 'description', slot: 'ai', outputPath: 'assessment.diagnostics[].description' },
                  ],
                },
              ],
            },
          ],
        },
        {
          id: 'signature',
          type: 'signatureBlock',
          content: [
            { id: 'rendered-by', slot: 'lookup', targetPath: 'signature.renderedBy' },
            { id: 'attestation', slot: 'lookup', targetPath: 'signature.attestation' },
          ],
        },
      ],
    };

    const payload: RenderPayload = {
      header: {
        patient: {
          name: 'Casey Collier',
          dob: '12/25/1986',
          age: '38 yrs',
        },
      },
      assessment: {
        diagnostics: [
          {
            icd: 'F33.1',
            dsm: 'F33.1',
            description: 'Major Depressive Disorder, recurrent, moderate.',
          },
          {
            icd: 'F41.1',
            dsm: 'F41.1',
            description: 'Generalized Anxiety Disorder.',
          },
        ],
      },
      signature: {
        renderedBy: 'Anna Wakeland LPCC',
        attestation: 'I reviewed and confirm the accuracy of this record.',
      },
    };

    const html = renderNoteHTML({ template, payload, tokens, options: {} });
    expect(html).toMatchSnapshot();
  });
});
