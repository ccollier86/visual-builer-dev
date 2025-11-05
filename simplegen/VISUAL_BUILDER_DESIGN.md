# Visual Note Template Builder - Design Document

How to build a drag-drop template builder on top of SimplGen's architecture.

---

## Core Concept

**The visual builder is just a UI that creates/edits the sourceMap and schema.**

That's it. The SimplGen engine ([generator.ts](generator.ts), [engine.ts](engine.ts), [renderer.ts](renderer.ts)) stays unchanged - it just works with whatever sourceMap/schema you give it.

```
Visual Builder → sourceMap + schema → SimplGen Engine → Note
```

---

## Architecture Overview

### Domains (Following SOR/SOD/DI)

```
visual-builder/
├── core/                    # Business logic
│   ├── template-manager.ts  # CRUD for templates
│   ├── schema-builder.ts    # Convert UI state → sourceMap/schema
│   ├── preset-loader.ts     # Load preset templates (SOAP, DAP, etc.)
│   └── theme-manager.ts     # Manage CSS themes
├── ui/                      # Presentation layer
│   ├── TemplateEditor.svelte
│   ├── SectionPalette.svelte
│   ├── FieldEditor.svelte
│   ├── ThemeSelector.svelte
│   └── PreviewPane.svelte
├── contracts/               # Interfaces
│   └── types.ts
└── adapters/                # External connections
    ├── database-adapter.ts  # Save/load from DB
    └── simplegen-adapter.ts # Interface to SimplGen engine
```

---

## Data Model

### Template Definition (Stored in DB)

```typescript
interface TemplateDefinition {
  id: string;
  name: string;
  description: string;
  type: 'soap' | 'dap' | 'biopsych' | 'progress' | 'discharge' | 'custom';
  version: number;
  organizationId?: string;  // null = global, else org-specific

  // The actual template structure
  structure: TemplateStructure;

  // Rendering config
  theme: ThemeConfig;

  metadata: {
    createdAt: string;
    createdBy: string;
    updatedAt: string;
    updatedBy: string;
  };
}

interface TemplateStructure {
  sections: Section[];
}

interface Section {
  id: string;  // Unique ID for this section instance
  title: string;
  type: 'header' | 'narrative' | 'list' | 'table' | 'grid' | 'custom';
  fields: Field[];
  styling?: SectionStyle;
  order: number;  // Display order
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

interface Field {
  id: string;
  label: string;
  path: string;  // Dot notation path in final object (e.g., "subjective.hpi")

  // Source configuration
  source: 'prop' | 'computed' | 'ai' | 'static';

  // For prop fields
  dataPath?: string;  // Where to get data from input

  // For computed fields
  computation?: ComputationType;
  computationConfig?: any;

  // For AI fields
  prompt?: string;
  context?: string[];  // Data paths for context

  // For static fields
  staticValue?: any;
  staticTemplate?: string;  // Template with variable substitution

  // Field metadata
  fieldType: 'text' | 'number' | 'date' | 'list' | 'object';
  required: boolean;
  order: number;
}

type ComputationType =
  | 'age-from-dob'
  | 'full-address'
  | 'full-name-with-credentials'
  | 'score-delta'
  | 'pronoun-parse'
  | 'date-format'
  | 'custom-function';

interface ThemeConfig {
  id: string;
  name: string;
  css: string;  // Full CSS or reference to preset
  customizations?: {
    fontFamily?: string;
    fontSize?: string;
    primaryColor?: string;
    accentColor?: string;
    headerStyle?: 'grid' | 'stacked' | 'inline';
    sectionBorders?: boolean;
    spacing?: 'compact' | 'normal' | 'relaxed';
  };
}
```

---

## Preset Templates

### 1. SOAP Note Template

**SOAP = Subjective, Objective, Assessment, Plan**

