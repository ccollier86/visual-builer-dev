// Section rendering component
// Handles sections, subsections, and heading hierarchy

import type { Component } from '../../derivation/types';
import type { DesignTokens } from '../../tokens/types';

import { escapeHtml } from '../utils/html-escape';

/**
 * Map component types to structural CSS classes.
 */
export function getComponentClass(comp: Component, depth: number): string {
  switch (comp.type) {
    case 'section':
      return depth === 0 ? 'note-section note-section--top' : 'note-section';
    case 'paragraph':
      return 'note-section note-section--paragraph';
    case 'list':
      return 'note-section note-section--list';
    case 'table':
      return 'note-section note-section--table';
    case 'alertPanel':
      return 'note-section note-section--alert';
    case 'footer':
      return 'note-section note-section--footer';
    default:
      return 'note-section';
  }
}

/**
 * Render heading markup for a component when titles are enabled.
 */
export function renderSectionHeading(
  comp: Component,
  depth: number,
  tokens?: DesignTokens
): string {
  if (!shouldShowTitle(comp, tokens)) {
    return '';
  }

  if (comp.type === 'section' && depth === 0) {
    return `<h2 class="note-section-banner">${escapeHtml(comp.title ?? '')}</h2>`;
  }

  if (comp.type === 'alertPanel') {
    return `<h3 class="note-alert-title">${escapeHtml(comp.title ?? '')}</h3>`;
  }

  return `<h3 class="note-subsection-title">${escapeHtml(comp.title ?? '')}</h3>`;
}

function shouldShowTitle(comp: Component, tokens?: DesignTokens): boolean {
  if (!comp.title) {
    return false;
  }

  if (comp.type === 'header') {
    return tokens?.layout?.headerShowTitle ?? true;
  }

  const props = comp.props as Record<string, unknown> | undefined;
  const hideTitle = typeof props?.hideTitle === 'boolean' ? props.hideTitle : false;
  return !hideTitle;
}
