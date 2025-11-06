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

		const model = 'gpt-4o-2024-08-06';

		const result = await runPipeline({
			template: biopsychTemplate as any,
			sourceData: demoData,
			options: {
				generationOptions: {
					model,
					maxTokens: 5000,
					temperature: process.env.OPENAI_TEMPERATURE
						? Number(process.env.OPENAI_TEMPERATURE)
						: 0.7,
				},
			},
		});
		console.log(`   ✓ Model used: ${model}`);

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
		const baseFileName = `biopsych-${timestamp}`;
		const htmlPath = path.join(outputDir, `${baseFileName}.html`);
		const jsonPath = path.join(outputDir, `${baseFileName}-data.json`);
		const screenCssPath = path.join(outputDir, `${baseFileName}.screen.css`);
		const printCssPath = path.join(outputDir, `${baseFileName}.print.css`);

		// Write CSS assets
		fs.writeFileSync(screenCssPath, result.css.screen, 'utf-8');
		fs.writeFileSync(printCssPath, result.css.print, 'utf-8');
		console.log('💾 Saved CSS (screen):', screenCssPath);
		console.log('💾 Saved CSS (print):', printCssPath);

		const linkedHtml = injectStylesheets(
			result.html,
			path.basename(screenCssPath),
			path.basename(printCssPath)
		);

		// Write HTML
		fs.writeFileSync(htmlPath, linkedHtml, 'utf-8');
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
			const cause = (error as { cause?: unknown }).cause;
			if (cause !== undefined) {
				try {
					console.error('   Cause:', JSON.stringify(cause, null, 2));
				} catch {
					console.error('   Cause:', cause);
				}
			}
		}
		process.exit(1);
	}
}

main();

function injectStylesheets(html: string, screenHref: string, printHref: string): string {
	if (!html.includes('</head>')) {
		return html;
	}

	const linkTags = [
		`  <link rel="stylesheet" href="${screenHref}" media="screen">`,
		`  <link rel="stylesheet" href="${printHref}" media="print">`,
	].join('\n');

	return html.replace('</head>', `${linkTags}\n</head>`);
}
