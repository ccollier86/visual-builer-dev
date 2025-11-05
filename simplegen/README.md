# SimplGen - Simplified Note Generation MVP

A streamlined approach to AI-powered clinical note generation using OpenAI's structured outputs.

## Architecture

SimplGen uses a simple, straightforward architecture:

```
Input Data → Prefill (props/computed) → AI Generate (narratives) → Merge → Render → HTML
```

### Key Concepts

1. **Final Output Schema** - Single TypeScript interface (`BiopsychNote`) defines complete structure
2. **Source Map** - Maps each field to its source: `prop`, `computed`, or `ai`
3. **Prefill Pattern** - Fill all prop/computed fields BEFORE calling AI
4. **AI Subset Schema** - Build schema containing ONLY AI fields for OpenAI
5. **Deep Merge** - Combine prefilled data + AI results into complete note

## Quick Start

### 1. Install Dependencies

```bash
cd simplegen
bun install
```

### 2. Set OpenAI API Key

```bash
export OPENAI_API_KEY="your-api-key-here"
```

Or create a `.env` file:
```
OPENAI_API_KEY=your-api-key-here
```

### 3. Run Demo

```bash
bun run run.ts
```

This will:
- Load `sample-data.json`
- Generate note using OpenAI (gpt-4o-2024-08-06)
- Render HTML matching reference format
- Save to `output/biopsych-note.html`
- Save JSON to `output/biopsych-note.json`

### 4. View Output

Open `output/biopsych-note.html` in your browser to see the formatted note.

## File Structure

```
simplegen/
├── package.json           # Dependencies (openai)
├── sample-data.json       # Test patient data
├── template.ts            # Output schema + source map
├── engine.ts              # Core functions (prefill, buildAiSchema, merge)
├── generator.ts           # Main orchestration logic
├── renderer.ts            # HTML generation
├── run.ts                 # Demo script
├── output/                # Generated files (created on first run)
│   ├── biopsych-note.html
│   └── biopsych-note.json
└── README.md              # This file
```

## How It Works

### Step 1: Prefill (engine.ts)

```typescript
const prefilled = prefillObject(sourceMap, data);
```

Fills all `prop` (direct lookup) and `computed` (calculated) fields:
- Props: `patient.name`, `encounter.date`, MSE fields, scores
- Computed: `patient.age`, formatted addresses, provider names with credentials

### Step 2: Generate Static Sections (generator.ts)

```typescript
const planSections = generatePlanSections(data);
```

Fills standardized Plan sections with pronoun substitution:
- Interventions Recommended (6 standard items)
- Coordination of Care (intro + 3 items)
- Follow-Up Plan (9 standard items)
- Crisis Safety Plan (7 standard items)

### Step 3: Build AI Schema (engine.ts)

```typescript
const aiSchema = buildAiOnlySchema(sourceMap);
```

Creates JSON Schema containing ONLY fields marked as `source: "ai"`:
- Chief Complaint
- All Subjective narratives (HPI, psychiatric history, medications, etc.)
- Functional Assessment
- Assessment narratives (formulation, risk, prognosis)
- Reasons for Living

### Step 4: Call OpenAI (generator.ts)

```typescript
const response = await openai.chat.completions.create({
  model: "gpt-4o-2024-08-06",
  messages: [systemPrompt, userPrompt],
  response_format: {
    type: "json_schema",
    json_schema: { name: "biopsych_note", strict: true, schema: aiSchema }
  }
});
```

OpenAI generates ONLY the narrative sections, guaranteed to match schema.

### Step 5: Diagnosis Mapping (generator.ts)

If clinician provided DSM-5 diagnoses, make a separate OpenAI call to:
- Map DSM-5 codes to ICD-10
- Generate supporting diagnostic criteria
- Return structured diagnosis array

### Step 6: Merge (engine.ts)

```typescript
const complete = deepMerge(prefilled, aiResult);
```

Combines:
- Prefilled props/computed
- AI-generated narratives
- Static plan sections
- Mapped diagnoses

### Step 7: Render (renderer.ts)

```typescript
const html = renderToHTML(complete);
```

Generates HTML with embedded CSS matching reference format:
- 3-column header grid
- Yellow alert-style chief complaint
- Section titles with borders
- 2-column MSE grid
- Diagnosis table
- Numbered lists for Plan

## Source Map Example

```typescript
// Direct lookup - no processing
"header.patient.name": {
  source: "prop",
  dataPath: "patient.name"
},

// Calculated value
"header.patient.age": {
  source: "computed",
  dataPath: "patient.age"  // Triggers calculateAge()
},

// AI generated narrative
"subjective.historyOfPresentIllness": {
  source: "ai",
  prompt: "Write a comprehensive History of Present Illness...",
  context: [
    "patientIntake.narrative",
    "clinicalIntake.qaText",
    "clinicalIntake.structured.currentSymptoms"
  ]
}
```

## Why This Approach?

### Advantages

1. **Simple** - ~1,000 lines vs 1,040+ line monolithic template
2. **Clear Separation** - Obvious what's data vs AI vs static
3. **Flexible** - Easy to add new fields or change sources
4. **Debuggable** - Can inspect prefilled, AI result, and final separately
5. **Efficient** - AI only generates what it needs to, not redundant lookups
6. **Type Safe** - Single source of truth for output structure

### Comparison to Complex System

| Aspect | SimplGen | Complex System |
|--------|----------|----------------|
| Lines of Code | ~1,000 | ~5,000+ |
| Domains | 1 (simple flow) | 8 (derivation, resolution, composition, etc.) |
| Template Size | ~250 lines | 1,071 lines |
| AI Calls | 1-2 | Multiple through pipeline |
| Debugging | Straightforward | Complex graph traversal |
| Maintenance | Easy | Difficult |

## Future Enhancements

- [ ] Visual template builder (drag-drop sections)
- [ ] Org-level template customization
- [ ] Multiple output formats (PDF, DOCX, HL7 FHIR)
- [ ] Template versioning
- [ ] Real-time preview
- [ ] Custom branding/styling per org

## License

Proprietary - Catalyst Engineering Team
