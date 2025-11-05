/**
 * SimplGen Renderer - HTML Output Generation
 *
 * Renders BiopsychNote to HTML matching reference formatting
 */

import type { BiopsychNote } from './template';

const CSS = `
<style>
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: 'Open Sans', 'Segoe UI', Arial, sans-serif;
    font-size: 10pt;
    line-height: 1.4;
    color: #1a1a1a;
    padding: 20px;
    max-width: 8.5in;
    margin: 0 auto;
  }

  .header-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 20px;
    margin-bottom: 20px;
    padding-bottom: 15px;
    border-bottom: 2px solid #e5e7eb;
  }

  .header-section h2 {
    font-size: 11pt;
    font-weight: 600;
    color: #374151;
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .header-section p {
    margin: 3px 0;
    color: #4b5563;
  }

  .chief-complaint {
    background: #fef3c7;
    border-left: 4px solid #f59e0b;
    padding: 12px 16px;
    margin-bottom: 24px;
    border-radius: 4px;
  }

  .chief-complaint strong {
    color: #92400e;
    display: block;
    margin-bottom: 6px;
    font-size: 10.5pt;
  }

  .chief-complaint p {
    font-style: italic;
    color: #78350f;
    line-height: 1.5;
  }

  .section {
    margin-bottom: 28px;
  }

  .section-title {
    font-size: 13pt;
    font-weight: 700;
    color: #1f2937;
    margin-bottom: 16px;
    padding-bottom: 8px;
    border-bottom: 2px solid #d1d5db;
    text-transform: uppercase;
    letter-spacing: 0.8px;
  }

  .subsection {
    margin-bottom: 18px;
  }

  .subsection-title {
    font-size: 10.5pt;
    font-weight: 600;
    color: #374151;
    margin-bottom: 8px;
    text-decoration: underline;
  }

  .subsection p, .section p {
    margin-bottom: 12px;
    text-align: justify;
    line-height: 1.5;
  }

  .mse-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px 16px;
    margin-bottom: 16px;
  }

  .mse-item {
    display: flex;
  }

  .mse-label {
    font-weight: 600;
    min-width: 140px;
    color: #374151;
  }

  .mse-value {
    color: #4b5563;
  }

  .assessment-scores {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    margin-bottom: 16px;
  }

  .score-item {
    display: flex;
    align-items: baseline;
  }

  .score-label {
    font-weight: 600;
    margin-right: 8px;
    color: #374151;
  }

  .score-value {
    color: #4b5563;
  }

  .diagnosis-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 16px;
  }

  .diagnosis-table th {
    background: #f3f4f6;
    padding: 10px;
    text-align: left;
    font-weight: 600;
    border: 1px solid #d1d5db;
    color: #374151;
    font-size: 10pt;
  }

  .diagnosis-table td {
    padding: 10px;
    border: 1px solid #e5e7eb;
    vertical-align: top;
  }

  .diagnosis-table td:first-child {
    font-weight: 600;
    width: 80px;
  }

  .diagnosis-table td:nth-child(2) {
    width: 100px;
  }

  ol, ul {
    margin-left: 20px;
    margin-bottom: 12px;
  }

  ol li, ul li {
    margin-bottom: 8px;
    line-height: 1.5;
  }

  .signature-block {
    margin-top: 40px;
    padding-top: 20px;
    border-top: 2px solid #e5e7eb;
  }

  .signature-line {
    margin: 20px 0;
  }

  .signature-label {
    font-weight: 600;
    color: #374151;
  }

  @media print {
    body {
      padding: 0.5in;
    }
    .section {
      page-break-inside: avoid;
    }
  }
</style>
`;

export function renderToHTML(note: BiopsychNote): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Biopsychosocial Intake - ${note.header.patient.name}</title>
  ${CSS}
</head>
<body>

