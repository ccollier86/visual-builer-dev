# Pipeline Domain

**Domain:** pipeline
**Responsibility:** End-to-end orchestration of template → HTML clinical note generation
**Phase:** Integration (Phase 8 of MVP Core Pipeline)

## Overview

The Pipeline domain wires together all domain specialists (derivation, validation, composition, integration, tokens, factory) into a single coherent workflow. It is the main entry point for generating clinical notes from templates.

## Architecture

**SOR:** Pipeline is the single source of truth for orchestration logic
**SOD:** Only handles workflow coordination, delegates all specialist work
**DI:** All domain functions are imported and called with appropriate data

## Files

```
pipeline/
├── core/
│   ├── pipeline.ts     - Main orchestrator (runPipeline)
│   └── merger.ts       - AI + NAS payload merging logic
├── examples/
│   ├── example-template.json   - Sample SOAP note template
│   └── example-nas-data.json   - Sample non-AI data
├── types.ts           - Pipeline types and interfaces
└── index.ts           - Barrel export
```

## Usage

```typescript
import { runPipeline } from './pipeline';
import template from './examples/example-template.json';
import sourceData from './examples/source-data.json';

// Set OpenAI API key in environment
process.env.OPENAI_API_KEY = 'sk-...';

// Run complete pipeline
const result = await runPipeline({
  template,
  sourceData,  // Raw source data - resolves automatically
  options: {
    verbose: true,
    provenance: true,
  }
});

console.log(result.html);  // Final clinical note HTML
console.log(result.css);   // Compiled CSS (screen + print)
console.log(result.usage); // Token usage metrics
```

## Pipeline Steps

The `runPipeline()` function orchestrates 8 sequential steps:

1. **Validate Template** - Ensures template conforms to schema
2. **Derive AIS** - Generate AI Structured Output schema
3. **Derive NAS** - Generate Non-AI Structured Output schema
4. **Merge to RPS** - Combine AIS + NAS into Render Payload Schema
5. **Resolve NAS Data** - Transform raw sourceData into NAS snapshot using resolvers
6. **Compose Prompt** - Build prompt bundle with messages and context
7. **Generate AI Output** - Call OpenAI with schema constraints
8. **Merge & Render** - Deep merge AI output + NAS data, compile CSS, render HTML

## Key Functions

### `runPipeline(input: PipelineInput): Promise<PipelineOutput>`

Main orchestration function. Takes template and raw source data, returns complete HTML output.

**Input:**
- `template` - Note template (validated)
- `sourceData` - Raw source data (patient, assessments, etc.) - will be resolved automatically
- `tokens` - Optional design tokens (defaults to system tokens)
- `options` - Optional configuration

**Output:**
- `html` - Rendered clinical note HTML
- `css` - Compiled CSS (screen + print + hash)
- `aiOutput` - AI-generated structured output (for audit)
- `schemas` - Derived schemas (AIS, NAS, RPS)
- `usage` - Token usage metrics
- `model` - Model used for generation

### `mergePayloads(aiOutput: any, nasData: any): any`

Deep merges AI output and NAS data into final render payload.

**Algorithm:**
1. Start with NAS data as base
2. Deep merge AI output on top
3. Handle nested objects and arrays
4. AI values take precedence on conflicts

**Pure function:** No mutations, no side effects.

### `findMergeConflicts(aiOutput: any, nasData: any): string[]`

Validates that two payloads can be merged without type conflicts.

Returns array of conflict paths (empty if no conflicts).

## Examples

See `examples/` directory for:
- `example-template.json` - Simple SOAP note template

For source data examples, see `src/tests/fixtures/source-data.json`.

## Error Handling

Pipeline throws `PipelineError` with:
- `message` - Human-readable error description
- `step` - Which step failed (e.g., "template-validation", "ai-generation")
- `cause` - Original error object (if applicable)

## Testing

```bash
# Run TypeScript compilation check
npx tsc --noEmit

# Run pipeline with example data (requires OPENAI_API_KEY)
bun run src/pipeline/examples/run-example.ts
```

## Dependencies

**Imports from:**
- `derivation` - Schema derivation (AIS, NAS, RPS)
- `validation` - Template and schema validation
- `composition` - Prompt bundle composition
- `integration` - OpenAI API integration
- `tokens` - Design token compilation
- `factory` - HTML rendering

**Exports to:**
- External consumers (API endpoints, CLI tools)

## Completion Criteria

- [x] Pipeline orchestrates all 9 steps
- [x] TypeScript compiles without errors
- [x] Example template and NAS data provided
- [x] Error handling at each step
- [x] Barrel export created
- [x] Only pipeline/ domain files created
- [x] All imports resolve correctly
