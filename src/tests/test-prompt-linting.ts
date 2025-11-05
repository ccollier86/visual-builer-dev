import { lintPromptBundle } from '../composition';
import type { PromptBundle } from '../composition/types';
import type { DerivedSchema, NoteTemplate } from '../derivation/types';

console.log('Testing Prompt Bundle Linting\n');

// Test 1: Valid bundle
const validBundle: PromptBundle = {
  id: 'bundle-1',
  templateId: 'tmpl-1',
  templateVersion: '1.0.0',
  messages: [
    { role: 'system', content: 'Test' },
    { role: 'user', content: 'Test' }
  ],
  fieldGuide: [
    { path: 'subjective.summary' }
  ],
  jsonSchema: {
    $id: 'test-ais-schema',
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    title: 'AIS Schema',
    type: 'object',
    properties: {
      subjective: {
        type: 'object',
        properties: {
          summary: { type: 'string' }
        }
      }
    },
    additionalProperties: false
  } satisfies DerivedSchema,
  context: {
    nasSlices: {}
  }
};

const validTemplate: NoteTemplate = {
  id: 'tmpl-1',
  name: 'Template',
  version: '1.0.0',
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

const aiSchema: DerivedSchema = validBundle.jsonSchema;

const result1 = lintPromptBundle(validBundle, aiSchema, validTemplate);
console.log('Valid bundle:', result1.ok ? 'PASS' : 'FAIL');
console.log('  Errors:', result1.errors.length);
console.log('  Warnings:', result1.warnings.length);

// Test 2: Invalid bundle (missing AI item)
const invalidTemplate: NoteTemplate = {
  id: 'tmpl-1',
  name: 'Template',
  version: '1.0.0',
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

const result2 = lintPromptBundle(validBundle, aiSchema, invalidTemplate);
console.log('\nInvalid bundle (coverage):', result2.ok ? 'FAIL' : 'PASS');
console.log('  Errors:', result2.errors.length);
if (result2.errors.length > 0) {
  console.log('  Error:', result2.errors[0].message);
}

console.log('\nLinting tests complete!');
