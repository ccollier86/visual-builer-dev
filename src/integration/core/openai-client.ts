/**
 * OpenAI Client Setup
 *
 * Creates and configures OpenAI client instance with API key from environment.
 * Following DI principle: returns configured instance to be injected into generators.
 */

import OpenAI from 'openai';

/**
 * Creates OpenAI client configured with API key from environment
 *
 * @throws {Error} If OPENAI_API_KEY not found in environment
 * @returns Configured OpenAI client instance
 */
export function createOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      'OPENAI_API_KEY not found in environment. ' +
      'Set the OPENAI_API_KEY environment variable to use OpenAI integration.'
    );
  }

  return new OpenAI({
    apiKey,
  });
}
