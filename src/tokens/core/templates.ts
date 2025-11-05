/**
 * Design Tokens - CSS Templates
 *
 * Domain: tokens/core
 * Responsibility: Provide CSS template strings with {{variable}} placeholders
 */

export const SCREEN_CSS_TEMPLATE = `
:root {
  --note-font: {{typography.fontFamily}};
  --note-font-mono: {{typography.monospaceFamily}};
  --note-text: {{color.text}};
  --note-muted: {{color.muted}};
  --note-accent: {{color.accent}};
  --note-border: {{color.border}};
  --note-bg: {{color.background}};
  --note-base: {{typography.baseSizePx}}px;
  --note-line: {{typography.lineHeight}};
  /* spacing steps */
  --sp-1: calc({{spacing.unitPx}}px * 0.5);
  --sp-2: {{spacing.unitPx}}px;
  --sp-3: calc({{spacing.unitPx}}px * 1.5);
  --sp-4: calc({{spacing.unitPx}}px * 2);
}

.note {
  font-family: var(--note-font);
  color: var(--note-text);
  background: var(--note-bg);
  font-size: var(--note-base);
  line-height: var(--note-line);
}

/* Headings (scale-based) */
.note h1 { font-size: calc(var(--note-base) * {{typography.scale}} * {{typography.scale}}); margin: var(--sp-3) 0 var(--sp-2); }
.note h2 { font-size: calc(var(--note-base) * {{typography.scale}}); margin: var(--sp-3) 0 var(--sp-2); }
.note h3 { font-size: calc(var(--note-base) * 1.05); color: var(--note-muted); margin: var(--sp-2) 0 var(--sp-1); }
.note h4 { font-size: calc(var(--note-base)); color: var(--note-muted); margin: var(--sp-2) 0 var(--sp-1); }

.note p { margin: {{layout.paragraphGap}}px 0; }
.note .section { margin: {{layout.sectionGap}}px 0; }

/* Lists */
.note ul { list-style: {{list.bulletStyle}}; margin: var(--sp-2) 0 var(--sp-2) var(--sp-4); }
.note ol { list-style: {{list.numberStyle}}; margin: var(--sp-2) 0 var(--sp-2) var(--sp-4); }

/* Tables */
.note table { width: 100%; border-collapse: collapse; margin: var(--sp-3) 0; }
.note th, .note td {
  border-bottom: {{table.borderStyle}};
  padding: {{table.padding}};
  text-align: left;
  vertical-align: top;
}
.note th { color: var(--note-muted); font-weight: 600; }
{{table.stripedCSS}}

/* Alerts */
.note .alert { padding-left: var(--sp-2); border-left: 3px solid var(--note-border); }
.note .alert.info { border-left-color: var(--note-accent); }
.note .alert.warning { border-left-color: #f59e0b; }
.note .alert.critical { border-left-color: #ef4444; }

/* Signature & patient block (basic) */
.note .signature { margin-top: var(--sp-3); border-top: 1px solid var(--note-border); padding-top: var(--sp-2); }
.note .patient { margin-bottom: var(--sp-3); }
`.trim();

export const PRINT_CSS_TEMPLATE = `
@page { size: {{print.pageSize}}; margin: {{print.margin}}; }

@media print {
  .note { color: {{print.textColor}}; }
  .note a { color: inherit; text-decoration: none; }
  .note table { page-break-inside: avoid; }
  .note h1, .note h2, .note h3 { break-after: avoid; }
  .note p { orphans: 2; widows: 2; }
  {{print.headerCSS}}
  {{print.footerCSS}}
}
`.trim();
