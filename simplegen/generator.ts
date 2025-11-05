/**
 * SimplGen Generator - Main Orchestrator
 *
 * Coordinates the complete note generation process:
 * 1. Prefill props & computed
 * 2. Generate AI content
 * 3. Handle diagnosis mapping
 * 4. Fill static Plan sections
 * 5. Merge everything
 */

import OpenAI from 'openai';
import type { BiopsychNote } from './template';
import { sourceMap } from './template';
import { prefillObject, buildAiOnlySchema, deepMerge } from './engine';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Build context string for AI from relevant data paths
 */
function buildContext(data: any, contextPaths: string[]): string {
  const contextParts: string[] = [];

  for (const path of contextPaths) {
    const value = getByPath(data, path);
    if (value) {
      if (typeof value === 'string') {
        contextParts.push(value);
      } else if (typeof value === 'object') {
        contextParts.push(JSON.stringify(value, null, 2));
      }
    }
  }

  return contextParts.join('\n\n');
}

function getByPath(obj: any, path: string): any {
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (!current) return undefined;
    current = current[part];
  }
  return current;
}

/**
 * Build targeted prompts using context arrays from sourceMap
 */
function buildPrompt(data: any): any[] {
  const messages: any[] = [
    {
      role: "system",
      content: `You are an expert clinical documentation assistant. Generate comprehensive, professional biopsychosocial intake note sections based on the provided patient data.

Guidelines:
- Write in professional clinical narrative style
- Use third-person perspective
- Be thorough and detailed
- Reference specific information from the data
- Maintain HIPAA-appropriate language
- Do NOT include any patient identifying information you weren't explicitly given
- Follow the exact structure requested`
    }
  ];

  // Build targeted context using sourceMap context arrays
  const promptSections: string[] = [];

  // Collect all AI fields and their contexts
  const aiFields = Object.entries(sourceMap).filter(([_, entry]) => entry.source === 'ai');

  // Build field-specific prompts with targeted context
  for (const [fieldPath, entry] of aiFields) {
    if (entry.prompt && entry.context) {
      const contextData = buildContext(data, entry.context);
      if (contextData) {
        promptSections.push(
          `\n=== ${fieldPath} ===`,
          `Instructions: ${entry.prompt}`,
          `Relevant Data:\n${contextData}`
        );
      }
    }
  }

  // Also include general patient info for pronoun usage
  const patientPronouns = data.patient?.pronouns || 'they/them';
  const patientName = data.patient?.name || 'the patient';

  messages.push({
    role: "user",
    content: `Patient: ${patientName} (${patientPronouns})

${promptSections.join('\n')}

Generate all narrative sections according to their specific instructions above. Use appropriate pronouns throughout.`
  });

  return messages;
}

/**
 * Generate static Plan sections with pronoun substitution
 */
function generatePlanSections(data: any): any {
  const pronouns = data.patient.pronouns;
  const name = data.patient.name.split(' ')[0]; // First name

  return {
    interventionsRecommended: [
      `Individual psychotherapy (60 minutes weekly) utilizing evidence-based modalities tailored to ${pronouns.possessive} presenting concerns`,
      `Psychiatric medication management as clinically indicated, with careful monitoring of efficacy and side effects`,
      `Care coordination with ${pronouns.possessive} primary care physician and any other treating providers`,
      `Psychoeducation regarding diagnosed conditions, treatment options, and self-management strategies`,
      `Development and regular review of safety planning and crisis management strategies`,
      `Referral to adjunctive services as needed (e.g., support groups, case management, intensive outpatient programs)`
    ],
    coordinationOfCare: {
      intro: `To ensure comprehensive and integrated care, the following coordination efforts are recommended for ${name}:`,
      items: [
        `Obtain release of information and coordinate with ${pronouns.possessive} primary care physician regarding medical conditions and medications`,
        `Communicate with previous mental health providers (with appropriate releases) to obtain treatment history and records`,
        `Collaborate with ${pronouns.possessive} support system and family members as appropriate and with ${pronouns.possessive} consent`
      ]
    },
    followUpPlan: [
      `${name} will schedule weekly individual therapy sessions to address presenting concerns and treatment goals`,
      `Medication evaluation will be scheduled if clinically indicated based on symptom severity and treatment response`,
      `${pronouns.subject} will complete regular symptom monitoring (PHQ-9, GAD-7) to track treatment progress`,
      `Safety planning will be reviewed and updated as needed throughout treatment`,
      `${name} will work on identified treatment goals between sessions and report progress`,
      `Treatment plan will be reviewed and adjusted every 90 days or as clinically indicated`,
      `${pronouns.subject} will contact the crisis line or present to emergency services if ${pronouns.subject} experiences acute safety concerns`,
      `Insurance authorization for continued treatment will be obtained as needed`,
      `${name} agrees to actively participate in treatment and communicate any concerns about ${pronouns.possessive} care`
    ],
    crisisSafetyPlan: {
      items: [
        `Warning signs ${name} should watch for: [increased depression/anxiety, worsening sleep, social withdrawal, thoughts of self-harm]`,
        `Internal coping strategies: [deep breathing, grounding techniques, self-soothing activities, physical exercise]`,
        `Social contacts for support: [family members, friends, support group members]`,
        `Professional contacts: Therapist, psychiatrist, primary care physician`,
        `24/7 Crisis Resources: 988 Suicide & Crisis Lifeline, Crisis Text Line (text HOME to 741741)`,
        `Local emergency services: 911 or nearest emergency department`,
        `Remove/restrict access to lethal means during times of crisis`
      ]
    }
  };
}

