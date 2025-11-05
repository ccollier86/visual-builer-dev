/**
 * Message Builder
 *
 * Generates system and user messages for the LLM prompt.
 * Follows the specification format with PURPOSE, RULES, CONTRACT, CONTEXT, FIELD GUIDE.
 */

import type { NoteTemplate } from '../../derivation/types';
import type { FactPack, Message, FieldGuideEntry, NasSnapshot, FieldConstraints } from '../types';

/**
 * Build messages array for prompt bundle
 *
 * Creates system message with template prompt and hard rules.
 * Creates user message with structured sections:
 * - PURPOSE: template.prompt.main
 * - HARD RULES: template.prompt.rules[]
 * - RESPONSE CONTRACT: JSON-only directive
 * - CONTEXT: factPack + nasSlices
 * - FIELD GUIDE: formatted guide entries
 *
 * @param template - Note template with prompt configuration
 * @param fieldGuide - Field guide entries
 * @param factPack - Optional fact pack
 * @param nasSlices - Sliced NAS context
 * @returns Array of [system, user] messages
 */
export function buildMessages(
  template: NoteTemplate,
  fieldGuide: FieldGuideEntry[],
  factPack: FactPack | undefined,
  nasSlices: NasSnapshot
): Message[] {
  const systemMessage = buildSystemMessage(template);
  const userMessage = buildUserMessage(template, fieldGuide, factPack, nasSlices);

  return [systemMessage, userMessage];
}

/**
 * Build system message
 *
 * Includes template.prompt.system plus hard rules:
 * - JSON-only output
 * - No fabrication
 * - Prefer existing data
 *
 * @param template - Note template
 * @returns System message
 */
function buildSystemMessage(template: NoteTemplate): Message {
  const parts: string[] = [];

  // Template-defined system prompt
  if (template.prompt?.system) {
    parts.push(template.prompt.system);
  }

  // Hard rules
  parts.push('');
  parts.push('CRITICAL CONSTRAINTS:');
  parts.push('- Return ONLY JSON that conforms to the provided JSON Schema.');
  parts.push('- Do not invent facts beyond supplied context.');
  parts.push(
    '- Prefer data already present in the non-AI snapshot for derived values; only compose requested AI fields.'
  );

  return {
    role: 'system',
    content: parts.join('\n')
  };
}

/**
 * Build user message
 *
 * Structured message with multiple sections.
 * Follows specification format.
 *
 * @param template - Note template
 * @param fieldGuide - Field guide entries
 * @param factPack - Optional fact pack
 * @param nasSlices - Sliced NAS context
 * @returns User message
 */
function buildUserMessage(
  template: NoteTemplate,
  fieldGuide: FieldGuideEntry[],
  factPack: FactPack | undefined,
  nasSlices: NasSnapshot
): Message {
  const sections: string[] = [];

  // PURPOSE section
  sections.push('PURPOSE');
  sections.push(template.prompt?.main || '');
  sections.push('');

  // HARD RULES section
  if (template.prompt?.rules && template.prompt.rules.length > 0) {
    sections.push('HARD RULES');
    for (const rule of template.prompt.rules) {
      sections.push(`- ${rule}`);
    }
    sections.push('');
  }

  // RESPONSE CONTRACT section
  sections.push('RESPONSE CONTRACT');
  sections.push(
    'Return a single JSON object that EXACTLY matches the provided JSON Schema.'
  );
  sections.push('');

  // CONTEXT section
  sections.push('CONTEXT');

  if (factPack) {
    sections.push('SOURCE DATA:');
    sections.push(stringifyDeterministic(factPack));
    sections.push('');
  }

  sections.push('NON-AI SNAPSHOT (sliced):');
  sections.push(stringifyDeterministic(nasSlices));
  sections.push('');

  // FIELD GUIDE section
  sections.push('FIELD GUIDE');
  for (const entry of fieldGuide) {
    sections.push(formatFieldGuideEntry(entry));
  }

  return {
    role: 'user',
    content: sections.join('\n')
  };
}

