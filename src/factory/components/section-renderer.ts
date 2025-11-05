// Section rendering component
// Handles sections, subsections, and heading hierarchy

import type { Component } from '../../derivation/types';
import type { RenderPayload } from '../../types/payloads';
import type { DesignTokens } from '../../tokens/types';

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
export function getComponentClass(comp: Component): string {
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
  comp: Component,
  depth: number,
  tokens?: DesignTokens
): string {
  // Check if title should be shown
  const props = comp.props as Record<string, unknown> | undefined;
  const hideTitleProp = typeof props?.hideTitle === 'boolean' ? props.hideTitle : false;
  const showTitle =
    comp.type === "header"
      ? tokens?.layout?.headerShowTitle ?? true
      : !hideTitleProp;

  if (!comp.title || !showTitle) return "";

  const headingTag = getHeadingTag(comp.type, depth);
  const headingClass = getHeadingClass(comp.type, depth);

  return `<${headingTag} class="${headingClass}">${escapeHtml(comp.title)}</${headingTag}>`;
}

/**
 * Renders patient block as a definition list
 * Only renders if patient data exists in payload
 */
export function renderPatientBlock(payload: RenderPayload): string {
  const patientValue = payload?.patient;
  if (!isRecord(patientValue)) return "";

  const patient = patientValue as Record<string, unknown>;
  if (!patient) return "";

  const chunks: string[] = ['<dl class="patient">'];

  if (typeof patient.name === 'string') {
    chunks.push(`<dt>Name</dt><dd>${escapeHtml(patient.name)}</dd>`);
  }
  if (typeof patient.dob === 'string') {
    chunks.push(`<dt>DOB</dt><dd>${escapeHtml(patient.dob)}</dd>`);
  }
  if (typeof patient.mrn === 'string') {
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
