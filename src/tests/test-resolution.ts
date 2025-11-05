import { createNASBuilder } from '../resolution';
import sourceData from './fixtures/source-data.json';

async function testResolution() {
  console.log('🧪 Testing NAS Resolution\n');

  // Simple template with all slot types
  const template = {
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

  const result = await builder.build({
    template,
    sourceData,
    nasSchema: {} // Simplified for test
  });

  // Verify results
  console.log('✅ Resolved Fields:', result.resolved.length);
  console.log('⚠️  Warnings:', result.warnings.length);
  console.log('\n📊 NAS Data:');
  console.log(JSON.stringify(result.nasData, null, 2));

  // Assertions
  const checks = [
    {
      name: 'Lookup: patient name',
      pass: result.nasData.header?.patientName === 'Michael Rodriguez'
    },
    {
      name: 'Static: header title',
      pass: result.nasData.header?.title === 'Clinical Note'
    },
    {
      name: 'Computed: PHQ9 delta',
      pass: result.nasData.assessments?.phq9Delta === '-6'
    },
    {
      name: 'Verbatim: quote with ref',
      pass: result.nasData.subjective?.clientQuote?.text?.includes('feeling a lot better')
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
