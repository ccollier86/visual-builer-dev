#!/usr/bin/env bun

/**
 * Simple test script to verify the MVP pipeline works end-to-end
 *
 * Usage:
 *   export OPENAI_API_KEY="your-key-here"
 *   bun run src/tests/test-pipeline.ts
 */

import { runPipeline } from '../pipeline';
import exampleTemplate from '../pipeline/examples/example-template.json';
import defaultTokens from '../tokens/defaults/default-tokens.json';

async function main() {
  console.log('🚀 Testing MVP Core Pipeline...\n');

  // Check for API key
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ Error: OPENAI_API_KEY environment variable not set');
    console.error('   Set it with: export OPENAI_API_KEY="your-key-here"');
    process.exit(1);
  }

  try {
    console.log('📝 Loading template and data...');
    console.log(`   Template: ${exampleTemplate.name} v${exampleTemplate.version}`);

    // Example source data that will be resolved
    const exampleSourceData = {
      patient: {
        name: 'John Doe',
        firstName: 'John',
        lastName: 'Doe',
        dob: '1990-01-15',
        age: 34,
        gender: 'male',
        pronouns: 'he/him',
        mrn: 'MRN-12345',
      },
      facility: {
        name: 'Example Behavioral Health Center',
        phone: '(555) 123-4567',
        address: '123 Main Street',
        city: 'Anytown',
        state: 'KY',
        zip: '40001',
      },
      provider: {
        name: 'Dr. Smith',
        credentials: 'LPCC',
        fullName: 'Dr. Smith LPCC',
      },
      encounter: {
        date: new Date().toISOString().split('T')[0],
        time: '14:00',
        type: 'Initial Consultation',
        appointmentId: 'APPT-001',
      },
    };

    console.log(`   Source Data: ${Object.keys(exampleSourceData).length} top-level keys\n`);

    console.log('⚙️  Running pipeline...');
    const startTime = Date.now();

    const result = await runPipeline({
      template: exampleTemplate,
      sourceData: exampleSourceData,
      tokens: defaultTokens,
      options: {
        validateSteps: true,
        provenance: true
      }
    });

    const duration = Date.now() - startTime;

    console.log(`✅ Pipeline completed in ${duration}ms\n`);

    // Print results
    console.log('📊 Results:');
    console.log(`   HTML length: ${result.html.length} chars`);
    console.log(`   CSS hash: ${result.css.hash}`);
    console.log(`   Screen CSS: ${result.css.screen.length} chars`);
    console.log(`   Print CSS: ${result.css.print.length} chars`);
    console.log(`   AI Output fields: ${Object.keys(result.aiOutput).length}`);
    console.log(`   Token usage: ${result.usage.totalTokens} tokens (${result.usage.promptTokens} prompt + ${result.usage.completionTokens} completion)\n`);

    // Write outputs
    console.log('💾 Writing outputs...');
    await Bun.write('output/note.html', result.html);
    await Bun.write(`output/note.${result.css.hash}.css`, result.css.screen);
    await Bun.write(`output/note.print.${result.css.hash}.css`, result.css.print);
    await Bun.write('output/ai-output.json', JSON.stringify(result.aiOutput, null, 2));
    await Bun.write('output/schemas.json', JSON.stringify(result.schemas, null, 2));

    console.log('   ✓ output/note.html');
    console.log(`   ✓ output/note.${result.css.hash}.css`);
    console.log(`   ✓ output/note.print.${result.css.hash}.css`);
    console.log('   ✓ output/ai-output.json');
    console.log('   ✓ output/schemas.json\n');

    console.log('🎉 Test complete! Open output/note.html in a browser to view the rendered note.');

  } catch (error) {
    console.error('\n❌ Pipeline failed:');
    console.error(error);
    process.exit(1);
  }
}

main();