<!-- HEADER -->
<div class="header-grid">
  <div class="header-section">
    <h2>Patient</h2>
    <p><strong>${note.header.patient.name}</strong></p>
    <p>DOB: ${note.header.patient.dob}</p>
    <p>Age: ${note.header.patient.age}</p>
    <p>Pronouns: ${note.header.patient.pronouns}</p>
  </div>
  <div class="header-section">
    <h2>Facility</h2>
    <p><strong>${note.header.facility.name}</strong></p>
    <p>${note.header.facility.address}</p>
    <p>${note.header.facility.phone}</p>
  </div>
  <div class="header-section">
    <h2>Encounter</h2>
    <p><strong>${note.header.encounter.type}</strong></p>
    <p>Date: ${note.header.encounter.date}</p>
    <p>Time: ${note.header.encounter.time}</p>
    <p>Provider: ${note.header.encounter.provider}</p>
    <p>Supervisor: ${note.header.encounter.supervisor}</p>
  </div>
</div>

<!-- CHIEF COMPLAINT -->
<div class="chief-complaint">
  <strong>CHIEF COMPLAINT</strong>
  <p>"${note.chiefComplaint}"</p>
</div>

<!-- SUBJECTIVE -->
<div class="section">
  <div class="section-title">Subjective</div>

  <div class="subsection">
    <div class="subsection-title">History of Present Illness</div>
    <p>${note.subjective.historyOfPresentIllness}</p>
  </div>

  <div class="subsection">
    <div class="subsection-title">Past Psychiatric History</div>
    <p>${note.subjective.pastPsychiatricHistory}</p>
  </div>

  <div class="subsection">
    <div class="subsection-title">Previously Trialed Medications</div>
    <p>${note.subjective.previousMedications}</p>
  </div>

  <div class="subsection">
    <div class="subsection-title">Current Medications</div>
    <p>${note.subjective.currentMedications}</p>
  </div>

  <div class="subsection">
    <div class="subsection-title">Family Psychiatric History</div>
    <p>${note.subjective.familyPsychiatricHistory}</p>
  </div>

  <div class="subsection">
    <div class="subsection-title">Medical History</div>
    <p>${note.subjective.medicalHistory}</p>
  </div>

  <div class="subsection">
    <div class="subsection-title">Social History</div>
    <p>${note.subjective.socialHistory}</p>
  </div>

  <div class="subsection">
    <div class="subsection-title">Substance Use History</div>
    <p>${note.subjective.substanceUseHistory}</p>
  </div>
</div>

<!-- OBJECTIVE -->
<div class="section">
  <div class="section-title">Objective</div>

  <div class="subsection">
    <div class="subsection-title">Mental Status Examination</div>
    <div class="mse-grid">
      <div class="mse-item">
        <div class="mse-label">Appearance:</div>
        <div class="mse-value">${note.objective.mentalStatusExam.appearance}</div>
      </div>
      <div class="mse-item">
        <div class="mse-label">Behavior:</div>
        <div class="mse-value">${note.objective.mentalStatusExam.behavior}</div>
      </div>
      <div class="mse-item">
        <div class="mse-label">Speech:</div>
        <div class="mse-value">${note.objective.mentalStatusExam.speech}</div>
      </div>
      <div class="mse-item">
        <div class="mse-label">Mood:</div>
        <div class="mse-value">${note.objective.mentalStatusExam.mood}</div>
      </div>
      <div class="mse-item">
        <div class="mse-label">Affect:</div>
        <div class="mse-value">${note.objective.mentalStatusExam.affect}</div>
      </div>
      <div class="mse-item">
        <div class="mse-label">Thought Process:</div>
        <div class="mse-value">${note.objective.mentalStatusExam.thoughtProcess}</div>
      </div>
      <div class="mse-item">
        <div class="mse-label">Thought Content:</div>
        <div class="mse-value">${note.objective.mentalStatusExam.thoughtContent}</div>
      </div>
      <div class="mse-item">
        <div class="mse-label">Perceptions:</div>
        <div class="mse-value">${note.objective.mentalStatusExam.perceptions}</div>
      </div>
      <div class="mse-item">
        <div class="mse-label">Cognition:</div>
        <div class="mse-value">${note.objective.mentalStatusExam.cognition}</div>
      </div>
      <div class="mse-item">
        <div class="mse-label">Insight:</div>
        <div class="mse-value">${note.objective.mentalStatusExam.insight}</div>
      </div>
      <div class="mse-item">
        <div class="mse-label">Judgment:</div>
        <div class="mse-value">${note.objective.mentalStatusExam.judgment}</div>
      </div>
    </div>
  </div>

  <div class="subsection">
    <div class="subsection-title">Functional Assessment</div>
    <p>${note.objective.functionalAssessment}</p>
  </div>

  <div class="subsection">
    <div class="subsection-title">Standardized Assessment Scores</div>
    <div class="assessment-scores">
      <div class="score-item">
        <div class="score-label">PHQ-9:</div>
        <div class="score-value">${note.objective.assessmentScores.phq9.score}/27 (${note.objective.assessmentScores.phq9.severity})</div>
      </div>
      <div class="score-item">
        <div class="score-label">GAD-7:</div>
        <div class="score-value">${note.objective.assessmentScores.gad7.score}/21 (${note.objective.assessmentScores.gad7.severity})</div>
      </div>
      <div class="score-item">
        <div class="score-label">ACE:</div>
        <div class="score-value">${note.objective.assessmentScores.ace.score}/10</div>
      </div>
      <div class="score-item">
        <div class="score-label">AUDIT:</div>
        <div class="score-value">${note.objective.assessmentScores.audit.score}/40 (${note.objective.assessmentScores.audit.risk})</div>
      </div>
      <div class="score-item">
        <div class="score-label">DAST-10:</div>
        <div class="score-value">${note.objective.assessmentScores.dast10.score}/10 (${note.objective.assessmentScores.dast10.risk})</div>
      </div>
    </div>
  </div>
