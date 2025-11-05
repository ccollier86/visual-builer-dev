/**
 * SimplGen Demo - Run Note Generation
 *
 * Executes the complete flow:
 * 1. Load sample data
 * 2. Generate note (prefill + AI + merge)
 * 3. Render to HTML
 * 4. Save output
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { generateNote } from './generator';
import { renderToHTML } from './renderer';

async function main() {
  console.log('=== SimplGen Note Generation ===\n');

  try {
    // Check for OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ Error: OPENAI_API_KEY environment variable is not set.\n');
      console.log('Please set your OpenAI API key:');
      console.log('  export OPENAI_API_KEY="your-api-key-here"\n');
      console.log('Or create a .env file with:');
      console.log('  OPENAI_API_KEY=your-api-key-here\n');
      process.exit(1);
    }

    // Step 1: Load sample data
    console.log('Loading sample data...');
    const dataPath = join(__dirname, 'sample-data.json');
    const rawData = readFileSync(dataPath, 'utf-8');
    const data = JSON.parse(rawData);
    console.log('✓ Sample data loaded\n');

    // Step 2: Generate note
    console.log('Generating note (this will call OpenAI API)...');
    const note = await generateNote(data);
    console.log('✓ Note generated successfully\n');

    // Step 3: Render to HTML
    console.log('Rendering HTML output...');
    const html = renderToHTML(note);
    console.log('✓ HTML rendered\n');

    // Step 4: Save output
    console.log('Saving output file...');
    const outputDir = join(__dirname, 'output');
    mkdirSync(outputDir, { recursive: true });

    const outputPath = join(outputDir, 'biopsych-note.html');
    writeFileSync(outputPath, html, 'utf-8');
    console.log(`✓ Output saved to: ${outputPath}\n`);

    // Also save the intermediate JSON for debugging
    const jsonPath = join(outputDir, 'biopsych-note.json');
    writeFileSync(jsonPath, JSON.stringify(note, null, 2), 'utf-8');
    console.log(`✓ JSON data saved to: ${jsonPath}\n`);

    console.log('=== Generation Complete! ===');
    console.log(`\nOpen the file in your browser:\nfile://${outputPath}`);

  } catch (error) {
    console.error('\n❌ Error during generation:');
    console.error(error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { main };