/**
 * Format a field guide entry
 *
 * Formats entry as:
 * - path: assessment.narrative
 *   description: Clinical interpretation
 *   guidance:
 *     - Discuss change since last session
 *   deps:
 *     - static.assessments.PHQ9
 *   constraints: {...}
 *   style: {...}
 *
 * @param entry - Field guide entry
 * @returns Formatted string
 */
function formatFieldGuideEntry(entry: FieldGuideEntry): string {
  const lines: string[] = [];

  lines.push(`- path: ${entry.path}`);

  if (entry.description) {
    lines.push(`  description: ${entry.description}`);
  }

  if (entry.guidance && entry.guidance.length > 0) {
    lines.push('  guidance:');
    for (const hint of entry.guidance) {
      lines.push(`    - ${hint}`);
    }
  }

  if (entry.dependencies && entry.dependencies.length > 0) {
    lines.push('  deps:');
    for (const dep of entry.dependencies) {
      lines.push(`    - ${dep}`);
    }
  }

  if (entry.constraints && Object.keys(entry.constraints).length > 0) {
    const constraintLines = formatConstraintLines(entry.constraints);
    if (constraintLines.length > 0) {
      lines.push('  constraints:');
      for (const constraint of constraintLines) {
        lines.push(`    - ${constraint}`);
      }
    }
  }

  if (entry.style && Object.keys(entry.style).length > 0) {
    lines.push('  style:');
    appendObjectLines(lines, entry.style, '    ');
  }

  return lines.join('\n');
}

/**
 * Stringify object deterministically
 *
 * Uses JSON.stringify with sorted keys for deterministic output.
 * Ensures same input always produces same string.
 *
 * @param obj - Object to stringify
 * @returns JSON string with sorted keys
 */
function stringifyDeterministic(input: unknown): string {
  const normalise = (value: unknown): unknown => {
    if (Array.isArray(value)) {
      return value.map(normalise);
    }

    if (isPlainObject(value)) {
      const sortedKeys = Object.keys(value).sort();
      const result: Record<string, unknown> = {};
      for (const key of sortedKeys) {
        result[key] = normalise(value[key]);
      }
      return result;
    }

    return value;
  };

  return JSON.stringify(normalise(input), null, 2);
}

function formatConstraintLines(constraints: FieldConstraints): string[] {
  const lines: string[] = [];

  if (constraints.enum && constraints.enum.length > 0) {
    lines.push(`Allowed values: ${constraints.enum.join(', ')}`);
  }

  if (constraints.pattern) {
    lines.push(`Must match pattern: ${constraints.pattern}`);
  }

  if (constraints['x-minWords'] !== undefined) {
    lines.push(`Minimum words: ${constraints['x-minWords']}`);
  }

  if (constraints['x-maxWords'] !== undefined) {
    lines.push(`Maximum words: ${constraints['x-maxWords']}`);
  }

  if (constraints['x-minSentences'] !== undefined) {
    lines.push(`Minimum sentences: ${constraints['x-minSentences']}`);
  }

  if (constraints['x-maxSentences'] !== undefined) {
    lines.push(`Maximum sentences: ${constraints['x-maxSentences']}`);
  }

  return lines;
}

function appendObjectLines(lines: string[], value: Record<string, unknown>, indent: string): void {
  const entries = Object.entries(value);

  for (const [key, raw] of entries) {
    if (isPlainObject(raw)) {
      lines.push(`${indent}${key}:`);
      appendObjectLines(lines, raw as Record<string, unknown>, `${indent}  `);
      continue;
    }

    if (Array.isArray(raw)) {
      lines.push(`${indent}${key}: [${raw.join(', ')}]`);
      continue;
    }

    lines.push(`${indent}${key}: ${String(raw)}`);
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