```typescript
const SOAP_PRESET: TemplateDefinition = {
  id: 'preset-soap-v1',
  name: 'SOAP Note',
  description: 'Standard SOAP note for general medical/behavioral health encounters',
  type: 'soap',
  version: 1,
  organizationId: null,  // Global preset

  structure: {
    sections: [
      {
        id: 'header',
        title: 'Session Information',
        type: 'grid',
        fields: [
          { id: 'patient-name', label: 'Patient', path: 'header.patient.name', source: 'prop', dataPath: 'patient.name', fieldType: 'text', required: true, order: 1 },
          { id: 'patient-dob', label: 'DOB', path: 'header.patient.dob', source: 'prop', dataPath: 'patient.dateOfBirth', fieldType: 'date', required: true, order: 2 },
          { id: 'patient-age', label: 'Age', path: 'header.patient.age', source: 'computed', computation: 'age-from-dob', fieldType: 'number', required: true, order: 3 },
          { id: 'session-date', label: 'Date', path: 'header.encounter.date', source: 'prop', dataPath: 'encounter.date', fieldType: 'date', required: true, order: 4 },
          { id: 'provider', label: 'Provider', path: 'header.encounter.provider', source: 'prop', dataPath: 'encounter.provider.name', fieldType: 'text', required: true, order: 5 }
        ],
        order: 1
      },
      {
        id: 'subjective',
        title: 'Subjective',
        type: 'narrative',
        fields: [
          {
            id: 'chief-complaint',
            label: 'Chief Complaint',
            path: 'subjective.chiefComplaint',
            source: 'ai',
            prompt: 'Format the patient\'s chief complaint as a brief direct quote (1-2 sentences).',
            context: ['clinicalIntake.chiefComplaint', 'patientIntake.presentingProblem'],
            fieldType: 'text',
            required: true,
            order: 1
          },
          {
            id: 'hpi',
            label: 'History of Present Illness',
            path: 'subjective.hpi',
            source: 'ai',
            prompt: 'Write a comprehensive HPI including onset, duration, severity, aggravating/alleviating factors, and current status.',
            context: ['clinicalIntake.narrative', 'patientIntake.symptoms', 'clinicalIntake.structured.currentSymptoms'],
            fieldType: 'text',
            required: true,
            order: 2
          },
          {
            id: 'review-of-symptoms',
            label: 'Review of Symptoms',
            path: 'subjective.reviewOfSymptoms',
            source: 'ai',
            prompt: 'Summarize pertinent positive and negative symptoms across relevant domains.',
            context: ['clinicalIntake.structured.currentSymptoms', 'assessments'],
            fieldType: 'text',
            required: false,
            order: 3
          }
        ],
        order: 2
      },
      {
        id: 'objective',
        title: 'Objective',
        type: 'narrative',
        fields: [
          {
            id: 'mse',
            label: 'Mental Status Exam',
            path: 'objective.mentalStatusExam',
            source: 'prop',
            dataPath: 'clinicalIntake.mse',
            fieldType: 'object',
            required: true,
            order: 1
          },
          {
            id: 'observations',
            label: 'Clinical Observations',
            path: 'objective.observations',
            source: 'ai',
            prompt: 'Summarize key clinical observations during the session.',
            context: ['clinicalIntake.observations', 'clinicalIntake.mse'],
            fieldType: 'text',
            required: false,
            order: 2
          }
        ],
        order: 3
      },
      {
        id: 'assessment',
        title: 'Assessment',
        type: 'narrative',
        fields: [
          {
            id: 'clinical-impression',
            label: 'Clinical Impression',
            path: 'assessment.impression',
            source: 'ai',
            prompt: 'Provide a clinical formulation integrating subjective and objective findings.',
            context: ['clinicalIntake.structured', 'assessments', 'clinicalIntake.diagnoses'],
            fieldType: 'text',
            required: true,
            order: 1
          },
          {
            id: 'diagnoses',
            label: 'Diagnoses',
            path: 'assessment.diagnoses',
            source: 'prop',
            dataPath: 'clinicalIntake.diagnoses',
            fieldType: 'list',
            required: false,
            order: 2
          }
        ],
        order: 4
      },
      {
        id: 'plan',
        title: 'Plan',
        type: 'list',
        fields: [
          {
            id: 'interventions',
            label: 'Interventions',
            path: 'plan.interventions',
            source: 'static',
            staticTemplate: 'Continue weekly individual therapy (60 min) addressing {{patient.presentingConcerns}}',
            fieldType: 'list',
            required: true,
            order: 1
          },
          {
            id: 'medications',
            label: 'Medications',
            path: 'plan.medications',
            source: 'prop',
            dataPath: 'clinicalIntake.medicationPlan',
            fieldType: 'list',
            required: false,
            order: 2
          },
          {
            id: 'follow-up',
            label: 'Follow-up',
            path: 'plan.followUp',
            source: 'static',
            staticValue: 'Return in 1 week for continued therapy',
            fieldType: 'text',
            required: true,
            order: 3
          }
        ],
        order: 5
      }
    ]
  },

  theme: {
    id: 'default-clean',
    name: 'Clean Professional',
    css: 'themes/clean-professional.css',
    customizations: {
      fontFamily: 'Open Sans, sans-serif',
      fontSize: '10pt',
      headerStyle: 'grid',
      sectionBorders: true,
      spacing: 'normal'
    }
  },

  metadata: {
    createdAt: '2024-01-01T00:00:00Z',
    createdBy: 'system',
    updatedAt: '2024-01-01T00:00:00Z',
    updatedBy: 'system'
  }
};
```

### 2. DAP Note Template

**DAP = Data, Assessment, Plan** (simpler than SOAP)

