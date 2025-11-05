# Biopsych Intake Pipeline Test

## Quick Start

Run the biopsych intake note generation test:

```bash
bun run src/tests/test-biopsych-pipeline.ts
```

## What It Does

1. **Loads Template**: Biopsych intake template with all sections, fields, and guidance
2. **Loads Sample Data**: Patient data (Michael Rodriguez - depression, PTSD, alcohol use)
3. **Runs Pipeline**: 
   - Derives AI Input Schema (AIS)
   - Derives Note Assembly Schema (NAS)  
   - Derives Render Payload Schema (RPS)
   - Composes prompt with field guidance
   - **Calls GPT-5** for AI-generated content
   - Validates AI output
   - Renders final HTML note
4. **Saves Output**:
   - `output/biopsych-[timestamp].html` - Complete clinical note
   - `output/biopsych-[timestamp]-data.json` - Schemas, AI output, usage metrics

## Sample Data Available

All samples in `src/tests/sample-data/biopsych-intake/`:

- **m-rodriguez-biopsych-sample.json** (36K) - Male, 35, depression/PTSD/alcohol use, moderate detail
- **s-chen-detailed-biopsych-sample.json** (57K) - Female, 33, panic/GAD, SUPER detailed "try-hard" patient
- **t-patel-sud-biopsych-sample.json** (36K) - Female, 40, alcohol/opioid history, SUD services with AUDIT/DAST
- **a-johnson-anxiety-biopsych-sample.json** (22K) - Female, 30, GAD/social anxiety/health anxiety, moderate detail

## Change Sample Patient

Edit line 5 in `test-biopsych-pipeline.ts`:

```typescript
import demoData from './sample-data/biopsych-intake/s-chen-detailed-biopsych-sample.json';
```

## OpenAI API Key

Set your API key:

```bash
export OPENAI_API_KEY="your-key-here"
```

## Output

The generated HTML note includes:
- **Header**: Patient info, facility, provider, date
- **Chief Complaint**: Direct patient quote
- **Subjective**: 8 AI-generated paragraphs (history, medications, substance use, etc.)
- **Objective**: Mental status exam, functional assessment, standardized scores
- **Assessment**: Clinical formulation, risk assessment, prognosis, diagnostic table
- **Plan**: Interventions, coordination, follow-up, crisis plan
- **Signature**: Provider signature block

Open the HTML file in any browser to view the formatted clinical note.
