// Factory domain barrel export
// Main entry point for HTML rendering functionality

export { renderNoteHTML } from "./core/renderer";
export type { FactoryInputs, RenderOptions, VerbatimValue } from "./types";

// Re-export utilities for advanced usage
export { escapeHtml, escapeAttr } from "./utils/html-escape";
export {
  getByPath,
  inferArrayRoot,
  normalizeRowPath,
} from "./utils/path-resolver";