```typescript
const DAP_PRESET: TemplateDefinition = {
  id: 'preset-dap-v1',
  name: 'DAP Note',
  description: 'Data, Assessment, Plan format for therapy progress notes',
  type: 'dap',
  version: 1,
  organizationId: null,

  structure: {
    sections: [
      {
        id: 'header',
        title: 'Session Information',
        type: 'inline',
        fields: [
          { id: 'patient-name', label: 'Patient', path: 'header.patient.name', source: 'prop', dataPath: 'patient.name', fieldType: 'text', required: true, order: 1 },
          { id: 'session-date', label: 'Date', path: 'header.session.date', source: 'prop', dataPath: 'session.date', fieldType: 'date', required: true, order: 2 },
          { id: 'session-type', label: 'Type', path: 'header.session.type', source: 'prop', dataPath: 'session.type', fieldType: 'text', required: true, order: 3 }
        ],
        order: 1
      },
      {
        id: 'data',
        title: 'Data',
        type: 'narrative',
        fields: [
          {
            id: 'session-content',
            label: 'Session Content',
            path: 'data.sessionContent',
            source: 'ai',
            prompt: 'Summarize what was discussed in the session, including client\'s presentation, topics covered, and interventions used.',
            context: ['session.narrative', 'session.topics', 'session.interventions'],
            fieldType: 'text',
            required: true,
            order: 1
          }
        ],
        order: 2
      },
      {
        id: 'assessment',
        title: 'Assessment',
        type: 'narrative',
        fields: [
          {
            id: 'clinical-assessment',
            label: 'Clinical Assessment',
            path: 'assessment.clinical',
            source: 'ai',
            prompt: 'Provide clinical assessment of client\'s progress, response to interventions, and current functioning.',
            context: ['session.observations', 'session.progress', 'treatmentPlan.goals'],
            fieldType: 'text',
            required: true,
            order: 1
          }
        ],
        order: 3
      },
      {
        id: 'plan',
        title: 'Plan',
        type: 'narrative',
        fields: [
          {
            id: 'next-steps',
            label: 'Next Steps',
            path: 'plan.nextSteps',
            source: 'ai',
            prompt: 'Describe the plan for next session and any homework or follow-up actions.',
            context: ['session.homework', 'treatmentPlan.nextSteps'],
            fieldType: 'text',
            required: true,
            order: 1
          }
        ],
        order: 4
      }
    ]
  },

  theme: {
    id: 'default-compact',
    name: 'Compact',
    css: 'themes/compact.css',
    customizations: {
      fontFamily: 'Arial, sans-serif',
      fontSize: '11pt',
      headerStyle: 'inline',
      sectionBorders: false,
      spacing: 'compact'
    }
  },

  metadata: {
    createdAt: '2024-01-01T00:00:00Z',
    createdBy: 'system',
    updatedAt: '2024-01-01T00:00:00Z',
    updatedBy: 'system'
  }
};
```

### 3. Treatment Plan Template

```typescript
const TX_PLAN_PRESET: TemplateDefinition = {
  id: 'preset-tx-plan-v1',
  name: 'Treatment Plan',
  description: 'Comprehensive treatment plan with goals, objectives, and interventions',
  type: 'custom',
  version: 1,
  organizationId: null,

  structure: {
    sections: [
      {
        id: 'header',
        title: 'Client Information',
        type: 'grid',
        fields: [
          { id: 'client-name', label: 'Client', path: 'header.client.name', source: 'prop', dataPath: 'patient.name', fieldType: 'text', required: true, order: 1 },
          { id: 'plan-date', label: 'Plan Date', path: 'header.plan.date', source: 'prop', dataPath: 'plan.createdDate', fieldType: 'date', required: true, order: 2 },
          { id: 'review-date', label: 'Review Date', path: 'header.plan.reviewDate', source: 'computed', computation: 'date-format', fieldType: 'date', required: true, order: 3 }
        ],
        order: 1
      },
      {
        id: 'presenting-problems',
        title: 'Presenting Problems',
        type: 'list',
        fields: [
          {
            id: 'problems-list',
            label: 'Problems',
            path: 'problems',
            source: 'prop',
            dataPath: 'treatmentPlan.problems',
            fieldType: 'list',
            required: true,
            order: 1
          }
        ],
        order: 2
      },
      {
        id: 'diagnoses',
        title: 'Diagnoses',
        type: 'table',
        fields: [
          {
            id: 'diagnosis-table',
            label: 'Diagnoses',
            path: 'diagnoses',
            source: 'prop',
            dataPath: 'clinicalIntake.diagnoses',
            fieldType: 'list',
            required: true,
            order: 1
          }
        ],
        order: 3
      },
      {
        id: 'goals',
        title: 'Treatment Goals',
        type: 'custom',
        fields: [
          {
            id: 'goals-list',
            label: 'Goals',
            path: 'goals',
            source: 'ai',
            prompt: 'Generate 3-5 SMART treatment goals based on presenting problems and diagnoses. Each goal should have specific objectives.',
            context: ['treatmentPlan.problems', 'clinicalIntake.diagnoses', 'patientIntake.goals'],
            fieldType: 'list',
            required: true,
            order: 1
          }
        ],
        order: 4
      },
      {
        id: 'interventions',
        title: 'Planned Interventions',
        type: 'list',
        fields: [
          {
            id: 'interventions-list',
            label: 'Interventions',
            path: 'interventions',
            source: 'static',
            staticTemplate: [
              'Individual therapy ({{frequency}}) using {{modality}}',
              'Medication management as clinically indicated',
              'Care coordination with {{providers}}',
              'Progress monitoring using {{assessments}}'
            ],
            fieldType: 'list',
            required: true,
            order: 1
          }
        ],
        order: 5
      },
      {
        id: 'discharge-criteria',
        title: 'Discharge Criteria',
        type: 'narrative',
        fields: [
          {
            id: 'discharge-criteria-text',
            label: 'Criteria',
            path: 'dischargeCriteria',
            source: 'ai',
            prompt: 'Define clear, measurable criteria for successful treatment completion and discharge.',
            context: ['treatmentPlan.goals', 'clinicalIntake.diagnoses'],
            fieldType: 'text',
            required: true,
            order: 1
          }
        ],
        order: 6
      }
    ]
  },

  theme: {
    id: 'default-formal',
    name: 'Formal Document',
    css: 'themes/formal.css',
    customizations: {
      fontFamily: 'Times New Roman, serif',
      fontSize: '12pt',
      headerStyle: 'stacked',
      sectionBorders: true,
      spacing: 'relaxed'
    }
  },

  metadata: {
    createdAt: '2024-01-01T00:00:00Z',
    createdBy: 'system',
    updatedAt: '2024-01-01T00:00:00Z',
    updatedBy: 'system'
  }
};
```