</div>

<!-- ASSESSMENT -->
<div class="section">
  <div class="section-title">Assessment</div>

  <div class="subsection">
    <div class="subsection-title">Clinical Formulation</div>
    <p>${note.assessment.clinicalFormulation}</p>
  </div>

  <div class="subsection">
    <div class="subsection-title">Risk Assessment</div>
    <p>${note.assessment.riskAssessment}</p>
  </div>

  <div class="subsection">
    <div class="subsection-title">Prognosis</div>
    <p>${note.assessment.prognosis}</p>
  </div>

  <div class="subsection">
    <div class="subsection-title">Diagnostic Impressions</div>
    <table class="diagnosis-table">
      <thead>
        <tr>
          <th>ICD-10</th>
          <th>DSM-5 Code</th>
          <th>Description</th>
          <th>Supporting Criteria</th>
        </tr>
      </thead>
      <tbody>
        ${note.assessment.diagnosticImpressions.map(d => `
        <tr>
          <td>${d.icd10}</td>
          <td>${d.dsm5}</td>
          <td>${d.description}</td>
          <td>${d.criteria}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
</div>

<!-- PLAN -->
<div class="section">
  <div class="section-title">Plan</div>

  <div class="subsection">
    <div class="subsection-title">Interventions Recommended</div>
    <ol>
      ${note.plan.interventionsRecommended.map(item => `<li>${item}</li>`).join('')}
    </ol>
  </div>

  <div class="subsection">
    <div class="subsection-title">Coordination of Care</div>
    <p>${note.plan.coordinationOfCare.intro}</p>
    <ol>
      ${note.plan.coordinationOfCare.items.map(item => `<li>${item}</li>`).join('')}
    </ol>
  </div>

  <div class="subsection">
    <div class="subsection-title">Follow-Up Plan</div>
    <ol>
      ${note.plan.followUpPlan.map(item => `<li>${item}</li>`).join('')}
    </ol>
  </div>

  <div class="subsection">
    <div class="subsection-title">Crisis Safety Plan</div>
    <ol>
      ${note.plan.crisisSafetyPlan.items.map(item => `<li>${item}</li>`).join('')}
    </ol>
    <p><strong>Reasons for Living:</strong> ${note.plan.crisisSafetyPlan.reasonsForLiving}</p>
  </div>
</div>

<!-- SIGNATURE -->
<div class="signature-block">
  <div class="signature-line">
    <span class="signature-label">Clinician:</span> ${note.header.encounter.provider}
  </div>
  <div class="signature-line">
    <span class="signature-label">Date:</span> ${note.header.encounter.date}
  </div>
  <div class="signature-line">
    <span class="signature-label">Clinical Supervisor:</span> ${note.header.encounter.supervisor}
  </div>
</div>

</body>
</html>`;
}
