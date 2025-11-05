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
  --sp-1: calc({{spacing.unitPx}}px * 0.5);
  --sp-2: {{spacing.unitPx}}px;
  --sp-3: calc({{spacing.unitPx}}px * 1.5);
  --sp-4: calc({{spacing.unitPx}}px * 2);
  --note-section-gap: {{layout.sectionGap}}px;
  --note-paragraph-gap: {{layout.paragraphGap}}px;
  --note-page-padding: {{layout.pagePaddingPx}}px;
  --note-container-padding: {{layout.containerPaddingPx}}px;
  --note-container-max-width: {{layout.containerMaxWidthPx}}px;
  --note-header-gap: {{layout.headerGapPx}}px;
  --note-header-padding-y: {{layout.headerPaddingY}}px;
  --note-banner-margin: {{layout.sectionBanner.marginPx}}px;
  --note-banner-padding-y: {{layout.sectionBanner.paddingY}}px;
  --note-banner-padding-left: {{layout.sectionBanner.paddingLeftPx}}px;
  --note-banner-border-width: {{layout.sectionBanner.borderWidthPx}}px;
  --surface-header-bg: {{surface.headerBackground}};
  --surface-header-border: {{surface.headerBorder}};
  --surface-banner-bg: {{surface.sectionBannerBackground}};
  --surface-banner-border: {{surface.sectionBannerBorder}};
  --surface-card-bg: {{surface.cardBackground}};
  --surface-card-border: {{surface.cardBorder}};
  --surface-alert-info-bg: {{surface.alertInfoBackground}};
  --surface-alert-info-border: {{surface.alertInfoBorder}};
  --surface-signature-border: {{surface.signatureBorder}};
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

body.note-body {
  margin: 0;
  padding: var(--note-page-padding);
  font-family: var(--note-font);
  font-size: var(--note-base);
  line-height: var(--note-line);
  color: var(--note-text);
  background: var(--note-bg);
}

.note-container {
  max-width: var(--note-container-max-width);
  margin: 0 auto;
  background: var(--note-bg);
  padding: 0 var(--note-container-padding);
}

.note {
  display: block;
  font-family: var(--note-font);
  color: var(--note-text);
  background: var(--note-bg);
  font-size: var(--note-base);
  line-height: var(--note-line);
}

.note a {
  color: var(--note-accent);
}

.note h1,
.note h2,
.note h3,
.note h4 {
  font-family: inherit;
  color: inherit;
  margin: 0;
}

.note h1 { font-size: calc(var(--note-base) * {{typography.scale}} * {{typography.scale}}); }
.note h2 { font-size: calc(var(--note-base) * {{typography.scale}}); }
.note h3 { font-size: calc(var(--note-base) * 1.05); }
.note h4 { font-size: calc(var(--note-base)); }

.note-brand-header {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  margin-bottom: var(--sp-3);
}

.note-brand-logo {
  max-height: 48px;
}

.note-brand-footer {
  margin-top: calc(var(--note-section-gap) * 2);
  font-size: calc(var(--note-base) * 0.85);
  color: var(--note-muted);
  text-align: center;
}

.note-header {
  margin: 0 calc(var(--note-container-padding) * -1);
  padding: var(--note-header-padding-y) var(--note-container-padding);
  background: var(--surface-header-bg);
  border-bottom: 2px solid var(--surface-header-border);
}

.note-header-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--note-header-gap);
}

.note-header-card {
  background: var(--surface-card-bg);
  border-left: 3px solid var(--surface-card-border);
  padding-left: var(--sp-2);
}

.note-header-title {
  font-size: calc(var(--note-base) * 0.9);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: var(--sp-1);
  color: var(--note-muted);
}

.note-header-meta {
  display: grid;
  grid-template-columns: auto 1fr;
  column-gap: var(--sp-1);
  row-gap: 4px;
  margin: 0;
}

.note-header-meta dt {
  font-weight: 700;
  text-transform: uppercase;
  font-size: calc(var(--note-base) * 0.75);
  letter-spacing: 0.04em;
  color: var(--note-muted);
}

.note-header-meta dd {
  margin: 0;
  font-size: calc(var(--note-base) * 0.95);
  color: var(--note-text);
}

