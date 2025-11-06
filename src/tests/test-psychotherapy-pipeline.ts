import * as fs from 'fs';
import * as path from 'path';
import { runPipeline } from '../pipeline/core/pipeline';
import psychotherapyTemplate from './psychotherapy-template.schema.json';
import demoData from './sample-data/pyschotherapy/sample-psychotherapy-session.json';

/**
 * Test script for psychotherapy follow-up note pipeline
 *
 * This script mirrors the biopsych pipeline test but targets the
 * psychotherapy template and sample data. It runs the full pipeline
 * and writes linked HTML + CSS artifacts to the output/ folder.
 *
 * Usage:
 *   bun run src/tests/test-psychotherapy-pipeline.ts
 */

async function main() {
  console.log('🚀 Starting psychotherapy pipeline test...\n');

  try {
    console.log('📋 Patient:', demoData.patient?.name);
    console.log('🏥 Facility:', demoData.facility?.name);
    console.log('👩‍⚕️  Provider:', demoData.provider?.fullName);
    console.log('📅 Encounter date:', demoData.encounter?.date);
    console.log('⏱️  Start:', demoData.encounter?.start, '| End:', demoData.encounter?.end);
    console.log('⏳ Duration (min):', demoData.encounter?.durationMinutes, '| CPT:', demoData.encounter?.cptCode);
    console.log('');

    console.log('⚙️  Running pipeline...');
    console.log('   1. Deriving schemas (AIS/NAS/RPS)');
    console.log('   2. Resolving NAS');
    console.log('   3. Composing AI prompts');
    console.log('   4. Calling AI model...');

    const model = 'gpt-4o-2024-08-06';

    const result = await runPipeline({
      template: psychotherapyTemplate as any,
      sourceData: demoData,
      options: {
        generationOptions: {
          model,
          maxTokens: 4000,
          temperature: process.env.OPENAI_TEMPERATURE
            ? Number(process.env.OPENAI_TEMPERATURE)
            : 0.6,
        },
      },
    });
    console.log(`   ✓ Model used: ${model}`);

    console.log('✅ Pipeline completed successfully!\n');

    // Stats
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
    const baseFileName = `psychotherapy-${timestamp}`;
    const htmlPath = path.join(outputDir, `${baseFileName}.html`);
    const jsonPath = path.join(outputDir, `${baseFileName}-data.json`);
    const screenCssPath = path.join(outputDir, `${baseFileName}.screen.css`);
    const printCssPath = path.join(outputDir, `${baseFileName}.print.css`);

    // Save CSS
    fs.writeFileSync(screenCssPath, result.css.screen, 'utf-8');
    fs.writeFileSync(printCssPath, result.css.print, 'utf-8');
    console.log('💾 Saved CSS (screen):', screenCssPath);
    console.log('💾 Saved CSS (print):', printCssPath);

    // Inject linked CSS into HTML
    const linkedHtml = injectStylesheets(
      result.html,
      path.basename(screenCssPath),
      path.basename(printCssPath)
    );

    fs.writeFileSync(htmlPath, linkedHtml, 'utf-8');
    console.log('💾 Saved HTML:', htmlPath);

    // Save summary JSON
    const outputData = {
      patient: demoData.patient?.name,
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

    console.log('\n✨ Psychotherapy test completed!');
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

