/**
 * Design Tokens - CSS Compiler
 *
 * Domain: tokens/core
 * Responsibility: Transform design tokens into screen and print CSS stylesheets
 */

import type { DesignTokens, CompiledCSS } from '../types.js';
import { SCREEN_CSS_TEMPLATE, PRINT_CSS_TEMPLATE } from './templates.js';
import { hashTokens } from './hasher.js';

/**
 * Replace {{path}} placeholders with token values
 *
 * Supports dot notation like {{typography.fontFamily}}
 *
 * @param template - Template string with {{...}} placeholders
 * @param tokens - Design tokens object
 * @returns Template with placeholders replaced
 */
function replacePlaceholders(template: string, tokens: DesignTokens): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const value = getNestedValue(tokens, path.trim());
    return value !== undefined ? String(value) : match;
  });
}

/**
 * Get nested value from object using dot notation
 *
 * @param obj - Object to traverse
 * @param path - Dot-notation path (e.g., "typography.fontFamily")
 * @returns Value at path or undefined
 */
function getNestedValue(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (!isObjectLike(current)) {
      return undefined;
    }
    return (current as Record<string, unknown>)[key];
  }, obj);
}

/**
 * Compute table border style based on borders setting
 */
function getTableBorderStyle(borders?: string): string {
  if (borders === 'none') return '0';
  return '1px solid var(--note-border)';
}

/**
 * Compute table padding based on density
 */
function getTablePadding(density?: string): string {
  switch (density) {
    case 'compact':
      return '6px';
    case 'spacious':
      return '12px';
    default:
      return '8px';
  }
}

/**
 * Generate striped table CSS if enabled
 */
function getStripedTableCSS(striped?: boolean): string {
  if (!striped) return '';
  return '.note tbody tr:nth-child(odd) { background: rgba(0,0,0,0.02); }';
}

/**
 * Get print text color (monochrome or normal)
 */
function getPrintTextColor(monochrome?: boolean): string {
  return monochrome ? '#000' : 'var(--note-text)';
}

/**
 * Generate print header CSS based on visibility
 */
function getPrintHeaderCSS(showHeader?: boolean): string {
  if (showHeader !== false) return '';
  return 'header, .print-header { display: none !important; }';
}

/**
 * Generate print footer CSS based on visibility
 */
function getPrintFooterCSS(showFooter?: boolean): string {
  if (showFooter !== false) return '';
  return 'footer, .print-footer { display: none !important; }';
}

function isObjectLike(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Compile screen CSS from design tokens
 *
 * Generates note.<hash>.css with all screen styles
 *
 * @param tokens - Validated design tokens
 * @param hash - Pre-computed hash for metadata
 * @returns Screen CSS string with metadata comments
 */
export function compileScreenCSS(tokens: DesignTokens, hash: string): string {
  const metadata = `/*
 * Screen CSS - ${tokens.id} v${tokens.version}
 * Hash: ${hash}
 * Generated: ${new Date().toISOString()}
 */\n\n`;

  let css = SCREEN_CSS_TEMPLATE;

  // Replace simple placeholders
  css = replacePlaceholders(css, tokens);

  // Handle computed values
  css = css.replace('{{table.borderStyle}}', getTableBorderStyle(tokens.table.borders));
  css = css.replace('{{table.padding}}', getTablePadding(tokens.table.density));
  css = css.replace('{{table.stripedCSS}}', getStripedTableCSS(tokens.table.striped));

  return metadata + css;
}

/**
 * Compile print CSS from design tokens
 *
 * Generates note.print.<hash>.css with print-specific styles
 *
 * @param tokens - Validated design tokens
 * @param hash - Pre-computed hash for metadata
 * @returns Print CSS string with metadata comments
 */
export function compilePrintCSS(tokens: DesignTokens, hash: string): string {
  const metadata = `/*
 * Print CSS - ${tokens.id} v${tokens.version}
 * Hash: ${hash}
 * Generated: ${new Date().toISOString()}
 */\n\n`;

  let css = PRINT_CSS_TEMPLATE;

  // Replace simple placeholders
  css = replacePlaceholders(css, tokens);

  // Handle computed values
  css = css.replace('{{print.textColor}}', getPrintTextColor(tokens.print.monochrome));
  css = css.replace('{{print.headerCSS}}', getPrintHeaderCSS(tokens.print.showHeader));
  css = css.replace('{{print.footerCSS}}', getPrintFooterCSS(tokens.print.showFooter));

  return metadata + css;
}

/**
 * Compile design tokens into screen and print CSS
 *
 * Main compilation entry point. Generates both stylesheets with cache key.
 *
 * @param tokens - Validated design tokens
 * @returns Compiled CSS with screen, print, and hash
 */
export function compileCSS(tokens: DesignTokens): CompiledCSS {
  const hash = hashTokens(tokens);
  const screen = compileScreenCSS(tokens, hash);
  const print = compilePrintCSS(tokens, hash);

  return {
    screen,
    print,
    hash,
  };
}
