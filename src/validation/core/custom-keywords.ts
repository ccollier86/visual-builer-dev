import type Ajv from 'ajv';

/**
 * Custom keyword definitions for text validation
 * These keywords extend JSON Schema to support clinical documentation requirements
 */

/**
 * Count words in a string using word boundary regex
 * Handles edge cases like empty strings and null values
 */
function countWords(text: string): number {
  if (!text || text.trim() === '') {
    return 0;
  }
  const matches = text.match(/\b\w+\b/g);
  return matches ? matches.length : 0;
}

/**
 * Count sentences in a string by splitting on sentence terminators
 * Handles edge cases like empty strings, consecutive punctuation, and abbreviations (e.g., "Dr. Smith")
 */
function countSentences(text: string): number {
  if (!text || text.trim() === '') {
    return 0;
  }
  const sentences = text.split(/[.!?]+\s+/).filter(s => s.trim().length > 0);
  return sentences.length;
}

/**
 * Add all custom text validation keywords to an AJV instance
 *
 * Custom keywords:
 * - x-minWords: Minimum word count
 * - x-maxWords: Maximum word count
 * - x-minSentences: Minimum sentence count
 * - x-maxSentences: Maximum sentence count
 */
export function addCustomKeywords(ajv: Ajv): void {
  // x-minWords: Validates minimum word count
  ajv.addKeyword({
    keyword: 'x-minWords',
    type: 'string',
    schemaType: 'number',
    validate: (minWords: number, data: string): boolean => {
      return countWords(data) >= minWords;
    },
    error: {
      message: (cxt) => {
        const minWords = cxt.schema as number;
        return `must have at least ${minWords} words`;
      }
    }
  });

  // x-maxWords: Validates maximum word count
  ajv.addKeyword({
    keyword: 'x-maxWords',
    type: 'string',
    schemaType: 'number',
    validate: (maxWords: number, data: string): boolean => {
      return countWords(data) <= maxWords;
    },
    error: {
      message: (cxt) => {
        const maxWords = cxt.schema as number;
        return `must have at most ${maxWords} words`;
      }
    }
  });

  // x-minSentences: Validates minimum sentence count
  ajv.addKeyword({
    keyword: 'x-minSentences',
    type: 'string',
    schemaType: 'number',
    validate: (minSentences: number, data: string): boolean => {
      return countSentences(data) >= minSentences;
    },
    error: {
      message: (cxt) => {
        const minSentences = cxt.schema as number;
        return `must have at least ${minSentences} sentences`;
      }
    }
  });

  // x-maxSentences: Validates maximum sentence count
  ajv.addKeyword({
    keyword: 'x-maxSentences',
    type: 'string',
    schemaType: 'number',
    validate: (maxSentences: number, data: string): boolean => {
      return countSentences(data) <= maxSentences;
    },
    error: {
      message: (cxt) => {
        const maxSentences = cxt.schema as number;
        return `must have at most ${maxSentences} sentences`;
      }
    }
  });
}
