/**
 * Design Tokens - Token Hasher
 *
 * Domain: tokens/core
 * Responsibility: Create stable, deterministic hashes from token objects
 */

import { createHash } from 'crypto';
import type { DesignTokens } from '../types.js';

/**
 * Hash design tokens for cache key generation
 *
 * Creates a stable, deterministic hash from tokens JSON.
 * Same tokens always produce the same hash.
 *
 * @param tokens - Design tokens to hash
 * @returns 10-character hex hash for use in filenames (e.g., note.a1b2c3d4e5.css)
 */
export function hashTokens(tokens: DesignTokens): string {
  const normalized = JSON.stringify(tokens, Object.keys(tokens).sort());
  const hash = createHash('sha256').update(normalized, 'utf8').digest('hex');
  return hash.slice(0, 10);
}
