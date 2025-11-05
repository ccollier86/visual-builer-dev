import { validateNoteTemplate } from '../validation/validators/template-validator';
import biopsychTemplate from './biopsych-intake-template.schema.json';

console.log('🔍 Diagnosing template validation errors...\n');

const result = validateNoteTemplate(biopsychTemplate as any);

if (!result.ok) {
  console.log('❌ Template validation FAILED\n');
  console.log(`Found ${result.errors.length} validation errors:\n`);

  result.errors.forEach((error, index) => {
    console.log(`Error ${index + 1}:`);
    console.log(`  Path: ${error.instancePath || '(root)'}`);
    console.log(`  Field: ${error.params?.missingProperty || error.params?.additionalProperty || 'N/A'}`);
    console.log(`  Message: ${error.message}`);
    console.log(`  Schema Path: ${error.schemaPath}`);
    console.log('');
  });
} else {
  console.log('✅ Template validation PASSED');
}
