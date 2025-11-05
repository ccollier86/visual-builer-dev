// Section rendering component
// Handles sections, subsections, and heading hierarchy

import { escapeHtml } from "../utils/html-escape";

/**
 * Determines heading tag based on component type and depth
 *
 * - header component → h1
 * - depth 0 (top-level section) → h2
 * - depth 1+ (subsection) → h3
 */
export function getHeadingTag(
  componentType: string,
  depth: number
): "h1" | "h2" | "h3" {
  if (componentType === "header") return "h1";
  return depth === 0 ? "h2" : "h3";
}

/**
 * Determines CSS class for heading based on depth and type
 *
 * - header → "note-title"
 * - depth 0 → "section-title"
 * - depth 1+ → "subsection-title"
 */
export function getHeadingClass(componentType: string, depth: number): string {
  if (componentType === "header") return "note-title";
  return depth === 0 ? "section-title" : "subsection-title";
}

/**
 * Determines CSS class for component wrapper
 */
export function getComponentClass(comp: any): string {
  switch (comp.type) {
    case "header":
      return "section header";
    case "footer":
      return "section footer";
    case "section":
      return "section";
    case "paragraph":
      return "section paragraph";
    case "list":
      return "section list";
    case "table":
      return "section table";
    case "patientBlock":
      return "section patient";
    case "signatureBlock":
      return "section signature";
    case "alertPanel":
      return "section alert";
    default:
      return "section";
  }
}

/**
 * Renders a section heading if title exists and not hidden
 */
export function renderSectionHeading(
  comp: any,
  depth: number,
  tokens?: any
): string {
  // Check if title should be shown
  const showTitle =
    comp.type === "header"
      ? tokens?.layout?.headerShowTitle ?? true
      : !comp?.props?.hideTitle;

  if (!comp.title || !showTitle) return "";

  const headingTag = getHeadingTag(comp.type, depth);
  const headingClass = getHeadingClass(comp.type, depth);

  return `<${headingTag} class="${headingClass}">${escapeHtml(comp.title)}</${headingTag}>`;
}

/**
 * Renders patient block as a definition list
 * Only renders if patient data exists in payload
 */
export function renderPatientBlock(payload: any): string {
  const patient = payload?.patient;
  if (!patient) return "";

  const chunks: string[] = ['<dl class="patient">'];

  if (patient.name) {
    chunks.push(`<dt>Name</dt><dd>${escapeHtml(patient.name)}</dd>`);
  }
  if (patient.dob) {
    chunks.push(`<dt>DOB</dt><dd>${escapeHtml(patient.dob)}</dd>`);
  }
  if (patient.mrn) {
    chunks.push(`<dt>MRN</dt><dd>${escapeHtml(patient.mrn)}</dd>`);
  }

  chunks.push("</dl>");
  return chunks.join("");
}

/**
 * Renders signature block with signature lines
 */
export function renderSignatureBlock(): string {
  return `<div class="signature">
  <div>Clinician: ____________________  Date: __________</div>
  <div>Patient/Guardian: _____________  Date: __________</div>
</div>`;
}
