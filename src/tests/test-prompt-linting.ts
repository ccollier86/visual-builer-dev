import { lintPromptBundle } from '../composition';

console.log('Testing Prompt Bundle Linting\n');

// Test 1: Valid bundle
const validBundle = {
  messages: [
    { role: 'system', content: 'Test' },
    { role: 'user', content: 'Test' }
  ],
  fieldGuide: [
    { path: 'subjective.summary' }
  ],
  jsonSchema: {
    properties: {
      subjective: {
        type: 'object',
        properties: {
          summary: { type: 'string' }
        }
      }
    }
  },
  context: {
    nasSlices: {}
  }
};

const validTemplate = {
  layout: [
    {
      id: 'test',
      type: 'section',
      content: [
        { slot: 'ai', id: 'test1', outputPath: 'subjective.summary' }
      ]
    }
  ]
};

const result1 = lintPromptBundle(validBundle, validBundle.jsonSchema, validTemplate);
console.log('Valid bundle:', result1.ok ? 'PASS' : 'FAIL');
console.log('  Errors:', result1.errors.length);
console.log('  Warnings:', result1.warnings.length);

// Test 2: Invalid bundle (missing AI item)
const invalidTemplate = {
  layout: [
    {
      id: 'test',
      type: 'section',
      content: [
        { slot: 'ai', id: 'test1', outputPath: 'subjective.summary' },
        { slot: 'ai', id: 'test2', outputPath: 'assessment.narrative' }
      ]
    }
  ]
};

const result2 = lintPromptBundle(validBundle, validBundle.jsonSchema, invalidTemplate);
console.log('\nInvalid bundle (coverage):', result2.ok ? 'FAIL' : 'PASS');
console.log('  Errors:', result2.errors.length);
if (result2.errors.length > 0) {
  console.log('  Error:', result2.errors[0].message);
}

console.log('\nLinting tests complete!');