.note-header-meta dd.note-header-text {
  grid-column: 1 / -1;
  font-size: calc(var(--note-base) * 0.9);
  color: var(--note-muted);
}

.note-section {
  margin: var(--note-section-gap) 0;
}

.note-section-banner {
  display: block;
  background: var(--surface-banner-bg);
  border-left: var(--note-banner-border-width) solid var(--surface-banner-border);
  margin: var(--note-banner-margin) calc(var(--note-container-padding) * -1) var(--sp-3);
  padding: var(--note-banner-padding-y) var(--note-container-padding) var(--note-banner-padding-y) var(--note-banner-padding-left);
  font-size: calc(var(--note-base) * 1.4);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--note-text);
}

.note-section-banner:first-of-type {
  margin-top: 0;
}

.note-subsection-title {
  margin: var(--sp-3) 0 var(--sp-2);
  font-size: calc(var(--note-base) * 1.15);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  border-bottom: 1px solid var(--note-border);
  padding-bottom: var(--sp-1);
  color: var(--note-text);
}

.note p {
  margin: var(--note-paragraph-gap) 0;
  text-align: left;
  color: var(--note-text);
  font-size: calc(var(--note-base) * 1.0);
}

.note em {
  color: var(--note-muted);
}

.note ul {
  list-style: {{list.bulletStyle}};
  margin: var(--sp-2) 0 var(--sp-2) var(--sp-4);
  padding: 0;
}

.note ol {
  list-style: {{list.numberStyle}};
  margin: var(--sp-2) 0 var(--sp-2) var(--sp-4);
  padding: 0;
}

.note li {
  margin-bottom: var(--sp-1);
  line-height: var(--note-line);
}

.note table {
  width: 100%;
  border-collapse: collapse;
  margin: var(--sp-3) 0;
}

.note th,
.note td {
  border-bottom: {{table.borderStyle}};
  padding: {{table.padding}};
  text-align: left;
  vertical-align: top;
}

.note th {
  color: var(--note-muted);
  font-weight: 600;
}

{{table.stripedCSS}}

.note-alert-title {
  margin: 0 0 var(--sp-2);
  font-size: calc(var(--note-base) * 1.0);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--note-text);
}

.note-alert {
  background: var(--surface-alert-info-bg);
  border-left: 4px solid var(--surface-alert-info-border);
  padding: var(--sp-3);
  margin: var(--note-section-gap) 0;
}

.note-alert > p:first-of-type {
  margin-top: 0;
}

.note-alert > p:last-of-type {
  margin-bottom: 0;
}

.note-signature {
  margin-top: calc(var(--note-section-gap) * 1.5);
  border-top: 1px solid var(--surface-signature-border);
  padding-top: var(--sp-3);
  font-size: calc(var(--note-base) * 0.95);
}

.note-signature-heading {
  font-size: calc(var(--note-base) * 1.1);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin: 0 0 var(--sp-2);
}

.note-signature-line {
  margin: 0 0 var(--sp-1);
}

.note-signature-attestation {
  margin: var(--sp-2) 0 0;
  font-style: italic;
  color: var(--note-muted);
}

.note-provenance {
  margin-top: calc(var(--note-section-gap) * 2);
  border-top: 1px solid var(--note-border);
  padding-top: var(--sp-3);
}

.note-provenance h3 {
  font-size: calc(var(--note-base) * 1.05);
  margin-bottom: var(--sp-2);
}

.note-provenance ol {
  margin: 0;
  padding-left: var(--sp-4);
}

.note-provenance li {
  margin-bottom: var(--sp-1);
}
`.trim();

export const PRINT_CSS_TEMPLATE = `
@page { size: {{print.pageSize}}; margin: {{print.margin}}; }

@media print {
  body.note-body { padding: 0; }
  .note { color: {{print.textColor}}; }
  .note a { color: inherit; text-decoration: none; }
  .note table { page-break-inside: avoid; }
  .note h1, .note h2, .note h3 { break-after: avoid; }
  .note p { orphans: 2; widows: 2; }
  {{print.headerCSS}}
  {{print.footerCSS}}
}
`.trim();
