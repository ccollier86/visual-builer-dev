import * as fs from 'fs';
import * as path from 'path';
import { runPipeline } from '../pipeline/core/pipeline';
import tcmTemplate from './tcm-strengths-needs.template.json';
import demoData from './sample-data/tcm-strengths-needs/demo-source.json';

async function main() {
	console.log('🚀 Starting TCM strengths & needs pipeline test...');
	console.log(`👤 Client: ${demoData.client?.name ?? 'Unknown'}`);
	console.log(`📅 Assessment date: ${demoData.assessment?.date ?? 'n/a'}`);
	console.log('');

	try {
		const model = process.env.OPENAI_MODEL ?? 'gpt-4o-2024-08-06';

		const result = await runPipeline({
			template: tcmTemplate as any,
			sourceData: demoData,
			options: {
				generationOptions: {
					model,
					maxTokens: 4500,
					temperature: process.env.OPENAI_TEMPERATURE
						? Number(process.env.OPENAI_TEMPERATURE)
						: 0.6,
				},
			},
		});

		console.log('✅ Pipeline completed successfully!');
		console.log('   - HTML length:', result.html.length);
		console.log('   - CSS (screen) length:', result.css.screen.length);
		console.log('   - CSS (print) length:', result.css.print.length);
		if (result.usage) {
			console.log('   - Tokens (total):', result.usage.totalTokens);
		}

		const outputDir = path.join(__dirname, '../../output');
		if (!fs.existsSync(outputDir)) {
			fs.mkdirSync(outputDir, { recursive: true });
		}

		const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
		const baseName = `tcm-strengths-needs-${timestamp}`;
		const htmlPath = path.join(outputDir, `${baseName}.html`);
		const screenCssPath = path.join(outputDir, `${baseName}.screen.css`);
		const printCssPath = path.join(outputDir, `${baseName}.print.css`);
		const jsonPath = path.join(outputDir, `${baseName}-data.json`);

		fs.writeFileSync(screenCssPath, result.css.screen, 'utf-8');
		fs.writeFileSync(printCssPath, result.css.print, 'utf-8');

		const linkedHtml = injectStylesheets(
			result.html,
			path.basename(screenCssPath),
			path.basename(printCssPath)
		);
		fs.writeFileSync(htmlPath, linkedHtml, 'utf-8');

		const snapshot = {
			timestamp,
			client: demoData.client?.name,
			schemas: result.schemas,
			usage: result.usage,
			aiOutput: result.aiOutput,
		};
		fs.writeFileSync(jsonPath, JSON.stringify(snapshot, null, 2), 'utf-8');

		console.log('💾 Saved HTML:', htmlPath);
		console.log('💾 Saved CSS (screen):', screenCssPath);
		console.log('💾 Saved CSS (print):', printCssPath);
		console.log('💾 Saved snapshot JSON:', jsonPath);
		console.log('\n🧾 Note uses the same header/footer assets as the biopsych pipeline (screen + print CSS linked identically).');
	} catch (error) {
		console.error('\n❌ Pipeline failed:', error);
		const cause = (error as { cause?: unknown }).cause;
		if (cause) {
			try {
				console.error('Causes:', JSON.stringify(cause, null, 2));
			} catch {
				console.error('Causes:', cause);
			}
		}
		process.exit(1);
	}
}

main();

function injectStylesheets(html: string, screenHref: string, printHref: string): string {
	if (!html.includes('</head>')) return html;
	const links = [
		`  <link rel="stylesheet" href="${screenHref}" media="screen">`,
		`  <link rel="stylesheet" href="${printHref}" media="print">`,
	].join('\n');
	return html.replace('</head>', `${links}\n</head>`);
}