---

## Visual Builder UI

### Main Interface

```
┌────────────────────────────────────────────────────────────────────────┐
│ Template Builder: My Custom SOAP Note                    [Save] [Test] │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ ┌─────────────────┐  ┌──────────────────────────────────────────────┐ │
│ │ Section Palette │  │ Template Canvas                              │ │
│ ├─────────────────┤  ├──────────────────────────────────────────────┤ │
│ │                 │  │                                              │ │
│ │ Presets:        │  │ ▼ Header                          [⚙] [✕]   │ │
│ │ • SOAP Note     │  │   ┌────────────────────────────────────┐   │ │
│ │ • DAP Note      │  │   │ Patient Name [prop] patient.name   │   │ │
│ │ • TX Plan       │  │   │ Age [computed] age-from-dob        │   │ │
│ │ • Progress      │  │   │ Date [prop] encounter.date         │   │ │
│ │                 │  │   └────────────────────────────────────┘   │ │
│ │ Add Section:    │  │                                              │ │
│ │ ⊕ Header        │  │ ▼ Subjective                      [⚙] [✕]   │ │
│ │ ⊕ Narrative     │  │   ┌────────────────────────────────────┐   │ │
│ │ ⊕ List          │  │   │ Chief Complaint [ai] ────────────  │   │ │
│ │ ⊕ Table         │  │   │   Prompt: Format as quote...       │   │ │
│ │ ⊕ Grid          │  │   │   Context: ☑ chiefComplaint        │   │ │
│ │ ⊕ Custom        │  │   │            ☑ presentingProblem     │   │ │
│ │                 │  │   │                                    │   │ │
│ │ Field Types:    │  │   │ HPI [ai] ─────────────────────    │   │ │
│ │ • Text (prop)   │  │   │   Prompt: Write comprehensive...   │   │ │
│ │ • Computed      │  │   │   Context: ☑ narrative             │   │ │
│ │ • AI Generated  │  │   │            ☑ symptoms              │   │ │
│ │ • Static        │  │   └────────────────────────────────────┘   │ │
│ │                 │  │                                              │ │
│ │                 │  │ ▼ Objective                       [⚙] [✕]   │ │
│ │                 │  │   [Drag sections here to add]                │ │
│ │                 │  │                                              │ │
│ └─────────────────┘  └──────────────────────────────────────────────┘ │
│                                                                         │
│ ┌──────────────────────────────────────────────────────────────────┐   │
│ │ Theme & Styling                                     [Apply Theme] │   │
│ ├──────────────────────────────────────────────────────────────────┤   │
│ │ Theme: [Clean Professional ▼]                                    │   │
│ │ Font: [Open Sans ▼]  Size: [10pt ▼]  Spacing: [Normal ▼]        │   │
│ │ Header Style: ⦿ Grid  ○ Stacked  ○ Inline                        │   │
│ │ Colors: Primary [#1a1a1a] Accent [#f59e0b]                       │   │
│ └──────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│ ┌──────────────────────────────────────────────────────────────────┐   │
│ │ Live Preview                                      [⟳] [Download] │   │
│ ├──────────────────────────────────────────────────────────────────┤   │
│ │ [Preview of rendered note with sample data...]                   │   │
│ └──────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

### Component Breakdown

#### 1. **TemplateEditor.svelte** (Main Container)

```svelte
<script lang="ts">
  import { writable } from 'svelte/store';
  import type { TemplateDefinition } from './contracts/types';

  import SectionPalette from './SectionPalette.svelte';
  import TemplateCanvas from './TemplateCanvas.svelte';
  import ThemeSelector from './ThemeSelector.svelte';
  import PreviewPane from './PreviewPane.svelte';

  // State
  let template = writable<TemplateDefinition>(/* ... */);
  let isDirty = writable(false);

  // Actions
  async function saveTemplate() {
    // Call template-manager to save
  }

  async function testTemplate() {
    // Generate sample note
  }
</script>

<div class="template-editor">
  <header>
    <input bind:value={$template.name} />
    <button on:click={saveTemplate}>Save</button>
    <button on:click={testTemplate}>Test</button>
  </header>

  <div class="editor-layout">
    <SectionPalette {template} />
    <TemplateCanvas {template} />
  </div>

  <ThemeSelector bind:theme={$template.theme} />
  <PreviewPane {template} />
</div>
```

#### 2. **SectionPalette.svelte** (Left Sidebar)

```svelte
<script lang="ts">
  import { loadPresets } from './core/preset-loader';

  let presets = loadPresets();

  function applyPreset(presetId: string) {
    // Load preset and replace current template
  }

  function dragStart(event: DragEvent, sectionType: string) {
    event.dataTransfer.setData('section-type', sectionType);
  }
</script>

