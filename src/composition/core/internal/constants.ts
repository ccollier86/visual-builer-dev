/**
 * Composition Core Constants
 *
 * Domain: composition/core/internal
 * Responsibility: Share constant allowlists used by field guide sanitizers.
 *
 * SOR: Central repository for composition-specific constant values.
 * SOD: Provides immutable allowlists without side effects.
 * DI: Imported by composition helpers that need shared constants.
 */

export const STYLE_HINT_KEYS = ['tone', 'tableCell'] as const;

export const TABLE_CELL_STYLE_KEYS = ['role', 'columnIndex', 'muted', 'italic', 'bold', 'emphasis'] as const;
