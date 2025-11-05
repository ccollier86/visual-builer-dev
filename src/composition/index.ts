/**
 * Composition Domain
 *
 * Exports prompt composition functionality.
 * Transforms templates + data into LLM-ready prompt bundles.
 */

export { composePrompt } from './core/prompt-composer';
export { buildFieldGuide } from './core/field-guide-builder';
export { sliceContext } from './core/context-slicer';
export { buildMessages } from './core/message-builder';

export type {
  PromptBundle,
  Message,
  FieldGuideEntry,
  FieldConstraints,
  CompositionInput
} from './types';