<aside class="section-palette">
  <h3>Presets</h3>
  <ul>
    {#each presets as preset}
      <li on:click={() => applyPreset(preset.id)}>
        {preset.name}
      </li>
    {/each}
  </ul>

  <h3>Add Section</h3>
  <ul class="draggable-sections">
    <li draggable="true" on:dragstart={(e) => dragStart(e, 'header')}>
      ⊕ Header
    </li>
    <li draggable="true" on:dragstart={(e) => dragStart(e, 'narrative')}>
      ⊕ Narrative
    </li>
    <li draggable="true" on:dragstart={(e) => dragStart(e, 'list')}>
      ⊕ List
    </li>
    <li draggable="true" on:dragstart={(e) => dragStart(e, 'table')}>
      ⊕ Table
    </li>
  </ul>

  <h3>Field Types</h3>
  <ul class="field-types">
    <li>• Text (prop)</li>
    <li>• Computed</li>
    <li>• AI Generated</li>
    <li>• Static</li>
  </ul>
</aside>
```

#### 3. **TemplateCanvas.svelte** (Main Editor Area)

```svelte
<script lang="ts">
  import type { TemplateDefinition, Section } from './contracts/types';
  import SectionEditor from './SectionEditor.svelte';

  export let template: TemplateDefinition;

  function handleDrop(event: DragEvent) {
    const sectionType = event.dataTransfer.getData('section-type');
    addSection(sectionType);
  }

  function addSection(type: string) {
    const newSection: Section = {
      id: generateId(),
      title: `New ${type}`,
      type: type as any,
      fields: [],
      order: template.structure.sections.length + 1
    };
    template.structure.sections.push(newSection);
    template = template;  // Trigger reactivity
  }

  function deleteSection(sectionId: string) {
    template.structure.sections = template.structure.sections.filter(
      s => s.id !== sectionId
    );
  }

  function moveSection(sectionId: string, direction: 'up' | 'down') {
    // Reorder sections
  }
</script>

<main
  class="template-canvas"
  on:drop|preventDefault={handleDrop}
  on:dragover|preventDefault
>
  {#each template.structure.sections as section (section.id)}
    <SectionEditor
      {section}
      on:delete={() => deleteSection(section.id)}
      on:move-up={() => moveSection(section.id, 'up')}
      on:move-down={() => moveSection(section.id, 'down')}
    />
  {/each}

  {#if template.structure.sections.length === 0}
    <div class="empty-state">
      <p>Drag sections from the palette to start building your template</p>
      <p>Or select a preset to get started quickly</p>
    </div>
  {/if}
</main>
```

#### 4. **FieldEditor.svelte** (Individual Field Configuration)

```svelte
<script lang="ts">
  import type { Field } from './contracts/types';

  export let field: Field;

  let showAdvanced = false;
</script>

<div class="field-editor">
  <div class="field-basic">
    <input bind:value={field.label} placeholder="Field Label" />

    <select bind:value={field.source}>
      <option value="prop">Property (Lookup)</option>
      <option value="computed">Computed</option>
      <option value="ai">AI Generated</option>
      <option value="static">Static</option>
    </select>
  </div>

  {#if field.source === 'prop'}
    <div class="field-config">
      <label>Data Path:</label>
      <input bind:value={field.dataPath} placeholder="patient.name" />
    </div>
  {/if}

  {#if field.source === 'computed'}
    <div class="field-config">
      <label>Computation Type:</label>
      <select bind:value={field.computation}>
        <option value="age-from-dob">Age from DOB</option>
        <option value="full-address">Full Address</option>
        <option value="full-name-with-credentials">Name with Credentials</option>
        <option value="score-delta">Score Delta</option>
        <option value="date-format">Date Format</option>
      </select>
    </div>
  {/if}

  {#if field.source === 'ai'}
    <div class="field-config">
      <label>AI Prompt:</label>
      <textarea bind:value={field.prompt} rows="3"></textarea>

      <label>Context (data to send to AI):</label>
      <div class="context-selector">
        {#each availableDataPaths as path}
          <label>
            <input
              type="checkbox"
              checked={field.context?.includes(path)}
              on:change={(e) => toggleContext(path, e.target.checked)}
            />
            {path}
          </label>
        {/each}
      </div>
    </div>
  {/if}

  {#if field.source === 'static'}
    <div class="field-config">
      <label>Static Value:</label>
      <textarea bind:value={field.staticValue} rows="2"></textarea>

      <p class="hint">
        Use {{'{{'}}variable{{'}}'}} for substitutions (e.g., {{'{{'}}patient.name{{'}}'}})
      </p>
    </div>
  {/if}

  <button on:click={() => showAdvanced = !showAdvanced}>
    {showAdvanced ? 'Hide' : 'Show'} Advanced Options
  </button>

  {#if showAdvanced}
    <div class="field-advanced">
      <label>
        <input type="checkbox" bind:checked={field.required} />
        Required
      </label>

      <label>
        Field Path:
        <input bind:value={field.path} placeholder="section.fieldName" />
      </label>

      <label>
        Field Type:
        <select bind:value={field.fieldType}>
          <option value="text">Text</option>
          <option value="number">Number</option>
          <option value="date">Date</option>
          <option value="list">List</option>
          <option value="object">Object</option>
        </select>
      </label>
    </div>
  {/if}
</div>
```

---

## Core Business Logic

### 1. Schema Builder (Converts UI → SimplGen Format)

```typescript
// visual-builder/core/schema-builder.ts

import type { TemplateDefinition, Field } from '../contracts/types';
import type { BiopsychNote } from '../../../template';  // Import from SimplGen

/**
 * Convert TemplateDefinition to SimplGen sourceMap and TypeScript interface
 */
export function buildSchemaFromTemplate(template: TemplateDefinition): {
  sourceMap: Record<string, any>;
  interface: string;  // TypeScript interface as string
} {
  const sourceMap: Record<string, any> = {};
  const interfaceFields: string[] = [];

  // Build nested structure from flat field list
  const structure: any = {};

  for (const section of template.structure.sections) {
    for (const field of section.fields) {
      // Add to sourceMap
      sourceMap[field.path] = buildSourceMapEntry(field);

      // Track for interface generation
      addToStructure(structure, field.path, field.fieldType);
    }
  }

  // Generate TypeScript interface
  const interfaceCode = generateInterface(template.name, structure);

  return { sourceMap, interface: interfaceCode };
}

function buildSourceMapEntry(field: Field): any {
  const entry: any = { source: field.source };

  switch (field.source) {
    case 'prop':
      entry.dataPath = field.dataPath;
      break;

    case 'computed':
      entry.dataPath = field.dataPath;
      entry.computation = field.computation;
      entry.computationConfig = field.computationConfig;
      break;

    case 'ai':
      entry.prompt = field.prompt;
      entry.context = field.context || [];
      break;

    case 'static':
      entry.staticValue = field.staticValue;
      entry.staticTemplate = field.staticTemplate;
      break;
  }

  return entry;
}

function addToStructure(structure: any, path: string, fieldType: string): void {
  const parts = path.split('.');
  let current = structure;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!current[part]) {
      current[part] = {};
    }
    current = current[part];
  }

  const lastPart = parts[parts.length - 1];
  current[lastPart] = mapFieldTypeToTS(fieldType);
}

function mapFieldTypeToTS(fieldType: string): string {
  switch (fieldType) {
    case 'text': return 'string';
    case 'number': return 'number';
    case 'date': return 'string';
    case 'list': return 'any[]';
    case 'object': return 'any';
    default: return 'any';
  }
}

function generateInterface(name: string, structure: any, indent = 0): string {
  const spaces = '  '.repeat(indent);
  let code = '';

  if (indent === 0) {
    code += `export interface ${toPascalCase(name)}Note {\n`;
  }

  for (const [key, value] of Object.entries(structure)) {
    if (typeof value === 'object' && !Array.isArray(value)) {
      code += `${spaces}  ${key}: {\n`;
      code += generateInterface(name, value, indent + 1);
      code += `${spaces}  };\n`;
    } else {
      code += `${spaces}  ${key}: ${value};\n`;
    }
  }

  if (indent === 0) {
    code += '}';
  }

  return code;
}

function toPascalCase(str: string): string {
  return str
    .split(/[\s-_]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}
```

### 2. Template Manager (CRUD Operations)

```typescript
// visual-builder/core/template-manager.ts

import type { TemplateDefinition } from '../contracts/types';
import { DatabaseAdapter } from '../adapters/database-adapter';

export class TemplateManager {
  constructor(private db: DatabaseAdapter) {}

  /**
   * Load all templates for an organization
   */
  async listTemplates(orgId?: string): Promise<TemplateDefinition[]> {
    const query = orgId
      ? { organizationId: orgId }
      : { organizationId: null };  // Global presets

    return await this.db.query('templates', query);
  }

  /**
   * Load a specific template
   */
  async getTemplate(templateId: string): Promise<TemplateDefinition | null> {
    return await this.db.findById('templates', templateId);
  }

  /**
   * Create new template
   */
  async createTemplate(template: Omit<TemplateDefinition, 'id' | 'metadata'>): Promise<TemplateDefinition> {
    const now = new Date().toISOString();

    const newTemplate: TemplateDefinition = {
      ...template,
      id: generateId(),
      metadata: {
        createdAt: now,
        createdBy: getCurrentUser(),
        updatedAt: now,
        updatedBy: getCurrentUser()
      }
    };

    await this.db.insert('templates', newTemplate);
    return newTemplate;
  }

  /**
   * Update existing template
   */
  async updateTemplate(templateId: string, updates: Partial<TemplateDefinition>): Promise<TemplateDefinition> {
    const existing = await this.getTemplate(templateId);
    if (!existing) {
      throw new Error(`Template ${templateId} not found`);
    }

    const updated: TemplateDefinition = {
      ...existing,
      ...updates,
      metadata: {
        ...existing.metadata,
        updatedAt: new Date().toISOString(),
        updatedBy: getCurrentUser()
      }
    };

    await this.db.update('templates', templateId, updated);
    return updated;
  }

  /**
   * Delete template
   */
  async deleteTemplate(templateId: string): Promise<void> {
    await this.db.delete('templates', templateId);
  }

  /**
   * Clone template (for customization)
   */
  async cloneTemplate(templateId: string, newName: string): Promise<TemplateDefinition> {
    const original = await this.getTemplate(templateId);
    if (!original) {
      throw new Error(`Template ${templateId} not found`);
    }

    const clone = {
      ...original,
      name: newName,
      id: undefined,
      metadata: undefined
    };

    return await this.createTemplate(clone as any);
  }
}

function generateId(): string {
  return `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getCurrentUser(): string {
  // Get from auth context
  return 'current-user-id';
}
```

### 3. Theme Manager

```typescript
// visual-builder/core/theme-manager.ts

import type { ThemeConfig } from '../contracts/types';

export const PRESET_THEMES: ThemeConfig[] = [
  {
    id: 'default-clean',
    name: 'Clean Professional',
    css: `
      body {
        font-family: 'Open Sans', sans-serif;
        font-size: 10pt;
        color: #1a1a1a;
        line-height: 1.6;
      }
      .section {
        margin-bottom: 25px;
        padding-bottom: 15px;
        border-bottom: 1px solid #e5e7eb;
      }
      .section-title {
        font-size: 14pt;
        font-weight: 600;
        margin-bottom: 15px;
        color: #111827;
      }
      .chief-complaint {
        background-color: #fef3c7;
        border-left: 4px solid #f59e0b;
        padding: 15px 20px;
        margin-bottom: 20px;
      }
    `,
    customizations: {
      fontFamily: 'Open Sans, sans-serif',
      fontSize: '10pt',
      primaryColor: '#1a1a1a',
      accentColor: '#f59e0b',
      headerStyle: 'grid',
      sectionBorders: true,
      spacing: 'normal'
    }
  },
  {
    id: 'default-compact',
    name: 'Compact',
    css: `
      body {
        font-family: Arial, sans-serif;
        font-size: 11pt;
        color: #000;
        line-height: 1.4;
      }
      .section {
        margin-bottom: 15px;
      }
      .section-title {
        font-size: 12pt;
        font-weight: bold;
        margin-bottom: 8px;
      }
    `,
    customizations: {
      fontFamily: 'Arial, sans-serif',
      fontSize: '11pt',
      primaryColor: '#000000',
      accentColor: '#333333',
      headerStyle: 'inline',
      sectionBorders: false,
      spacing: 'compact'
    }
  },
  {
    id: 'default-formal',
    name: 'Formal Document',
    css: `
      body {
        font-family: 'Times New Roman', serif;
        font-size: 12pt;
        color: #000;
        line-height: 1.8;
      }
      .section {
        margin-bottom: 30px;
        padding-bottom: 20px;
        border-bottom: 2px solid #000;
      }
      .section-title {
        font-size: 14pt;
        font-weight: bold;
        text-transform: uppercase;
        margin-bottom: 20px;
      }
    `,
    customizations: {
      fontFamily: 'Times New Roman, serif',
      fontSize: '12pt',
      primaryColor: '#000000',
      accentColor: '#000000',
      headerStyle: 'stacked',
      sectionBorders: true,
      spacing: 'relaxed'
    }
  }
];

export class ThemeManager {
  /**
   * Get all available themes
   */
  getThemes(): ThemeConfig[] {
    return PRESET_THEMES;
  }

  /**
   * Apply theme customizations to base CSS
   */
  applyCustomizations(theme: ThemeConfig): string {
    let css = theme.css;
    const custom = theme.customizations;

    if (!custom) return css;

    // Replace font family
    if (custom.fontFamily) {
      css = css.replace(/font-family: [^;]+;/g, `font-family: ${custom.fontFamily};`);
    }

    // Replace font size
    if (custom.fontSize) {
      css = css.replace(/font-size: \d+pt;/g, `font-size: ${custom.fontSize};`);
    }

    // Replace colors
    if (custom.primaryColor) {
      css = css.replace(/#1a1a1a/g, custom.primaryColor);
    }
    if (custom.accentColor) {
      css = css.replace(/#f59e0b/g, custom.accentColor);
    }

    return css;
  }

  /**
   * Create custom theme
   */
  createCustomTheme(baseThemeId: string, customizations: any): ThemeConfig {
    const baseTheme = PRESET_THEMES.find(t => t.id === baseThemeId);
    if (!baseTheme) {
      throw new Error(`Base theme ${baseThemeId} not found`);
    }

    return {
      id: `custom-${Date.now()}`,
      name: 'Custom Theme',
      css: baseTheme.css,
      customizations: {
        ...baseTheme.customizations,
        ...customizations
      }
    };
  }
}
```

---

## Integration with SimplGen

### Adapter Pattern

```typescript
// visual-builder/adapters/simplegen-adapter.ts

import { generateNote } from '../../../generator';
import { renderToHTML } from '../../../renderer';
import { buildSchemaFromTemplate } from '../core/schema-builder';
import type { TemplateDefinition } from '../contracts/types';

export class SimplGenAdapter {
  /**
   * Generate a note using a custom template
   */
  async generateNoteFromTemplate(
    template: TemplateDefinition,
    inputData: any
  ): Promise<{ note: any; html: string }> {
    // Step 1: Build sourceMap from template
    const { sourceMap, interface: _ } = buildSchemaFromTemplate(template);

    // Step 2: Use SimplGen engine with custom sourceMap
    // (We'd need to modify generator.ts to accept sourceMap as parameter)
    const note = await generateNoteWithCustomMap(inputData, sourceMap);

    // Step 3: Render with custom theme
    const html = renderWithTheme(note, template.theme);

    return { note, html };
  }

  /**
   * Test template with sample data
   */
  async testTemplate(template: TemplateDefinition): Promise<string> {
    const sampleData = generateSampleData(template);
    const { html } = await this.generateNoteFromTemplate(template, sampleData);
    return html;
  }
}

/**
 * Modified generator that accepts custom sourceMap
 */
async function generateNoteWithCustomMap(data: any, sourceMap: Record<string, any>): Promise<any> {
  // Same logic as generator.ts but uses passed-in sourceMap
  // instead of importing from template.ts

  const { prefillObject, buildAiOnlySchema, deepMerge } = await import('../../../engine');

  const prefilled = prefillObject(sourceMap, data);
  const aiSchema = buildAiOnlySchema(sourceMap);

  // ... rest of generation logic

  return prefilled;  // Simplified for example
}

/**
 * Render with custom theme
 */
function renderWithTheme(note: any, theme: ThemeConfig): string {
  const themeManager = new ThemeManager();
  const css = themeManager.applyCustomizations(theme);

  // Use renderer.ts but inject custom CSS
  const html = renderToHTML(note);
  return html.replace(/<style>.*<\/style>/s, `<style>${css}</style>`);
}

function generateSampleData(template: TemplateDefinition): any {
  // Generate realistic sample data based on template fields
  // This would be used for preview/testing
  return {
    patient: {
      name: 'Sample Patient',
      dateOfBirth: '1990-01-01',
      pronouns: 'they/them'
    },
    // ... more sample data
  };
}
```

---

## Database Schema

```sql
-- Templates table
CREATE TABLE templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,  -- 'soap', 'dap', 'biopsych', etc.
  version INTEGER DEFAULT 1,
  organization_id TEXT,  -- NULL for global presets

  -- JSON columns
  structure JSONB NOT NULL,  -- TemplateStructure
  theme JSONB NOT NULL,      -- ThemeConfig
  metadata JSONB NOT NULL,   -- Created/updated info

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Indexes
  FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

CREATE INDEX idx_templates_org ON templates(organization_id);
CREATE INDEX idx_templates_type ON templates(type);

-- Template usage tracking (analytics)
CREATE TABLE template_usage (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL,
  organization_id TEXT,
  user_id TEXT,
  generated_at TIMESTAMP DEFAULT NOW(),

  FOREIGN KEY (template_id) REFERENCES templates(id),
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

## Workflow Example

### User Creates Custom SOAP Note

1. **User clicks "New Template"**
   - UI shows template builder with empty canvas

2. **User selects SOAP preset**
   - System loads SOAP_PRESET definition
   - Canvas populates with Subjective, Objective, Assessment, Plan sections

3. **User customizes Subjective section**
   - Clicks "Add Field" in Subjective
   - Selects "AI Generated" field type
   - Fills in:
     - Label: "Review of Systems"
     - Prompt: "Summarize pertinent positive and negative findings across body systems"
     - Context: Checks boxes for `clinicalIntake.rosData`, `vitals`, `chiefComplaint`
   - Field is added to section

4. **User adjusts theme**
   - Selects "Compact" theme from dropdown
   - Changes font to Arial
   - Changes accent color to blue
   - Preview updates in real-time

5. **User clicks "Save"**
   - System calls `templateManager.createTemplate()`
   - Template saved to database
   - Available for use in note generation

6. **User clicks "Test"**
   - System generates sample data
   - Calls `simplgenAdapter.testTemplate()`
   - Shows full HTML preview in new tab
   - User verifies output looks correct

7. **User generates real notes**
   - In main app, user selects "My Custom SOAP" template
   - Fills out patient intake
   - Clicks "Generate Note"
   - System calls `simplgenAdapter.generateNoteFromTemplate(template, patientData)`
   - Note generated and displayed

---

## Benefits of This Architecture

### 1. **Separation of Concerns**
- UI (visual builder) completely separate from engine (SimplGen)
- Templates are just data - can be created via UI OR programmatically
- Themes are just CSS - can be swapped without touching logic

### 2. **Reusability**
- Same SimplGen engine works for any template
- Presets can be cloned and customized
- Themes can be shared across templates

### 3. **Flexibility**
- Orgs can create custom templates without code
- Can mix static, prop, computed, and AI fields in any combination
- Templates are versioned - can iterate without breaking existing notes

### 4. **Scalability**
- Templates stored in DB - unlimited number
- Template usage tracking - analytics on what's popular
- Can build template marketplace (org shares templates)

### 5. **Maintainability**
- SimplGen engine stays simple - no template-specific logic
- Bug fixes to engine benefit ALL templates automatically
- Visual builder is separate app - can update independently

---

## Next Steps for Implementation

### Phase 1: Core Template System
1. Define TypeScript types (contracts/types.ts)
2. Build schema-builder.ts (convert template → sourceMap)
3. Build template-manager.ts (CRUD operations)
4. Update generator.ts to accept custom sourceMap
5. Create database migrations

### Phase 2: Visual Builder UI
1. Create TemplateEditor.svelte (main container)
2. Create SectionPalette.svelte (drag source)
3. Create TemplateCanvas.svelte (drop target)
4. Create FieldEditor.svelte (field configuration)
5. Wire up drag-and-drop

### Phase 3: Presets & Themes
1. Define SOAP, DAP, TX Plan presets
2. Create preset-loader.ts
3. Build theme-manager.ts
4. Create 3 default themes (Clean, Compact, Formal)
5. Add theme customization UI

### Phase 4: Preview & Testing
1. Create PreviewPane.svelte
2. Build sample data generator
3. Integrate with SimplGen adapter
4. Add "Test Template" functionality
5. Add export to PDF

### Phase 5: Advanced Features
1. Template versioning
2. Template sharing/marketplace
3. Usage analytics
4. Template validation
5. Undo/redo in editor
6. Template import/export (JSON)

---

## Conclusion

The visual template builder is a **natural extension** of SimplGen's architecture. By treating templates as data (sourceMap + schema), we can build a UI that lets users create templates without writing code.

**Key insight:** SimplGen's simplicity is what enables this complexity. Because the engine is just "prefill + AI + merge + render", we can point it at ANY template structure and it works.

This is the power of good architecture. 🚀
