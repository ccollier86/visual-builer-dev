/**
 * SimplGen Template for Biopsychosocial Intake Note
 *
 * Defines:
 * 1. Final output schema (complete structure)
 * 2. Source map (which fields are prop/computed/ai)
 * 3. Prompts for AI-generated sections
 */

export interface BiopsychNote {
  header: {
    patient: {
      name: string;
      age: number;
      dob: string;
      pronouns: string;
    };
    facility: {
      name: string;
      address: string;
      phone: string;
    };
    encounter: {
      date: string;
      time: string;
      type: string;
      provider: string;
      supervisor: string;
    };
  };
  chiefComplaint: string;
  subjective: {
    historyOfPresentIllness: string;
    pastPsychiatricHistory: string;
    previousMedications: string;
    currentMedications: string;
    familyPsychiatricHistory: string;
    medicalHistory: string;
    socialHistory: string;
    substanceUseHistory: string;
  };
  objective: {
    mentalStatusExam: {
      appearance: string;
      behavior: string;
      speech: string;
      mood: string;
      affect: string;
      thoughtProcess: string;
      thoughtContent: string;
      perceptions: string;
      cognition: string;
      insight: string;
      judgment: string;
    };
    functionalAssessment: string;
    assessmentScores: {
      phq9: { score: number; severity: string };
      gad7: { score: number; severity: string };
      ace: { score: number };
      audit: { score: number; risk: string };
      dast10: { score: number; risk: string };
    };
  };
  assessment: {
    clinicalFormulation: string;
    riskAssessment: string;
    prognosis: string;
    diagnosticImpressions: Array<{
      icd10: string;
      dsm5: string;
      description: string;
      criteria: string;
    }>;
  };
  plan: {
    interventionsRecommended: string[];
    coordinationOfCare: {
      intro: string;
      items: string[];
    };
    followUpPlan: string[];
    crisisSafetyPlan: {
      items: string[];
      reasonsForLiving: string;
    };
  };
}

export type Source = "prop" | "computed" | "ai";

export interface SourceMapEntry {
  source: Source;
  dataPath?: string;  // For prop/computed
  prompt?: string;    // For AI
  context?: string[]; // Data paths AI should see
}

