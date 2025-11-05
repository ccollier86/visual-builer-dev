import { createNASBuilder } from '../src/resolution';
import biopsychTemplate from '../src/tests/biopsych-intake-template.schema.json';
import demoData from '../src/tests/sample-data/biopsych-intake/m-rodriguez-biopsych-sample.json';

async function main() {
  const builder = createNASBuilder();

  const result = await builder.build({
    template: biopsychTemplate as any,
    sourceData: demoData,
    nasSchema: {
      $id: 'debug-nas',
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      properties: {},
      additionalProperties: true,
    },
  });

  console.log('Resolved fields:', result.resolved.length);
  console.log('Warnings:', result.warnings.length);
  if (result.warnings.length > 0) {
    for (const warning of result.warnings) {
      console.log(
        ` - [${warning.slotType}] ${warning.componentId}/${warning.slotId} -> ${warning.path}: ${warning.message}`
      );
    }
  }

  console.log('\nNAS Snapshot:');
  console.log(JSON.stringify(result.nasData, null, 2));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
