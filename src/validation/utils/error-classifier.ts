import type { ErrorObject } from 'ajv';
import { SOFT_TEXT_KEYWORD_SET } from '../constants';

/**
 * Classified validation messages organised into fatal errors and warnings.
 */
export interface ClassifiedValidationMessages {
  errors: ErrorObject[];
  warnings: ErrorObject[];
}

/**
 * Partition AJV validation messages into fatal errors and downgraded warnings.
 *
 * @param messages - Raw AJV validation messages
 * @returns Partitioned errors and warnings
 */
export function partitionValidationMessages(messages: ErrorObject[]): ClassifiedValidationMessages {
  if (messages.length === 0) {
    return { errors: [], warnings: [] };
  }

  const errors: ErrorObject[] = [];
  const warnings: ErrorObject[] = [];

  for (const message of messages) {
    if (shouldDowngradeToWarning(message)) {
      warnings.push(message);
    } else {
      errors.push(message);
    }
  }

  return { errors, warnings };
}

/**
 * Determine whether the given message should be treated as a warning.
 *
 * @param message - AJV validation message
 * @returns True when message qualifies as a warning
 */
function shouldDowngradeToWarning(message: ErrorObject): boolean {
  if (!message.keyword) {
    return false;
  }

  return SOFT_TEXT_KEYWORD_SET.has(message.keyword);
}
