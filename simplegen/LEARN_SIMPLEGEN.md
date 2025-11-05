# Learn SimplGen: From Zero to Hero

A progressive guide to understanding SimplGen's AI-powered note generation system.

---

## Table of Contents

1. [Chapter 1: The Big Picture](#chapter-1-the-big-picture)
2. [Chapter 2: Understanding Data](#chapter-2-understanding-data)
3. [Chapter 3: Templates & Schemas](#chapter-3-templates--schemas)
4. [Chapter 4: Source Mapping](#chapter-4-source-mapping)
5. [Chapter 5: Prefilling Data](#chapter-5-prefilling-data)
6. [Chapter 6: AI Generation](#chapter-6-ai-generation)
7. [Chapter 7: Merging Results](#chapter-7-merging-results)
8. [Chapter 8: Rendering HTML](#chapter-8-rendering-html)
9. [Chapter 9: Putting It All Together](#chapter-9-putting-it-all-together)
10. [Chapter 10: Advanced Concepts](#chapter-10-advanced-concepts)

---

## Chapter 1: The Big Picture

### What Are We Building?

Imagine you're a therapist who just finished a 90-minute intake session with a new patient. You have:
- Notes you took during the session
- Test scores (depression, anxiety scales)
- The patient's background information
- Your clinical observations

Now you need to write a **comprehensive clinical note** that could be 5-10 pages long. This takes hours.

**SimplGen automates this** by combining:
1. **Data you already have** (patient name, test scores, observations)
2. **AI writing** (narratives, summaries, clinical impressions)
3. **Standard templates** (formatted sections, required structure)

### The Problem We're Solving

**Old way (manual):**
```
Therapist → Takes notes → Spends 2 hours writing → Formatted note
```

**SimplGen way:**
```
Therapist → Takes notes → Click generate → Formatted note (2 minutes)
```

### How SimplGen Works (Simple Version)

Think of it like making a sandwich:

1. **Ingredients** (prefill) - Get bread, meat, cheese from fridge
2. **Recipe** (template) - Follow steps for assembly
3. **Special sauce** (AI) - Let AI create unique descriptions
4. **Plating** (render) - Make it look nice on a plate

In SimplGen terms:

```
Input Data → Prefill Facts → AI Writes Narratives → Merge Together → Beautiful HTML
```

Let's dive deeper into each part!

---

## Chapter 2: Understanding Data

### What Is Data?

Data is just information organized in a way computers can understand.

**Human-readable:**
```
Patient: Maria Rodriguez
Age: 28 years old
Chief Complaint: "I've been feeling really anxious lately"
```

**Computer-readable (JSON):**
```json
{
  "patient": {
    "name": "Maria Rodriguez",
    "age": 28
  },
  "chiefComplaint": "I've been feeling really anxious lately"
}
```

### Nested Data (Objects Inside Objects)

Real patient data is complex - like folders inside folders:

```json
{
  "patient": {
    "name": "Maria Rodriguez",
    "demographics": {
      "age": 28,
      "pronouns": "she/her",
      "dateOfBirth": "1996-03-15"
    },
    "contact": {
      "phone": "555-0123",
      "email": "maria@example.com"
    }
  }
}
```

To access nested data, we use **dot notation**:
- `patient.name` → "Maria Rodriguez"
- `patient.demographics.age` → 28
- `patient.contact.phone` → "555-0123"

### Arrays (Lists of Things)

Some data comes in lists:

```json
{
  "diagnoses": [
    {
      "code": "F41.1",
      "description": "Generalized Anxiety Disorder"
    },
    {
      "code": "F33.1",
      "description": "Major Depressive Disorder, Recurrent, Moderate"
    }
  ]
}
```

Think of it like a numbered list:
- `diagnoses[0]` → First diagnosis (Anxiety)
- `diagnoses[1]` → Second diagnosis (Depression)
- `diagnoses.length` → How many diagnoses (2)

### SimplGen's Sample Data

Open `sample-data.json` - it has everything about Maria Rodriguez:

```
sample-data.json
├── patient (basic info)
├── patientIntake (intake questionnaire)
├── clinicalIntake (clinical session notes)
├── assessmentScores (PHQ-9, GAD-7, etc.)
└── encounter (session details)
```

**Exercise:** Open `sample-data.json` and find:
1. Maria's pronouns
2. Her PHQ-9 score
3. The date of her session
4. Her chief complaint

---

## Chapter 3: Templates & Schemas

### What Is a Template?

A template is a **blueprint** for what the final output should look like.

**Simple template example:**
```
Hello, [PATIENT_NAME]! Your appointment is on [DATE].
```

With data:
```json
{
  "patientName": "Maria Rodriguez",
  "date": "2024-03-20"
}
```

Result:
```
Hello, Maria Rodriguez! Your appointment is on 2024-03-20.
```

### What Is a Schema?

A schema is a **strict definition** of data structure. It's like saying:

"A clinical note MUST have:
- A header (patient info, facility info, encounter info)
- A chief complaint (string)
- Subjective section (8 narrative subsections)
- Objective section (MSE, scores)
- Assessment section (formulation, diagnoses)
- Plan section (interventions, follow-up)"

### SimplGen's Schema (TypeScript Interface)

Look at `template.ts` - the `BiopsychNote` interface:

```typescript
export interface BiopsychNote {
  header: {
    patient: {
      name: string;      // Must be text
      age: number;       // Must be number
      dob: string;       // Must be text
      pronouns: string;  // Must be text
    };
    facility: { /* ... */ };
    encounter: { /* ... */ };
  };
  chiefComplaint: string;
  subjective: {
    historyOfPresentIllness: string;
    pastPsychiatricHistory: string;
    // ... 6 more sections
  };
  // ... more sections
}
```

This interface is like a **contract** - it says "every biopsych note must look like this."

### Why Do We Need Schemas?

**Without schema:**
```json
{
  "pationt": "Maria",  // Typo! Should be "patient"
  "age": "twenty-eight"  // Wrong! Should be number, not text
}
```

**With schema:** The computer checks everything and catches errors immediately.

**OpenAI's Structured Outputs:** When we ask AI to generate text, we give it our schema and it GUARANTEES the output will match perfectly. No typos, no missing fields, no wrong types.

---

## Chapter 4: Source Mapping

### The Core Concept: Where Does Data Come From?

Every field in our final note comes from one of three places:

1. **prop** - Copy directly from input data (no thinking needed)
2. **computed** - Calculate from input data (simple math/logic)
3. **ai** - Generate with AI (needs intelligence/writing)

### Source Map Example

```typescript
const sourceMap = {
  // Direct copy (prop)
  "header.patient.name": {
    source: "prop",
    dataPath: "patient.name"
  },

  // Calculate (computed)
  "header.patient.age": {
    source: "computed",
    dataPath: "patient.dateOfBirth"  // We calculate age from DOB
  },

  // AI writes (ai)
  "subjective.historyOfPresentIllness": {
    source: "ai",
    prompt: "Write a comprehensive History of Present Illness...",
    context: ["clinicalIntake.narrative", "patientIntake.symptoms"]
  }
};
```

### Why Source Mapping?

**Problem:** If we ask AI to fill out the ENTIRE note, it might:
- Get the patient's name wrong (hallucinate)
- Calculate wrong age
- Make up test scores
- Invent facts not in the data

**Solution:** Only let AI do what it's good at (writing narratives). We handle facts and math.

### The Three Source Types Explained

#### 1. PROP (Property - Direct Lookup)

Like looking up a word in a dictionary - just copy it.

```typescript
// Input data
{
  "patient": {
    "name": "Maria Rodriguez"
  }
}

// Source map
"header.patient.name": {
  source: "prop",
  dataPath: "patient.name"
}

// Result: "Maria Rodriguez" (copied exactly)
```

**When to use:** Whenever the data already exists in the exact format you need.

#### 2. COMPUTED (Calculated Value)

Like using a calculator - apply logic to get the answer.

```typescript
// Input data
{
  "patient": {
    "dateOfBirth": "1996-03-15"
  }
}

// Source map
"header.patient.age": {
  source: "computed",
  dataPath: "patient.dateOfBirth"
}

// Logic in code:
function calculateAge(dob) {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  // ... handle if birthday hasn't happened yet this year
  return age;
}

// Result: 28 (calculated from DOB)
```

**When to use:** When you need to transform, calculate, or format data.

**Examples of computed fields:**
- Age from date of birth
- Score deltas (current PHQ-9 minus baseline)
- Formatted addresses ("123 Main St, Apt 4B, Boston, MA 02101")
- Provider names with credentials ("Dr. Sarah Chen, MD, LCSW")
- Pronouns formatted ("she/her" → { subjective: "she", possessive: "her" })

#### 3. AI (Artificial Intelligence Generation)

Like asking a human expert to write a paragraph.

```typescript
// Source map
"subjective.historyOfPresentIllness": {
  source: "ai",
  prompt: `Write a comprehensive History of Present Illness in clinical narrative format.
           Include onset, duration, progression, and current status of symptoms.`,
  context: [
    "clinicalIntake.narrative",
    "patientIntake.symptoms",
    "clinicalIntake.structured.currentSymptoms"
  ]
}

// AI receives:
// - The prompt (instructions)
// - The context data (raw information)

// AI generates:
// "Maria Rodriguez is a 28-year-old woman presenting with a 6-month history
//  of increasing anxiety and depressive symptoms. She reports that symptoms
//  began following a significant work-related stressor..."

// (200-400 words of professional clinical narrative)
```

**When to use:** When you need human-like writing, summaries, or clinical judgment.

### SimplGen's Source Map Structure

Open `template.ts` and find the `sourceMap` - it has ~50 entries mapping every field in the note.

**Pattern you'll see:**

```typescript
export const sourceMap: Record<string, SourceMapEntry> = {
  // HEADER - All props (direct copy)
  "header.patient.name": { source: "prop", dataPath: "patient.name" },
  "header.patient.dob": { source: "prop", dataPath: "patient.dateOfBirth" },

  // Age is computed
  "header.patient.age": { source: "computed", dataPath: "patient.dateOfBirth" },

  // Chief complaint is AI (formatted as quote)
  "chiefComplaint": {
    source: "ai",
    prompt: "Format the patient's chief complaint as a direct quote...",
    context: ["clinicalIntake.structured.chiefComplaint"]
  },

  // All subjective sections are AI
  "subjective.historyOfPresentIllness": { source: "ai", /* ... */ },
  "subjective.pastPsychiatricHistory": { source: "ai", /* ... */ },

  // MSE fields are props (clinician already observed them)
  "objective.mentalStatusExam.appearance": {
    source: "prop",
    dataPath: "clinicalIntake.mse.appearance"
  },

  // Assessment scores are props (already calculated)
  "objective.assessmentScores.phq9.total": {
    source: "prop",
    dataPath: "assessmentScores.phq9.total"
  }
};
```

---

## Chapter 5: Prefilling Data

### What Is Prefilling?

Prefilling means **filling in the blanks** for all the fields we know the answer to BEFORE asking AI for help.

Think of it like doing homework:
- **Easy questions** (1+1=?) - You answer immediately (props)
- **Math problems** (solve for x) - You calculate (computed)
- **Essay questions** - You'll ask AI for help later (ai)

**Prefill handles all the easy questions and math problems first.**

### The Prefill Function

Look at `engine.ts` - the `prefillObject` function:

```typescript
export function prefillObject(
  sourceMap: Record<string, SourceMapEntry>,
  data: any
): Partial<BiopsychNote> {
  const result: any = {};

  // Loop through every field in the source map
  for (const [path, entry] of Object.entries(sourceMap)) {

    // Skip AI fields - we'll handle those later
    if (entry.source === "ai") continue;

    // Handle PROP fields (direct copy)
    if (entry.source === "prop") {
      const value = getByPath(data, entry.dataPath!);
      if (value !== undefined) {
        setByPath(result, path, value);
      }
    }

    // Handle COMPUTED fields (calculate)
    else if (entry.source === "computed") {
      let value;

      // Special case: calculate age
      if (entry.dataPath === "patient.dateOfBirth") {
        value = calculateAge(data.patient.dateOfBirth);
      }

      // Special case: format facility address
      else if (path === "header.facility.address") {
        const f = data.encounter.facility;
        value = `${f.address}, ${f.city}, ${f.state} ${f.zipCode}`;
      }

      // ... more computed cases

      if (value !== undefined) {
        setByPath(result, path, value);
      }
    }
  }

  return result;
}
```

### Helper Functions Explained

#### getByPath - Navigate Nested Data

```typescript
function getByPath(obj: any, path: string): any {
  // Split "patient.demographics.age" into ["patient", "demographics", "age"]
  const parts = path.split('.');

  let current = obj;
  for (const part of parts) {
    if (current === undefined || current === null) return undefined;
    current = current[part];  // Go one level deeper
  }

  return current;
}

// Example:
const data = {
  patient: {
    demographics: {
      age: 28
    }
  }
};

getByPath(data, "patient.demographics.age");  // Returns: 28
```

#### setByPath - Build Nested Objects

```typescript
function setByPath(obj: any, path: string, value: any): void {
  // Split "header.patient.name" into ["header", "patient", "name"]
  const parts = path.split('.');
  const lastPart = parts.pop()!;  // "name"

  let current = obj;
  for (const part of parts) {  // Loop through ["header", "patient"]
    // Create empty object if doesn't exist
    if (!current[part]) current[part] = {};
    current = current[part];  // Go one level deeper
  }

  current[lastPart] = value;  // Set the final value
}

// Example:
const result = {};
setByPath(result, "header.patient.name", "Maria Rodriguez");

// Result:
// {
//   header: {
//     patient: {
//       name: "Maria Rodriguez"
//     }
//   }
// }
```

### What Prefill Produces

After prefilling, we have a **partial note** with all facts and calculations done:

```json
{
  "header": {
    "patient": {
      "name": "Maria Rodriguez",
      "age": 28,
      "dob": "03/15/1996",
      "pronouns": "she/her"
    },
    "facility": {
      "name": "Catalyst Behavioral Health",
      "address": "123 Main Street, Boston, MA 02101",
      "phone": "(555) 123-4567"
    },
    "encounter": {
      "date": "03/20/2024",
      "time": "10:00 AM",
      "type": "Initial Biopsychosocial Assessment",
      "provider": "Dr. Sarah Chen, MD, LCSW",
      "supervisor": "Dr. Michael Torres, PhD"
    }
  },
  "objective": {
    "mentalStatusExam": {
      "appearance": "well-groomed, appropriate dress",
      "behavior": "cooperative, good eye contact",
      "speech": "normal rate and volume",
      // ... all 11 MSE fields filled
    },
    "assessmentScores": {
      "phq9": {
        "total": 18,
        "severity": "Moderately Severe Depression",
        // ... more score details
      }
      // ... GAD-7, ACE, AUDIT, DAST-10
    }
  }
  // Note: subjective and assessment sections are MISSING
  // Those are AI-generated, so we skipped them
}
```

**Key insight:** About 40% of the final note is filled just from prefilling. No AI needed!

---

## Chapter 6: AI Generation

### What Does AI Generate?

After prefilling, we have gaps in our note - all the narrative sections:

**Missing sections (need AI):**
- Chief Complaint (formatted quote)
- History of Present Illness (narrative)
- Past Psychiatric History (narrative)
- Previous Medications (narrative)
- Current Medications (list → narrative)
- Family Psychiatric History (narrative)
- Medical History (narrative)
- Social History (narrative)
- Substance Use History (narrative)
- Functional Assessment (narrative)
- Clinical Formulation (narrative)
- Risk Assessment (narrative)
- Prognosis (narrative)
- Crisis Safety Plan - Reasons for Living (narrative)

That's 14 fields that need professional clinical writing.

### Building the AI-Only Schema

We can't send the entire `BiopsychNote` schema to AI - it would try to fill fields we already prefilled (and might get them wrong).

**Solution:** Build a **subset schema** containing ONLY the AI fields.

Look at `engine.ts` - the `buildAiOnlySchema` function:

```typescript
export function buildAiOnlySchema(
  sourceMap: Record<string, SourceMapEntry>
): any {
  // Step 1: Find all AI fields
  const aiFields: string[] = [];
  for (const [path, entry] of Object.entries(sourceMap)) {
    if (entry.source === "ai") {
      aiFields.push(path);
    }
  }

  // Result: [
  //   "chiefComplaint",
  //   "subjective.historyOfPresentIllness",
  //   "subjective.pastPsychiatricHistory",
  //   ...
  // ]

  // Step 2: Build nested JSON Schema
  const schema = {
    type: "object",
    properties: {},
    required: [],
    additionalProperties: false
  };

  // For each AI field, add it to the schema
  for (const path of aiFields) {
    addFieldToSchema(schema, path);
  }

  return schema;
}
```

**Result:** A JSON Schema that looks like:

```json
{
  "type": "object",
  "properties": {
    "chiefComplaint": {
      "type": "string"
    },
    "subjective": {
      "type": "object",
      "properties": {
        "historyOfPresentIllness": { "type": "string" },
        "pastPsychiatricHistory": { "type": "string" },
        "previousMedications": { "type": "string" },
        // ... more subjective fields
      },
      "required": ["historyOfPresentIllness", "pastPsychiatricHistory", ...],
      "additionalProperties": false
    },
    "objective": {
      "type": "object",
      "properties": {
        "functionalAssessment": { "type": "string" }
      },
      "required": ["functionalAssessment"],
      "additionalProperties": false
    },
    "assessment": {
      "type": "object",
      "properties": {
        "clinicalFormulation": { "type": "string" },
        "riskAssessment": { "type": "string" },
        "prognosis": { "type": "string" }
      },
      "required": ["clinicalFormulation", "riskAssessment", "prognosis"],
      "additionalProperties": false
    }
  },
  "required": ["chiefComplaint", "subjective", "objective", "assessment"],
  "additionalProperties": false
}
```

### Building the AI Prompt

The AI needs:
1. **System prompt** - Who is it? What's its job?
2. **User prompt** - What data to work with? What to generate?
3. **Schema** - Exact format for output

Look at `generator.ts` - the `buildPrompt` function:

```typescript
function buildPrompt(data: any): Array<any> {
  const systemPrompt = {
    role: "system",
    content: `You are an expert clinical psychologist writing comprehensive
              biopsychosocial intake assessment notes. Your writing is:
              - Professional and objective
              - Detailed yet concise
              - Clinically sound
              - Formatted for medical records`
  };

  const userPrompt = {
    role: "user",
    content: `Generate a complete biopsychosocial intake note based on this data:

              PATIENT INTAKE NARRATIVE:
              ${data.patientIntake?.narrative || 'N/A'}

              CLINICAL INTAKE Q&A:
              ${data.clinicalIntake?.qaText || 'N/A'}

              STRUCTURED DATA:
              ${JSON.stringify(data.clinicalIntake?.structured, null, 2)}

              ASSESSMENT SCORES:
              PHQ-9: ${data.assessmentScores?.phq9?.total || 'N/A'} (${data.assessmentScores?.phq9?.severity})
              GAD-7: ${data.assessmentScores?.gad7?.total || 'N/A'} (${data.assessmentScores?.gad7?.severity})
              ACE: ${data.assessmentScores?.ace?.total || 'N/A'}

              Write professional clinical narratives for each section.
              Use gender-appropriate pronouns (${data.patient?.pronouns}).
              Integrate assessment scores into your clinical formulation.`
  };

  return [systemPrompt, userPrompt];
}
```

### Calling OpenAI

Look at `generator.ts` - the main API call:

```typescript
const response = await openai.chat.completions.create({
  model: "gpt-4o-2024-08-06",  // Latest model with structured outputs
  messages: buildPrompt(data),
  response_format: {
    type: "json_schema",
    json_schema: {
      name: "biopsych_note",
      strict: true,  // GUARANTEE schema compliance
      schema: aiSchema  // Our AI-only schema
    }
  },
  temperature: 0.7  // Slight creativity, but mostly factual
});

const aiResult = JSON.parse(response.choices[0].message.content);
```

### What OpenAI Returns

```json
{
  "chiefComplaint": "I've been feeling really anxious and overwhelmed, and it's affecting my ability to function at work and home.",
  "subjective": {
    "historyOfPresentIllness": "Maria Rodriguez is a 28-year-old woman presenting with a 6-month history of increasing anxiety and depressive symptoms. She reports that symptoms began following a significant work-related stressor when she was assigned to lead a major project with tight deadlines. Initially, she experienced occasional worry and difficulty sleeping, but symptoms have progressively worsened...",
    "pastPsychiatricHistory": "Ms. Rodriguez reports one previous episode of depression during college (age 20), which lasted approximately 4 months. She did not seek professional treatment at that time but recalls that symptoms resolved after final exams ended...",
    // ... all other narrative sections
  },
  "objective": {
    "functionalAssessment": "Ms. Rodriguez demonstrates moderate functional impairment. She reports maintaining her employment but with decreased productivity and frequent difficulty concentrating..."
  },
  "assessment": {
    "clinicalFormulation": "Ms. Rodriguez presents with a clinical picture consistent with Major Depressive Disorder, Recurrent Episode, Moderate severity, and Generalized Anxiety Disorder. Her current episode appears precipitated by occupational stress...",
    "riskAssessment": "Current suicide risk is assessed as low. Ms. Rodriguez denies suicidal ideation, intent, or plan. She has no history of suicide attempts...",
    "prognosis": "Prognosis is good with appropriate treatment. Ms. Rodriguez has several protective factors including strong social support, employment stability, and high motivation for treatment..."
  }
}
```

**Key points:**
- Every field is filled (required by schema)
- All fields are strings (required by schema)
- No extra fields (additionalProperties: false)
- Professional clinical writing
- Integrates data from multiple sources
- Uses correct pronouns throughout

---

## Chapter 7: Merging Results

### The Problem: Two Partial Objects

After prefill and AI generation, we have two objects:

**Prefilled (facts & calculations):**
```json
{
  "header": { /* all filled */ },
  "objective": {
    "mentalStatusExam": { /* all filled */ },
    "assessmentScores": { /* all filled */ }
  }
}
```

**AI Result (narratives):**
```json
{
  "chiefComplaint": "...",
  "subjective": { /* all filled */ },
  "objective": {
    "functionalAssessment": "..."
  },
  "assessment": { /* all filled */ }
}
```

**Notice:** `objective` appears in BOTH. We need to combine them intelligently.

### Deep Merge Function

Look at `engine.ts` - the `deepMerge` function:

```typescript
export function deepMerge(base: any, overlay: any): any {
  // If overlay is null/undefined, return base
  if (overlay === null || overlay === undefined) return base;
  if (base === null || base === undefined) return overlay;

  // If overlay is an array, replace base entirely
  if (Array.isArray(overlay)) return overlay;

  // If overlay is NOT an object (string, number, boolean), replace base
  if (typeof overlay !== 'object') return overlay;

  // Both are objects - merge them recursively
  const result = { ...base };  // Start with a copy of base

  for (const key of Object.keys(overlay)) {
    // If key doesn't exist in base, add it
    if (!(key in result)) {
      result[key] = overlay[key];
    }
    // If key exists in both, merge recursively
    else {
      result[key] = deepMerge(result[key], overlay[key]);
    }
  }

  return result;
}
```

### Merge Example Step-by-Step

```typescript
const base = {
  header: {
    patient: { name: "Maria", age: 28 }
  },
  objective: {
    mentalStatusExam: { appearance: "well-groomed" },
    assessmentScores: { phq9: { total: 18 } }
  }
};

const overlay = {
  chiefComplaint: "I've been anxious",
  objective: {
    functionalAssessment: "Moderate impairment"
  }
};

const result = deepMerge(base, overlay);

// Result:
{
  header: {
    patient: { name: "Maria", age: 28 }  // From base
  },
  chiefComplaint: "I've been anxious",  // From overlay (new key)
  objective: {
    mentalStatusExam: { appearance: "well-groomed" },  // From base
    assessmentScores: { phq9: { total: 18 } },  // From base
    functionalAssessment: "Moderate impairment"  // From overlay (merged into objective)
  }
}
```

**Key insight:** Merge preserves everything from both objects, combining nested structures intelligently.

### The Complete Merge in SimplGen

```typescript
// In generator.ts
export async function generateNote(data: any): Promise<BiopsychNote> {
  // Step 1: Prefill facts
  const prefilled = prefillObject(sourceMap, data);

  // Step 2: Generate static plan sections
  const planSections = generatePlanSections(data);
  prefilled.plan = { ...prefilled.plan, ...planSections };

  // Step 3: Get AI narratives
  const aiResult = await callOpenAI(data);

  // Step 4: Map diagnoses (if needed)
  if (data.clinicalIntake?.structured?.diagnoses?.length > 0) {
    const diagnosisResult = await mapDiagnoses(data);
    aiResult.assessment.diagnosticImpressions = diagnosisResult;
  }

  // Step 5: MERGE everything
  const complete = deepMerge(prefilled, aiResult);

  return complete as BiopsychNote;
}
```

Now we have a **complete note** with:
- Header (prefilled)
- Chief Complaint (AI)
- Subjective (AI)
- Objective with MSE (prefilled) + Functional Assessment (AI) + Scores (prefilled)
- Assessment (AI + diagnoses)
- Plan (static templates with pronouns)

---

## Chapter 8: Rendering HTML

### From Data to Visual

We have a complete note as a JavaScript object. Now we need to turn it into a beautiful HTML document.

**Think of rendering like:**
- **Data** = Ingredients
- **Renderer** = Recipe + Chef
- **HTML** = Finished dish on a plate

### HTML Basics (Quick Refresher)

HTML uses **tags** to structure content:

```html
<h1>This is a heading</h1>
<p>This is a paragraph</p>
<div class="box">This is a container</div>
<strong>Bold text</strong>
```

**CSS** makes it pretty:

```css
.box {
  background-color: yellow;
  padding: 20px;
  border: 2px solid orange;
}
```

### SimplGen's HTML Structure

Look at `renderer.ts` - the `renderToHTML` function returns a complete HTML document:

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    /* All CSS embedded here */
  </style>
</head>
<body>
  <!-- Header (3 columns) -->
  <!-- Chief Complaint (yellow box) -->
  <!-- Subjective (8 subsections) -->
  <!-- Objective (MSE grid, scores) -->
  <!-- Assessment (formulation, table) -->
  <!-- Plan (numbered lists) -->
  <!-- Signature block -->
</body>
</html>
```

### Template Literals (String Interpolation)

JavaScript lets us embed variables in strings using backticks:

```typescript
const name = "Maria";
const age = 28;

const html = `
  <div>
    <p>Patient: ${name}</p>
    <p>Age: ${age}</p>
  </div>
`;

// Result:
// <div>
//   <p>Patient: Maria</p>
//   <p>Age: 28</p>
// </div>
```

### Rendering the Header

```typescript
function renderHeader(note: BiopsychNote): string {
  return `
    <div class="header-grid">
      <!-- Column 1: Patient -->
      <div class="header-section">
        <h2>Patient</h2>
        <p><strong>${note.header.patient.name}</strong></p>
        <p>DOB: ${note.header.patient.dob}</p>
        <p>Age: ${note.header.patient.age}</p>
        <p>Pronouns: ${note.header.patient.pronouns}</p>
      </div>

      <!-- Column 2: Facility -->
      <div class="header-section">
        <h2>Facility</h2>
        <p><strong>${note.header.facility.name}</strong></p>
        <p>${note.header.facility.address}</p>
        <p>${note.header.facility.phone}</p>
      </div>

      <!-- Column 3: Encounter -->
      <div class="header-section">
        <h2>Encounter</h2>
        <p>Date: ${note.header.encounter.date}</p>
        <p>Time: ${note.header.encounter.time}</p>
        <p>Type: ${note.header.encounter.type}</p>
        <p>Provider: ${note.header.encounter.provider}</p>
        ${note.header.encounter.supervisor ?
          `<p>Supervisor: ${note.header.encounter.supervisor}</p>` : ''}
      </div>
    </div>
  `;
}
```

**CSS for 3-column grid:**

```css
.header-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;  /* 3 equal columns */
  gap: 30px;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid #e5e7eb;
}
```

### Rendering the Chief Complaint (Highlighted Box)

```typescript
function renderChiefComplaint(note: BiopsychNote): string {
  return `
    <div class="chief-complaint">
      <strong>CHIEF COMPLAINT</strong>
      <p>"${note.chiefComplaint}"</p>
    </div>
  `;
}
```

**CSS for yellow alert box:**

```css
.chief-complaint {
  background-color: #fef3c7;  /* Light yellow */
  border-left: 4px solid #f59e0b;  /* Orange accent */
  padding: 15px 20px;
  margin-bottom: 30px;
  font-size: 11pt;
}

.chief-complaint strong {
  color: #92400e;  /* Dark orange */
  display: block;
  margin-bottom: 8px;
}
```

### Rendering Sections with Subsections

```typescript
function renderSubjective(note: BiopsychNote): string {
  const sections = [
    { title: "History of Present Illness", content: note.subjective.historyOfPresentIllness },
    { title: "Past Psychiatric History", content: note.subjective.pastPsychiatricHistory },
    { title: "Previous Medications", content: note.subjective.previousMedications },
    { title: "Current Medications", content: note.subjective.currentMedications },
    { title: "Family Psychiatric History", content: note.subjective.familyPsychiatricHistory },
    { title: "Medical History", content: note.subjective.medicalHistory },
    { title: "Social History", content: note.subjective.socialHistory },
    { title: "Substance Use History", content: note.subjective.substanceUseHistory }
  ];

  let html = '<div class="section"><div class="section-title">Subjective</div>';

  for (const section of sections) {
    html += `
      <div class="subsection">
        <div class="subsection-title">${section.title}</div>
        <p>${section.content}</p>
      </div>
    `;
  }

  html += '</div>';
  return html;
}
```

### Rendering the MSE Grid (2 Columns)

```typescript
function renderMSE(mse: any): string {
  const fields = [
    { label: "Appearance", value: mse.appearance },
    { label: "Behavior", value: mse.behavior },
    { label: "Speech", value: mse.speech },
    { label: "Mood", value: mse.mood },
    { label: "Affect", value: mse.affect },
    { label: "Thought Process", value: mse.thoughtProcess },
    { label: "Thought Content", value: mse.thoughtContent },
    { label: "Perceptions", value: mse.perceptions },
    { label: "Cognition", value: mse.cognition },
    { label: "Insight", value: mse.insight },
    { label: "Judgment", value: mse.judgment }
  ];

  let html = '<div class="mse-grid">';

  for (const field of fields) {
    html += `
      <div class="mse-item">
        <strong>${field.label}:</strong> ${field.value}
      </div>
    `;
  }

  html += '</div>';
  return html;
}
```

**CSS for 2-column grid:**

```css
.mse-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;  /* 2 equal columns */
  gap: 15px;
  margin-top: 15px;
}

.mse-item {
  padding: 10px;
  background-color: #f9fafb;  /* Light gray background */
  border-radius: 4px;
}
```

### Rendering Tables (Diagnoses)

```typescript
function renderDiagnosesTable(diagnoses: any[]): string {
  if (!diagnoses || diagnoses.length === 0) {
    return '<p>No diagnoses documented.</p>';
  }

  let html = `
    <table class="diagnosis-table">
      <thead>
        <tr>
          <th>ICD-10</th>
          <th>DSM-5</th>
          <th>Description</th>
          <th>Supporting Criteria</th>
        </tr>
      </thead>
      <tbody>
  `;

  for (const dx of diagnoses) {
    html += `
      <tr>
        <td>${dx.icd10}</td>
        <td>${dx.dsm5}</td>
        <td>${dx.description}</td>
        <td>${dx.criteria}</td>
      </tr>
    `;
  }

  html += '</tbody></table>';
  return html;
}
```

**CSS for tables:**

```css
.diagnosis-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 15px;
}

.diagnosis-table th {
  background-color: #f3f4f6;
  padding: 12px;
  text-align: left;
  font-weight: 600;
  border: 1px solid #d1d5db;
}

.diagnosis-table td {
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  vertical-align: top;
}

.diagnosis-table tr:nth-child(even) {
  background-color: #f9fafb;  /* Alternate row colors */
}
```

### Rendering Numbered Lists

```typescript
function renderPlan(plan: any): string {
  let html = '<div class="section"><div class="section-title">Plan</div>';

  // Interventions Recommended
  html += '<div class="subsection">';
  html += '<div class="subsection-title">Interventions Recommended</div>';
  html += '<ol class="plan-list">';
  for (const item of plan.interventionsRecommended) {
    html += `<li>${item}</li>`;
  }
  html += '</ol></div>';

  // Coordination of Care
  html += '<div class="subsection">';
  html += '<div class="subsection-title">Coordination of Care</div>';
  html += `<p>${plan.coordinationOfCare.intro}</p>`;
  html += '<ol class="plan-list">';
  for (const item of plan.coordinationOfCare.items) {
    html += `<li>${item}</li>`;
  }
  html += '</ol></div>';

  // ... Follow-Up Plan and Crisis Safety Plan

  html += '</div>';
  return html;
}
```

**CSS for numbered lists:**

```css
.plan-list {
  margin: 15px 0;
  padding-left: 25px;
}

.plan-list li {
  margin-bottom: 10px;
  line-height: 1.6;
}
```

### The Complete Renderer

Look at `renderer.ts` - it combines all these pieces:

```typescript
export function renderToHTML(note: BiopsychNote): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Biopsychosocial Assessment - ${note.header.patient.name}</title>
  <style>${CSS}</style>
</head>
<body>
  ${renderHeader(note)}
  ${renderChiefComplaint(note)}
  ${renderSubjective(note)}
  ${renderObjective(note)}
  ${renderAssessment(note)}
  ${renderPlan(note)}
  ${renderSignature()}
</body>
</html>`;
}
```

**Result:** A complete, professionally formatted HTML document ready to open in a browser or convert to PDF.

---

## Chapter 9: Putting It All Together

### The Complete Flow (run.ts)

Now let's trace through what happens when you run `bun run run.ts`:

```typescript
// 1. Load sample data
const data = JSON.parse(readFileSync('sample-data.json', 'utf-8'));

// 2. Generate note (this does ALL the work)
const note = await generateNote(data);

// 3. Render to HTML
const html = renderToHTML(note);

// 4. Save file
writeFileSync('output/biopsych-note.html', html);
```

### Inside generateNote() - The Core Function

```typescript
export async function generateNote(data: any): Promise<BiopsychNote> {
  console.log('Step 1: Prefilling facts and calculations...');
  const prefilled = prefillObject(sourceMap, data);
  // Prefilled now has: header, MSE, scores (40% complete)

  console.log('Step 2: Generating static plan sections...');
  const planSections = generatePlanSections(data);
  prefilled.plan = { ...prefilled.plan, ...planSections };
  // Plan now has: interventions, coordination, follow-up, crisis (50% complete)

  console.log('Step 3: Building AI schema...');
  const aiSchema = buildAiOnlySchema(sourceMap);
  // Schema has: chiefComplaint, subjective.*, objective.functionalAssessment, assessment.*

  console.log('Step 4: Calling OpenAI for narratives...');
  const messages = buildPrompt(data);
  const response = await openai.chat.completions.create({
    model: "gpt-4o-2024-08-06",
    messages: messages,
    response_format: {
      type: "json_schema",
      json_schema: { name: "biopsych_note", strict: true, schema: aiSchema }
    },
    temperature: 0.7
  });
  const aiResult = JSON.parse(response.choices[0].message.content);
  // AI result has: all the narratives (90% complete)

  console.log('Step 5: Mapping diagnoses...');
  if (data.clinicalIntake?.structured?.diagnoses?.length > 0) {
    const diagnosisMessages = buildDiagnosisPrompt(data);
    const diagnosisResponse = await openai.chat.completions.create({
      model: "gpt-4o-2024-08-06",
      messages: diagnosisMessages,
      response_format: {
        type: "json_schema",
        json_schema: { name: "diagnosis_mapping", strict: true, schema: diagnosisSchema }
      }
    });
    const diagnosisResult = JSON.parse(diagnosisResponse.choices[0].message.content);
    aiResult.assessment.diagnosticImpressions = diagnosisResult.diagnosticImpressions;
  }
  // Diagnoses now mapped DSM-5 → ICD-10 (95% complete)

  console.log('Step 6: Merging all results...');
  const complete = deepMerge(prefilled, aiResult);
  // Complete note has: everything (100% complete)

  return complete as BiopsychNote;
}
```

### Visual Timeline

```
t=0s    Load sample-data.json (525 lines)
        ↓
t=0.1s  Prefill props & computed fields
        Result: Header, MSE, Scores filled
        ↓
t=0.2s  Generate static Plan sections
        Result: All Plan items with pronouns
        ↓
t=0.3s  Build AI-only schema
        Result: JSON Schema with 14 AI fields
        ↓
t=0.4s  Call OpenAI API
        [Waiting for AI...]
        ↓
t=3s    Receive AI narratives
        Result: Chief Complaint, Subjective (8), Objective (1), Assessment (3)
        ↓
t=3.1s  Call OpenAI for diagnosis mapping
        [Waiting for AI...]
        ↓
t=5s    Receive mapped diagnoses
        Result: Array of {icd10, dsm5, description, criteria}
        ↓
t=5.1s  Deep merge prefilled + AI + diagnoses
        Result: Complete BiopsychNote object
        ↓
t=5.2s  Render to HTML
        Result: 20KB HTML file with embedded CSS
        ↓
t=5.3s  Save to output/biopsych-note.html
        ✓ DONE
```

**Total time:** ~5 seconds (mostly waiting for OpenAI)

### Data Flow Diagram

```
sample-data.json (Input)
         |
         v
    sourceMap (Rules)
         |
         +---> PROP fields -----> Prefill
         |                           |
         +---> COMPUTED fields ----> Prefill
         |                           |
         +---> AI fields ---------> Build AI Schema
                                     |
                                     v
                              OpenAI API Call
                                     |
                                     v
                               AI Narratives
                                     |
                                     v
                         +---> Diagnoses? ---> OpenAI API Call
                         |                            |
    Prefilled <----------+                            |
         |                                            |
         v                                            |
    Deep Merge <--------------------------------------+
         |
         v
    Complete Note (Object)
         |
         v
    Render to HTML
         |
         v
    output/biopsych-note.html (5-10 pages)
```

---

## Chapter 10: Advanced Concepts

### Dynamic Prompting (Context Selection)

In the source map, each AI field has a `context` array:

```typescript
"subjective.historyOfPresentIllness": {
  source: "ai",
  prompt: "Write a comprehensive HPI...",
  context: [
    "clinicalIntake.narrative",
    "patientIntake.symptoms",
    "clinicalIntake.structured.currentSymptoms"
  ]
}
```

**Why context matters:**

The sample data has LOTS of information. We don't want to send ALL of it to AI for every field - that's expensive and confusing.

**Context selection:** For each AI field, we only send the relevant data paths.

**Future enhancement:** Build per-field prompts with just the necessary context:

```typescript
function buildFieldPrompt(field: string, data: any): string {
  const entry = sourceMap[field];
  let prompt = entry.prompt;

  // Attach only relevant context
  for (const contextPath of entry.context) {
    const contextData = getByPath(data, contextPath);
    prompt += `\n\nRELEVANT DATA (${contextPath}):\n${JSON.stringify(contextData, null, 2)}`;
  }

  return prompt;
}
```

**Result:** More focused prompts = better AI output + lower costs.

### Pronoun Handling

Clinical notes must use correct pronouns throughout. SimplGen handles this automatically:

```typescript
function generatePlanSections(data: any): any {
  const pronouns = parsePronounsFromString(data.patient.pronouns);
  // Input: "she/her" or "he/him" or "they/them"
  // Output: { subjective: "she", objective: "her", possessive: "her", reflexive: "herself" }

  const name = data.patient.name.split(' ')[0];  // First name only

  return {
    interventionsRecommended: [
      `Individual psychotherapy (60 minutes weekly) utilizing evidence-based modalities tailored to ${pronouns.possessive} presenting concerns`,
      `Psychiatric medication evaluation to assess ${pronouns.possessive} potential benefit from pharmacological intervention`,
      `Psychoeducation regarding ${pronouns.possessive} diagnoses, treatment options, and self-management strategies`,
      // ... more items using correct pronouns
    ],
    coordinationOfCare: {
      intro: `To ensure comprehensive and integrated care, the following coordination efforts are recommended for ${name}:`,
      items: [
        `Regular communication with ${pronouns.possessive} primary care provider regarding ${pronouns.possessive} overall health and any medical conditions that may impact mental health treatment`,
        // ... more items
      ]
    }
  };
}
```

**Key insight:** Pronouns are prefilled data, so AI doesn't need to worry about them. We handle pronoun consistency in our code.

### Error Handling & Validation

**What if OpenAI fails?**

```typescript
try {
  const response = await openai.chat.completions.create({ /* ... */ });
  const aiResult = JSON.parse(response.choices[0].message.content);
} catch (error) {
  console.error('OpenAI API error:', error);

  // Fallback: Return partial note with error message
  return {
    ...prefilled,
    chiefComplaint: "[Error generating content - please try again]",
    subjective: {
      historyOfPresentIllness: "[Error - content not available]",
      // ... more error placeholders
    }
  };
}
```

**What if data is missing?**

```typescript
// In prefillObject
const value = getByPath(data, entry.dataPath);
if (value === undefined) {
  console.warn(`Missing data at path: ${entry.dataPath}`);
  // Don't set the field - leave it undefined
  continue;
}
```

**What if AI returns invalid JSON?**

OpenAI's `strict: true` mode guarantees valid JSON that matches the schema. If it fails, the API returns an error (caught above).

### Template Versioning (Future)

Different organizations might want different note formats:

```typescript
// Current: Single template
import { BiopsychNote, sourceMap } from './template';

// Future: Multiple templates
import { BiopsychNote as BiopsychV1 } from './templates/biopsych-v1';
import { BiopsychNote as BiopsychV2 } from './templates/biopsych-v2';
import { ProgressNote } from './templates/progress-note';
import { DischargeNote } from './templates/discharge-note';

// Select template based on note type
const templates = {
  'biopsych-v1': { schema: BiopsychV1, sourceMap: biopsychV1Map },
  'biopsych-v2': { schema: BiopsychV2, sourceMap: biopsychV2Map },
  'progress': { schema: ProgressNote, sourceMap: progressMap },
  'discharge': { schema: DischargeNote, sourceMap: dischargeMap }
};

export async function generateNote(data: any, templateType: string) {
  const template = templates[templateType];
  const prefilled = prefillObject(template.sourceMap, data);
  // ... rest of generation
}
```

### Visual Template Builder (Future Vision)

The source map approach makes visual editing possible:

**UI Mockup:**

```
┌─────────────────────────────────────────────────┐
│ Template Editor: Biopsych Note v2              │
├─────────────────────────────────────────────────┤
│                                                 │
│  [+ Add Section]                                │
│                                                 │
│  ▼ Header                                       │
│    ┌─────────────────────────────────────┐     │
│    │ Patient Name                         │     │
│    │ Source: [Prop ▼]                     │     │
│    │ Data Path: patient.name              │     │
│    └─────────────────────────────────────┘     │
│                                                 │
│    ┌─────────────────────────────────────┐     │
│    │ Patient Age                          │     │
│    │ Source: [Computed ▼]                 │     │
│    │ Data Path: patient.dateOfBirth       │     │
│    │ Calculation: Calculate from DOB      │     │
│    └─────────────────────────────────────┘     │
│                                                 │
│  ▼ Subjective                                   │
│    ┌─────────────────────────────────────┐     │
│    │ History of Present Illness           │     │
│    │ Source: [AI ▼]                       │     │
│    │ Prompt: [Edit...]                    │     │
│    │ Context:                              │     │
│    │  ☑ clinicalIntake.narrative          │     │
│    │  ☑ patientIntake.symptoms            │     │
│    │  ☐ assessmentScores                  │     │
│    └─────────────────────────────────────┘     │
│                                                 │
│  [Save Template] [Preview] [Export JSON]        │
└─────────────────────────────────────────────────┘
```

**User actions:**
- Drag & drop to reorder sections
- Click "+ Add Section" to add new fields
- Change source type (prop/computed/ai) in dropdown
- Edit prompts and context selections for AI fields
- Save generates a new template.ts file

**Behind the scenes:** The UI just edits the sourceMap JSON and regenerates the TypeScript files.

### Multi-Format Export

Once we have the complete note object, we can render to any format:

```typescript
// HTML (current)
const html = renderToHTML(note);

// PDF (future)
const pdf = await renderToPDF(note);

// DOCX (future)
const docx = renderToDocx(note);

// HL7 FHIR (future - for EHR integration)
const fhir = renderToFHIR(note);

// Plain text (future - for legacy systems)
const text = renderToPlainText(note);
```

**Key insight:** Because we have a structured object, we can render it however we want. The hard part (data + AI) is already done.

### Org-Level Branding

Different clinics want different styling:

```typescript
// Current: Embedded CSS in renderer.ts
const CSS = `
  body { font-family: 'Open Sans', sans-serif; }
  .chief-complaint { background-color: #fef3c7; }
`;

// Future: Inject custom CSS
export function renderToHTML(note: BiopsychNote, branding?: BrandingConfig) {
  const css = branding?.customCSS || DEFAULT_CSS;
  const logo = branding?.logoURL || '';

  return `<!DOCTYPE html>
<html>
<head>
  <style>${css}</style>
</head>
<body>
  ${logo ? `<img src="${logo}" class="clinic-logo" />` : ''}
  ${renderHeader(note)}
  ...
</body>
</html>`;
}
```

**Branding config example:**

```json
{
  "organizationId": "catalyst-behavioral-health",
  "logoURL": "https://cdn.catalyst.com/logo.png",
  "customCSS": "body { font-family: 'Roboto', sans-serif; color: #2c3e50; }",
  "primaryColor": "#3498db",
  "accentColor": "#e74c3c"
}
```

---

## Summary: What You've Learned

### Fundamental Concepts

1. **Data structures** - Objects, arrays, nested data, dot notation
2. **Templates & schemas** - Blueprints for output structure
3. **Source mapping** - Categorizing data sources (prop/computed/ai)
4. **Prefilling** - Filling known data before AI generation
5. **AI generation** - Using OpenAI's structured outputs
6. **Merging** - Combining multiple data sources
7. **Rendering** - Transforming data to visual HTML

### SimplGen Architecture

```
Input → Source Map → Prefill → AI Generate → Merge → Render → Output
```

**Three types of data:**
- **prop** - Direct copy (patient.name)
- **computed** - Calculate (age from DOB)
- **ai** - Generate (clinical narratives)

**Two AI calls:**
1. Main content generation (narratives)
2. Diagnosis mapping (DSM-5 → ICD-10)

**One merge operation:**
- Prefilled + AI + Diagnoses = Complete note

**One render function:**
- Complete note → Professional HTML document

### File Breakdown

| File | Purpose | Lines | Key Concept |
|------|---------|-------|-------------|
| `template.ts` | Schema + source map | ~310 | Define structure & rules |
| `engine.ts` | Core utilities | ~253 | Prefill, schema building, merge |
| `generator.ts` | Orchestration | ~262 | Coordinate all steps |
| `renderer.ts` | HTML output | ~482 | Transform to visual |
| `run.ts` | Demo script | ~62 | Tie everything together |

**Total:** ~1,000 lines to replace a 1,040-line monolithic template + 5,000+ lines of complex infrastructure.

### Why SimplGen Works

1. **Separation of concerns** - Each file has one job
2. **Clear data flow** - Easy to trace from input to output
3. **Type safety** - TypeScript catches errors early
4. **AI guardrails** - Structured outputs prevent hallucination
5. **Debuggability** - Can inspect every intermediate step
6. **Extensibility** - Easy to add new fields or sections

### Next Steps

**To run SimplGen:**
```bash
cd simplegen
bun install
export OPENAI_API_KEY="your-key"
bun run run.ts
```

**To customize:**
1. Edit `template.ts` - Add/remove fields
2. Edit source map - Change field sources
3. Edit `renderer.ts` - Change HTML/CSS styling
4. Edit `generator.ts` - Adjust AI prompts

**To understand deeper:**
- Read each file in order: template → engine → generator → renderer → run
- Add console.logs to see intermediate data
- Try changing a field from "ai" to "prop" and see what happens
- Experiment with different AI prompts

---

## Conclusion

You've now learned SimplGen from the ground up:
- How data flows through the system
- How templates define structure
- How source maps categorize fields
- How prefilling handles facts
- How AI generates narratives
- How merging combines results
- How rendering creates beautiful output

**The core insight:** By splitting data into prop/computed/ai and handling each appropriately, we build a system that's simple, reliable, and powerful.

**SimplGen is proof that complex problems often have simple solutions.**

Welcome to the team! 🚀
