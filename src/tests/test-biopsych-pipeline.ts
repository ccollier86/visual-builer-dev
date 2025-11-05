import * as fs from 'fs';
import * as path from 'path';
import { runPipeline } from '../pipeline/core/pipeline';
import biopsychTemplate from './biopsych-intake-template.schema.json';
import demoData from './sample-data/biopsych-intake/m-rodriguez-biopsych-sample.json';

/**
 * Test script for biopsychosocial intake assessment pipeline
 *
 * Uses OpenAI GPT-5 for AI-generated clinical note content
 *
 * This script:
 * 1. Loads the biopsych intake template
 * 2. Loads realistic demo patient data (intake forms, assessments, provider info)
 * 3. Runs the full pipeline (derive schemas, resolve source data, call GPT-5, validate, render)
 * 4. Generates and saves complete HTML clinical note
 *
 * Usage:
 *   bun run src/tests/test-biopsych-pipeline.ts
 *
 * Output:
 *   - HTML file saved to output/biopsych-[timestamp].html
 *   - JSON data saved to output/biopsych-[timestamp]-data.json
 */

async function main() {
	console.log('🚀 Starting biopsych intake pipeline test...\n');

	try {
		console.log('📋 Demo patient:', demoData.patient.name);
		console.log('📊 Assessments loaded:', Object.keys(demoData.assessments).join(', '));
		console.log('🏥 Facility:', demoData.facility.name);
		console.log('👨‍⚕️  Provider:', demoData.provider.fullName);
		console.log('');

		// Run the pipeline
		console.log('⚙️  Running pipeline...');
		console.log('   1. Deriving AI Input Schema (AIS) from template...');
		console.log('   2. Deriving Note Assembly Schema (NAS)...');
		console.log('   3. Deriving Render Payload Schema (RPS)...');
		console.log('   4. Resolving NAS data from source...');
		console.log('   5. Composing AI prompt with field guidance...');
		console.log('   6. Calling AI model (this may take 30-60 seconds)...');

		const result = await runPipeline({
			template: biopsychTemplate as any,
			sourceData: demoData,
			options: {
				generationOptions: {
					model: 'gpt-5',
					temperature: 0.2,
				},
			},
		});

		console.log('✅ Pipeline completed successfully!\n');

		// Log statistics
		console.log('📈 Statistics:');
		console.log('   - AI output fields:', Object.keys(result.aiOutput || {}).length);
		console.log('   - HTML length:', result.html.length, 'characters');
		console.log('   - CSS screen:', result.css.screen.length, 'chars');
		console.log('   - CSS print:', result.css.print.length, 'chars');
		if (result.usage) {
			console.log('   - Tokens used:', result.usage.totalTokens);
			console.log('   - Prompt tokens:', result.usage.promptTokens);
			console.log('   - Completion tokens:', result.usage.completionTokens);
		}
		console.log('');

		// Write output files
		const outputDir = path.join(__dirname, '../../output');
		if (!fs.existsSync(outputDir)) {
			fs.mkdirSync(outputDir, { recursive: true });
		}

		const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
		const htmlPath = path.join(outputDir, `biopsych-${timestamp}.html`);
		const jsonPath = path.join(outputDir, `biopsych-${timestamp}-data.json`);

		// Write HTML
		fs.writeFileSync(htmlPath, result.html, 'utf-8');
		console.log('💾 Saved HTML:', htmlPath);

		// Write JSON data (for inspection)
		const outputData = {
			patient: demoData.patient.name,
			timestamp,
			aiOutput: result.aiOutput,
			schemas: {
				ais: result.schemas?.ais,
				nas: result.schemas?.nas,
				rps: result.schemas?.rps,
			},
			usage: result.usage,
			model: result.model,
		};
		fs.writeFileSync(jsonPath, JSON.stringify(outputData, null, 2), 'utf-8');
		console.log('💾 Saved JSON:', jsonPath);

		console.log('\n✨ Test completed successfully!');
		console.log('\n📝 Open the HTML file in a browser to view the generated note.');
	} catch (error) {
		console.error('\n❌ Pipeline failed:', error);
		if (error instanceof Error) {
			console.error('   Message:', error.message);
			console.error('   Stack:', error.stack);
		}
		process.exit(1);
	}
}

main();