export const sourceMap: Record<string, SourceMapEntry> = {
  // HEADER - All props/computed
  "header.patient.name": { source: "prop", dataPath: "patient.name" },
  "header.patient.age": { source: "computed", dataPath: "patient.age" },
  "header.patient.dob": { source: "prop", dataPath: "patient.dateOfBirth" },
  "header.patient.pronouns": { source: "computed", dataPath: "patient.pronouns.display" },
  "header.facility.name": { source: "prop", dataPath: "facility.name" },
  "header.facility.address": { source: "computed", dataPath: "facility.address" },
  "header.facility.phone": { source: "prop", dataPath: "facility.contactInfo.phone" },
  "header.encounter.date": { source: "prop", dataPath: "encounter.date" },
  "header.encounter.time": { source: "prop", dataPath: "encounter.time" },
  "header.encounter.type": { source: "prop", dataPath: "encounter.type" },
  "header.encounter.provider": { source: "computed", dataPath: "provider.name" },
  "header.encounter.supervisor": { source: "computed", dataPath: "supervisor.name" },

  // CHIEF COMPLAINT - AI
  "chiefComplaint": {
    source: "ai",
    prompt: "Format the patient's chief complaint as a direct quote. Use the patient's own words. Keep it concise (1-2 sentences). Do NOT add quotation marks - just the text.",
    context: ["clinicalIntake.structured.chiefComplaint"]
  },

  // SUBJECTIVE - All AI narratives
  "subjective.historyOfPresentIllness": {
    source: "ai",
    prompt: "Write a comprehensive History of Present Illness. Include: onset and duration of symptoms, severity and frequency, precipitating factors, how symptoms impact daily functioning, what the patient has tried, and current status. Write 6-8 detailed sentences in professional clinical narrative style.",
    context: [
      "patientIntake.narrative",
      "clinicalIntake.qaText",
      "clinicalIntake.structured.chiefComplaint",
      "clinicalIntake.structured.currentSymptoms"
    ]
  },

  "subjective.pastPsychiatricHistory": {
    source: "ai",
    prompt: "Summarize the patient's past psychiatric history. Include: previous diagnoses, past treatment (therapy/medications), hospitalizations or crisis interventions, and outcomes. Write 5-7 sentences in clinical narrative style.",
    context: [
      "patientIntake.structured.psychiatric_history",
      "clinicalIntake.structured.treatmentHistory"
    ]
  },

  "subjective.previousMedications": {
    source: "ai",
    prompt: "Describe previously trialed psychiatric medications. For each medication mentioned, include: medication name, approximate dates if known, dosage if provided, reason for discontinuation or outcome. Write as a flowing narrative paragraph.",
    context: [
      "clinicalIntake.structured.medications.previous"
    ]
  },

  "subjective.currentMedications": {
    source: "ai",
    prompt: "List current psychiatric medications. Include medication names, dosages, frequency, and how long the patient has been taking each. Write as a narrative paragraph listing each medication clearly.",
    context: [
      "clinicalIntake.structured.medications.current"
    ]
  },

  "subjective.familyPsychiatricHistory": {
    source: "ai",
    prompt: "Summarize family psychiatric history. Include: which family members have had mental health or substance use issues, diagnoses if known, treatments, and any family patterns. Write 4-6 sentences.",
    context: [
      "patientIntake.structured.family_history"
    ]
  },

  "subjective.medicalHistory": {
    source: "ai",
    prompt: "Summarize relevant medical history. Include: chronic conditions, major illnesses or surgeries, current medical treatments, and any medical issues that impact mental health. Write 4-6 sentences.",
    context: [
      "patientIntake.structured.medical_history",
      "clinicalIntake.structured.medicalHistory"
    ]
  },

  "subjective.socialHistory": {
    source: "ai",
    prompt: "Provide comprehensive social history. Include: living situation, relationships/support system, education and employment, cultural background, daily routines, hobbies/interests, financial stressors, and legal issues if any. Write 5-7 sentences.",
    context: [
      "patientIntake.structured.social_history",
      "clinicalIntake.structured.dailyLife"
    ]
  },

  "subjective.substanceUseHistory": {
    source: "ai",
    prompt: "Describe substance use history in detail. For each substance: type, frequency of current use, history of use, age of first use, periods of abstinence, and impact on life. Include tobacco, alcohol, cannabis, and other substances. Write 5-7 sentences.",
    context: [
      "patientIntake.structured.substance_use",
      "assessments.AUDIT",
      "assessments.DAST10"
    ]
  },

  // OBJECTIVE - Mixed (MSE is props if provided, AI if missing; scores are props; functional is AI)
  "objective.mentalStatusExam.appearance": { source: "prop", dataPath: "clinicalIntake.structured.mentalStatusExam.appearance" },
  "objective.mentalStatusExam.behavior": { source: "prop", dataPath: "clinicalIntake.structured.mentalStatusExam.behavior" },
  "objective.mentalStatusExam.speech": { source: "prop", dataPath: "clinicalIntake.structured.mentalStatusExam.speech" },
  "objective.mentalStatusExam.mood": { source: "prop", dataPath: "clinicalIntake.structured.mentalStatusExam.mood" },
  "objective.mentalStatusExam.affect": { source: "prop", dataPath: "clinicalIntake.structured.mentalStatusExam.affect" },
  "objective.mentalStatusExam.thoughtProcess": { source: "prop", dataPath: "clinicalIntake.structured.mentalStatusExam.thoughtProcess" },
  "objective.mentalStatusExam.thoughtContent": { source: "prop", dataPath: "clinicalIntake.structured.mentalStatusExam.thoughtContent" },
  "objective.mentalStatusExam.perceptions": { source: "prop", dataPath: "clinicalIntake.structured.mentalStatusExam.perceptions" },
  "objective.mentalStatusExam.cognition": { source: "prop", dataPath: "clinicalIntake.structured.mentalStatusExam.cognition" },
  "objective.mentalStatusExam.insight": { source: "prop", dataPath: "clinicalIntake.structured.mentalStatusExam.insight" },
  "objective.mentalStatusExam.judgment": { source: "prop", dataPath: "clinicalIntake.structured.mentalStatusExam.judgment" },

  "objective.functionalAssessment": {
    source: "ai",
    prompt: "Describe the patient's current functional status. Include: ability to work/attend school, maintain relationships, perform self-care, manage daily tasks, and overall level of independence. Reference specific examples from the intake. Write 4-6 sentences.",
    context: [
      "clinicalIntake.structured.currentSymptoms.workImpact",
      "clinicalIntake.structured.currentSymptoms.relationshipImpact",
      "clinicalIntake.structured.currentSymptoms.selfCareImpact",
      "clinicalIntake.structured.dailyLife"
    ]
  },

  "objective.assessmentScores.phq9.score": { source: "prop", dataPath: "assessments.PHQ9.totalScore" },
  "objective.assessmentScores.phq9.severity": { source: "prop", dataPath: "assessments.PHQ9.severity" },
  "objective.assessmentScores.gad7.score": { source: "prop", dataPath: "assessments.GAD7.totalScore" },
  "objective.assessmentScores.gad7.severity": { source: "prop", dataPath: "assessments.GAD7.severity" },
  "objective.assessmentScores.ace.score": { source: "prop", dataPath: "assessments.ACE.totalScore" },
  "objective.assessmentScores.audit.score": { source: "prop", dataPath: "assessments.AUDIT.totalScore" },
  "objective.assessmentScores.audit.risk": { source: "prop", dataPath: "assessments.AUDIT.interpretation" },
  "objective.assessmentScores.dast10.score": { source: "prop", dataPath: "assessments.DAST10.totalScore" },
  "objective.assessmentScores.dast10.risk": { source: "prop", dataPath: "assessments.DAST10.interpretation" },

  // ASSESSMENT - All AI except diagnoses which need special handling
  "assessment.clinicalFormulation": {
    source: "ai",
    prompt: "Write a comprehensive clinical formulation. Integrate: presenting problems, psychiatric/medical history, current symptoms, psychosocial factors, assessment scores, protective factors, and clinical impressions. Explain the clinical picture and how factors interact. Write 8-12 sentences in detailed clinical narrative.",
    context: [
      "clinicalIntake.structured.chiefComplaint",
      "clinicalIntake.structured.currentSymptoms",
      "clinicalIntake.structured.clinicalImpressions",
      "assessments.PHQ9",
      "assessments.GAD7",
      "assessments.ACE"
    ]
  },

  "assessment.riskAssessment": {
    source: "ai",
    prompt: "Provide a detailed risk assessment. Address: suicidal ideation/intent/plan, homicidal ideation, self-harm behaviors, substance use risks, safety concerns, protective factors, and overall risk level. Be specific and thorough. Write 6-8 sentences.",
    context: [
      "clinicalIntake.structured.currentSymptoms",
      "clinicalIntake.structured.treatmentHistory",
      "patientIntake.structured.trauma_history",
      "assessments.PHQ9.responses"
    ]
  },

  "assessment.prognosis": {
    source: "ai",
    prompt: "Provide a clinical prognosis. Consider: patient's strengths and motivation, support system, previous treatment response, current engagement, barriers to treatment, and realistic treatment goals. Write 4-6 sentences with cautious optimism.",
    context: [
      "clinicalIntake.structured.goals",
      "clinicalIntake.structured.strengths",
      "patientIntake.structured.social_history"
    ]
  },

  "assessment.diagnosticImpressions": {
    source: "ai",
    prompt: "Map the provided DSM-5 diagnoses to ICD-10 codes and provide supporting diagnostic criteria. For EACH diagnosis: provide ICD-10 code, keep the exact DSM-5 code and description provided, and list 3-4 key diagnostic criteria that support this diagnosis based on the clinical presentation.",
    context: [
      "clinicalIntake.structured.diagnoses",  // This has the DSM-5 codes from clinician
      "clinicalIntake.structured.currentSymptoms",
      "clinicalIntake.structured.treatmentHistory"
    ]
  },

  // PLAN - Mostly static with some computed/AI
  "plan.interventionsRecommended": {
    source: "computed",
    dataPath: "plan.interventions.standard"  // Will be hardcoded in generator
  },

  "plan.coordinationOfCare.intro": {
    source: "computed",
    dataPath: "plan.coordination.intro"  // Computed with patient name/pronouns
  },

  "plan.coordinationOfCare.items": {
    source: "computed",
    dataPath: "plan.coordination.items"  // Computed with pronouns
  },

  "plan.followUpPlan": {
    source: "computed",
    dataPath: "plan.followUp.items"  // Hardcoded items with pronouns
  },

  "plan.crisisSafetyPlan.items": {
    source: "computed",
    dataPath: "plan.crisis.items"  // Hardcoded items with pronouns
  },

  "plan.crisisSafetyPlan.reasonsForLiving": {
    source: "ai",
    prompt: "Based on the patient's stated goals, strengths, relationships, and what matters to them, write 2-3 personalized 'Reasons for Living'. These should reflect what the patient specifically values and looks forward to. Format as a natural sentence listing these reasons.",
    context: [
      "clinicalIntake.structured.goals",
      "clinicalIntake.structured.strengths",
      "patientIntake.structured.social_history",
      "patientIntake.structured.concerns"
    ]
  }
};

export const template = {
  name: "Biopsychosocial Intake",
  version: "1.0.0",
  sourceMap
};
