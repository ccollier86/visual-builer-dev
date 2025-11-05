import { describe, expect, it } from 'bun:test';
import type { NoteTemplate } from '../../derivation/types';
import type { DesignTokens } from '../../tokens/types';
import defaultTokensRaw from '../../tokens/defaults/default-tokens.json';
import type { RenderPayload } from '../../types/payloads';
import { renderNoteHTML } from '../core/renderer';

const tokens = defaultTokensRaw as DesignTokens;

describe('renderNoteHTML layout', () => {
  it('renders header cards, alert panels, and signature data', () => {
    const template: NoteTemplate = {
      id: 'layout-test',
      name: 'Layout Verification Template',
      version: '1.0.0',
      prompt: {
        system: 'N/A',
        main: 'N/A',
        rules: [],
      },
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
                { id: 'patient-gender', slot: 'lookup', targetPath: 'header.patient.gender' },
              ],
            },
            {
              id: 'facility-info',
              type: 'patientBlock',
              title: 'FACILITY',
              content: [
                { id: 'facility-name', slot: 'lookup', targetPath: 'header.facility.name' },
                { id: 'facility-phone', slot: 'lookup', targetPath: 'header.facility.phone' },
                { id: 'facility-address', slot: 'lookup', targetPath: 'header.facility.address' },
                { id: 'facility-location', slot: 'lookup', targetPath: 'header.facility.location' },
              ],
            },
            {
              id: 'encounter-info',
              type: 'patientBlock',
              title: 'ENCOUNTER',
              content: [
                { id: 'encounter-type', slot: 'lookup', targetPath: 'header.encounter.type' },
                { id: 'provider-name', slot: 'lookup', targetPath: 'header.encounter.provider' },
                { id: 'encounter-date', slot: 'lookup', targetPath: 'header.encounter.date' },
                { id: 'signature-line', slot: 'lookup', targetPath: 'header.encounter.signature' },
              ],
            },
          ],
        },
        {
          id: 'chief-complaint',
          type: 'alertPanel',
          title: 'Chief Complaint',
          props: { variant: 'info' },
          content: [
            { id: 'complaint', slot: 'static', text: 'Patient reports insomnia and racing thoughts.' },
          ],
        },
        {
          id: 'plan',
          type: 'section',
          title: 'PLAN',
          children: [
            {
              id: 'plan-summary',
              type: 'paragraph',
              title: 'SUMMARY',
              content: [
                { id: 'plan-text', slot: 'static', text: 'Follow-up in two weeks; continue CBT interventions.' },
              ],
            },
          ],
        },
        {
          id: 'signature',
          type: 'signatureBlock',
          content: [
            { id: 'rendered-by', slot: 'lookup', targetPath: 'signature.renderedBy' },
            { id: 'supervised-by', slot: 'lookup', targetPath: 'signature.supervisedBy' },
            { id: 'attestation', slot: 'lookup', targetPath: 'signature.attestation' },
            { id: 'accuracy', slot: 'lookup', targetPath: 'signature.accuracyStatement' },
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
          gender: 'Male',
        },
        facility: {
          name: 'Owensboro Center',
          phone: '(270) 215-4454',
          address: '1102 Triplett Street, Suite 2300',
          location: 'Owensboro, KY 42303',
        },
        encounter: {
          type: 'Comprehensive Biopsychosocial Intake',
          provider: 'Anna Wakeland LPCC',
          date: '10/24/2025',
          signature: 'Electronically signed by Anna Wakeland LPCC at 10/24/2025 06:34 PM',
        },
      },
      signature: {
        renderedBy: 'Anna Wakeland LPCC',
        supervisedBy: 'Taylor Vega PhD',
        attestation: 'I declare this record is accurate and complete.',
        accuracyStatement: 'The above information is factual to the best of my knowledge.',
      },
    };

    const html = renderNoteHTML({ template, payload, tokens, options: {} });

    expect(html).toContain('<header class="note-header"');
    expect(html).toContain('<section class="note-header-card note-header-card--patient-info"');
    expect(html).toContain('<dt>NAME</dt><dd>Casey Collier</dd>');
    expect(html).toContain('<div class="note-alert note-alert--info">');
    expect(html).toContain('<h3 class="note-alert-title">Chief Complaint</h3>');
    expect(html).toContain('Follow-up in two weeks');
    expect(html).toContain('<section class="note-signature"');
    expect(html).toContain('<strong>Rendering clinician:</strong> Anna Wakeland LPCC');
    expect(html).toContain('I declare this record is accurate and complete.');
    expect(html).not.toContain('Clinician: ____________________');
  });

  it('renders stacked table cells with style hints and support content', () => {
    const template: NoteTemplate = {
      id: 'table-test',
      name: 'Table Layout Template',
      version: '1.0.0',
      layout: [
        {
          id: 'assessment',
          type: 'section',
          title: 'ASSESSMENT',
          children: [
            {
              id: 'diagnostic-impressions',
              type: 'table',
              title: 'DIAGNOSTIC IMPRESSIONS',
              props: {
                columns: ['ICD-10', 'DSM-5 Code', 'Description'],
                colWidths: ['10%', '12%', '78%'],
              },
              content: [
                {
                  slot: 'lookup',
                  id: 'diagnostic-table',
                  tableMap: [
                    {
                      slot: 'lookup',
                      id: 'diagnosis-icd10',
                      targetPath: 'assessment.diagnosticImpressions[].icd10Code',
                      styleHints: {
                        tableCell: {
                          emphasis: 'muted',
                          italic: true,
                        },
                      },
                    },
                    {
                      slot: 'lookup',
                      id: 'diagnosis-dsm5',
                      targetPath: 'assessment.diagnosticImpressions[].dsm5Code',
                      styleHints: {
                        tableCell: {
                          bold: true,
                          italic: true,
                        },
                      },
                    },
                    {
                      slot: 'lookup',
                      id: 'diagnosis-description',
                      targetPath: 'assessment.diagnosticImpressions[].description',
                      styleHints: {
                        tableCell: {
                          emphasis: 'strong',
                        },
                      },
                    },
                    {
                      slot: 'ai',
                      id: 'diagnosis-criteria',
                      outputPath: 'assessment.diagnosticImpressions[].criteria',
                      styleHints: {
                        tableCell: {
                          role: 'support',
                          columnIndex: 2,
                          muted: true,
                        },
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    const payload: RenderPayload = {
      assessment: {
        diagnosticImpressions: [
          {
            icd10Code: 'F33.1',
            dsm5Code: 'F33.1',
            description: 'Major Depressive Disorder, Moderate',
            criteria: 'Symptoms include persistent low mood and sleep disturbance.',
          },
        ],
      },
    } as RenderPayload;

    const html = renderNoteHTML({ template, payload, tokens, options: {} });

    expect(html).toContain('<col style="width:10%">');
    expect(html).toContain('<th scope="col">ICD-10</th>');
    expect(html).toContain(
      '<span class="note-table-primary note-table-italic note-table-muted">F33.1</span>'
    );
    expect(html).toContain(
      '<span class="note-table-primary note-table-italic note-table-bold">F33.1</span>'
    );
    expect(html).toContain(
      '<div class="note-table-stack"><span class="note-table-primary note-table-strong">Major Depressive Disorder, Moderate</span><span class="note-table-support note-table-muted">Symptoms include persistent low mood and sleep disturbance.</span></div>'
    );
  });

  it('applies default styling heuristics when table hints are absent', () => {
    const template: NoteTemplate = {
      id: 'table-defaults',
      name: 'Table Defaults Template',
      version: '1.0.0',
      layout: [
        {
          id: 'diagnostic-impressions',
          type: 'table',
          title: 'DIAGNOSTIC IMPRESSIONS',
          props: {
            columns: ['ICD-10', 'DSM-5 Code', 'Description'],
          },
          content: [
            {
              slot: 'lookup',
              id: 'diagnostic-table',
              tableMap: [
                { slot: 'lookup', id: 'diagnosis-icd10', targetPath: 'assessment.diagnosticImpressions[].icd10Code' },
                { slot: 'lookup', id: 'diagnosis-dsm5', targetPath: 'assessment.diagnosticImpressions[].dsm5Code' },
                { slot: 'lookup', id: 'diagnosis-description', targetPath: 'assessment.diagnosticImpressions[].description' },
                { slot: 'ai', id: 'diagnosis-criteria', outputPath: 'assessment.diagnosticImpressions[].criteria' },
              ],
            },
          ],
        },
      ],
    };

    const payload = {
      assessment: {
        diagnosticImpressions: [
          {
            icd10Code: 'F41.1',
            dsm5Code: 'F41.1',
            description: 'Generalized Anxiety Disorder',
            criteria: 'Persistent worry impacting sleep and concentration.',
          },
        ],
      },
    } as RenderPayload;

    const html = renderNoteHTML({ template, payload, tokens, options: {} });

    expect(html).toContain(
      '<span class="note-table-primary note-table-italic note-table-muted">F41.1</span>'
    );
    expect(html).toContain(
      '<span class="note-table-primary note-table-italic note-table-bold">F41.1</span>'
    );
    expect(html).toContain(
      '<div class="note-table-stack"><span class="note-table-primary note-table-strong">Generalized Anxiety Disorder</span><span class="note-table-support note-table-muted note-table-italic">Persistent worry impacting sleep and concentration.</span></div>'
    );
  });
});
