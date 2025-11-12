import * as fs from 'fs';
import * as path from 'path';
import { runPipeline } from '../pipeline/core/pipeline';
import template from './templates/tcm-cooccurring-monthly.template.json';
import demoData from './sample-data/tcm-cooccurring-monthly/demo-source.json';

async function main() {
	console.log('🚀 TCM Co-Occurring Monthly Note test...');
	console.log(`Client: ${demoData.client?.name ?? 'n/a'}`);
	console.log(`Month: ${demoData.note?.monthYear ?? 'n/a'}`);

	try {
		const model = process.env.OPENAI_MODEL ?? 'gpt-4o-2024-08-06';
		const result = await runPipeline({
			template: template as any,
			sourceData: demoData,
			options: {
				generationOptions: {
					model,
					maxTokens: 3000,
					temperature: 0.6,
				},
			},
		});

		const outputDir = path.join(__dirname, '../../output');
		fs.mkdirSync(outputDir, { recursive: true });
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
		const base = `tcm-cooccurring-${timestamp}`;
		const htmlPath = path.join(outputDir, `${base}.html`);
		const screenCssPath = path.join(outputDir, `${base}.screen.css`);
		const printCssPath = path.join(outputDir, `${base}.print.css`);
		const jsonPath = path.join(outputDir, `${base}-data.json`);

		fs.writeFileSync(screenCssPath, result.css.screen, 'utf-8');
		fs.writeFileSync(printCssPath, result.css.print, 'utf-8');
		fs.writeFileSync(htmlPath, injectStylesheets(result.html, path.basename(screenCssPath), path.basename(printCssPath)), 'utf-8');
		fs.writeFileSync(
			jsonPath,
			JSON.stringify(
				{
					schemas: result.schemas,
					usage: result.usage,
					aiOutput: result.aiOutput,
				},
				null,
				2
			),
			'utf-8'
		);

		console.log('✓ Output written to', htmlPath);
	} catch (error) {
		console.error('❌ Pipeline failed:', error);
		if ((error as { cause?: unknown }).cause) {
			console.error('Causes:', (error as { cause?: unknown }).cause);
		}
		process.exit(1);
	}
}

function injectStylesheets(html: string, screenHref: string, printHref: string): string {
	if (!html.includes('</head>')) return html;
	const links = [
		`  <link rel="stylesheet" href="${screenHref}" media="screen">`,
		`  <link rel="stylesheet" href="${printHref}" media="print">`
	];
	return html.replace('</head>', `${links.join('\n')}\n</head>`);
}

main();