/**
 * Main generation function
 */
export async function generateNote(data: any): Promise<BiopsychNote> {
  console.log('Step 1: Prefilling prop and computed fields...');
  const prefilled = prefillObject(sourceMap, data) as any;

  console.log('Step 2: Generating static Plan sections...');
  const planSections = generatePlanSections(data);
  prefilled.plan = {
    ...prefilled.plan,
    ...planSections
  };

  console.log('Step 3: Building AI-only schema...');
  const aiSchema = buildAiOnlySchema(sourceMap);

  console.log('Step 4: Calling OpenAI for narrative sections...');
  const messages = buildPrompt(data);

  const response = await openai.chat.completions.create({
    model: "gpt-4o-2024-08-06",
    messages: messages,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "biopsych_note",
        strict: true,
        schema: aiSchema
      }
    },
    temperature: 0.7
  });

  const aiContent = response.choices[0]?.message?.content;
  if (!aiContent) {
    throw new Error('No content returned from OpenAI');
  }

  const aiResult = JSON.parse(aiContent);
  console.log('Generated AI content successfully');

  console.log('Step 5: Handling diagnosis mapping...');
  // Check if clinician provided diagnoses
  if (data.clinicalIntake?.structured?.diagnoses?.length > 0) {
    const clinicianDiagnoses = data.clinicalIntake.structured.diagnoses;

    // Build diagnosis mapping prompt
    const diagnosisPrompt = `Map the following DSM-5 diagnoses to ICD-10 codes and provide supporting criteria:

${clinicianDiagnoses.map((d: any, i: number) => `${i + 1}. ${d.code}: ${d.description}`).join('\n')}

For each diagnosis, provide:
- ICD-10 code
- Keep the exact DSM-5 code and description
- List 3-4 key diagnostic criteria that support this diagnosis

Based on this patient presentation:
${JSON.stringify(data.clinicalIntake.structured.currentSymptoms, null, 2)}`;

    const diagnosisResponse = await openai.chat.completions.create({
      model: "gpt-4o-2024-08-06",
      messages: [
        {
          role: "system",
          content: "You are a clinical expert in psychiatric diagnosis codes and criteria. Map DSM-5 diagnoses to ICD-10 codes accurately and provide supporting diagnostic criteria."
        },
        {
          role: "user",
          content: diagnosisPrompt
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "diagnosis_mapping",
          strict: true,
          schema: {
            type: "object",
            properties: {
              diagnosticImpressions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    icd10: { type: "string" },
                    dsm5: { type: "string" },
                    description: { type: "string" },
                    criteria: { type: "string" }
                  },
                  required: ["icd10", "dsm5", "description", "criteria"],
                  additionalProperties: false
                }
              }
            },
            required: ["diagnosticImpressions"],
            additionalProperties: false
          }
        }
      }
    });

    const diagnosisContent = diagnosisResponse.choices[0]?.message?.content;
    if (diagnosisContent) {
      const mappedDiagnoses = JSON.parse(diagnosisContent);
      aiResult.assessment = aiResult.assessment || {};
      aiResult.assessment.diagnosticImpressions = mappedDiagnoses.diagnosticImpressions;
    }
  }

  console.log('Step 6: Merging all sections...');
  const complete = deepMerge(prefilled, aiResult) as BiopsychNote;

  console.log('Note generation complete!');
  return complete;
}
