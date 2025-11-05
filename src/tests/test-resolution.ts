import { createNASBuilder } from '../resolution';
import sourceData from './fixtures/source-data.json';
import type { DerivedSchema, NoteTemplate } from '../derivation/types';

async function testResolution() {
  console.log('🧪 Testing NAS Resolution\n');

  // Simple template with all slot types
  const template: NoteTemplate = {
    id: 'test-resolution',
    name: 'Resolution Test',
    version: '1.0.0',
    style: { font: 'Inter', color: '#000', accent: '#00f', spacing: 8 },
    prompt: { system: 'Test', main: 'Test' },
    layout: [
      {
        id: 'header',
        type: 'section',
        content: [
          {
            slot: 'lookup',
            id: 'patient-name',
            lookup: 'patient.name',
            targetPath: 'header.patientName'
          },
          {
            slot: 'static',
            id: 'header-title',
            text: 'Clinical Note',
            targetPath: 'header.title'
          }
        ]
      },
      {
        id: 'assessments',
        type: 'section',
        content: [
          {
            slot: 'computed',
            id: 'phq9-delta',
            formula: 'assessments.current.PHQ9 - assessments.previous.PHQ9',
            format: 'deltaScore',
            targetPath: 'assessments.phq9Delta'
          },
          {
            slot: 'verbatim',
            id: 'patient-quote',
            verbatimRef: 'transcript:current_session#t=45-50',
            targetPath: 'subjective.clientQuote'
          }
        ]
      }
    ]
  };

  // Create builder and resolve
  const builder = createNASBuilder();

  const nasSchema: DerivedSchema = {
    $id: 'test-nas-schema',
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    title: 'NAS Schema',
    type: 'object',
    properties: {},
    additionalProperties: true,
  };

  const result = await builder.build({
    template,
    sourceData,
    nasSchema
  });

  // Verify results
  console.log('✅ Resolved Fields:', result.resolved.length);
  console.log('⚠️  Warnings:', result.warnings.length);
  console.log('\n📊 NAS Data:');
  console.log(JSON.stringify(result.nasData, null, 2));

  // Assertions
  const nasData = result.nasData as Record<string, any>;

  const checks = [
    {
      name: 'Lookup: patient name',
      pass: nasData.header?.patientName === 'Michael Rodriguez'
    },
    {
      name: 'Static: header title',
      pass: nasData.header?.title === 'Clinical Note'
    },
    {
      name: 'Computed: PHQ9 delta',
      pass: nasData.assessments?.phq9Delta === '-6'
    },
    {
      name: 'Verbatim: quote with ref',
      pass: nasData.subjective?.clientQuote?.text?.includes('feeling a lot better')
    }
  ];

  console.log('\n🔍 Validation:');
  checks.forEach(check => {
    console.log(`  ${check.pass ? '✅' : '❌'} ${check.name}`);
  });

  const allPassed = checks.every(c => c.pass);
  console.log(`\n${allPassed ? '✅ All checks passed!' : '❌ Some checks failed'}`);
}

testResolution().catch(console.error);
