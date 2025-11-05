/**
 * Helper to set values at dot-notation paths with array support
 *
 * Examples:
 * - setByPath(obj, "header.title", "My Title")
 * - setByPath(obj, "diagnoses[0].code", "F33.1")
 */
export function setByPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  const segments = path.split('.');
  let current: Record<string, unknown> | unknown[] = obj;

  for (let i = 0; i < segments.length - 1; i++) {
    const { key, index } = parseSegment(segments[i]);

    if (Array.isArray(current)) {
      if (index === undefined) {
        throw new Error(`Array segment must include index in path: ${segments[i]}`);
      }

      ensureArrayLength(current, index + 1);
      if (!isPlainObject(current[index])) {
        current[index] = {};
      }

      current = current[index] as Record<string, unknown>;
      continue;
    }

    if (index !== undefined) {
      const array = Array.isArray(current[key]) ? (current[key] as unknown[]) : [];
      if (!Array.isArray(current[key])) {
        current[key] = array;
      }
      ensureArrayLength(array, index + 1);
      if (!isPlainObject(array[index])) {
        array[index] = {};
      }
      current = array[index] as Record<string, unknown>;
      continue;
    }

    if (!isPlainObject(current[key])) {
      current[key] = {};
    }

    current = current[key] as Record<string, unknown>;
  }

  const { key: lastKey, index: lastIndex } = parseSegment(segments[segments.length - 1]);

  if (Array.isArray(current)) {
    if (lastIndex === undefined) {
      throw new Error(`Array segment must include index in path: ${segments[segments.length - 1]}`);
    }
    ensureArrayLength(current, lastIndex + 1);
    current[lastIndex] = value;
    return;
  }

  if (lastIndex !== undefined) {
    const array = Array.isArray(current[lastKey]) ? (current[lastKey] as unknown[]) : [];
    if (!Array.isArray(current[lastKey])) {
      current[lastKey] = array;
    }
    ensureArrayLength(array, lastIndex + 1);
    array[lastIndex] = mergeValues(array[lastIndex], value);
  } else {
    const existing = current[lastKey];
    current[lastKey] = mergeValues(existing, value);
  }
}

function parseSegment(segment: string): { key: string; index?: number } {
  const arrayMatch = segment.match(/^(.+)\[(\d+)\]$/);
  if (arrayMatch) {
    return { key: arrayMatch[1], index: parseInt(arrayMatch[2], 10) };
  }

  return { key: segment };
}

function ensureArrayLength(array: unknown[], length: number): void {
  while (array.length < length) {
    array.push(undefined);
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mergeValues(existing: unknown, incoming: unknown): unknown {
  if (Array.isArray(existing) && Array.isArray(incoming)) {
    return mergeArrays(existing, incoming);
  }

  if (isPlainObject(existing) && isPlainObject(incoming)) {
    return { ...existing, ...incoming };
  }

  return incoming;
}

function mergeArrays(existing: unknown[], incoming: unknown[]): unknown[] {
  const length = Math.max(existing.length, incoming.length);
  const merged: unknown[] = new Array(length);

  for (let i = 0; i < length; i++) {
    const left = existing[i];
    const right = incoming[i];

    if (right === undefined) {
      merged[i] = left;
      continue;
    }

    if (isPlainObject(left) && isPlainObject(right)) {
      merged[i] = { ...left, ...right };
      continue;
    }

    if (Array.isArray(left) && Array.isArray(right)) {
      merged[i] = mergeArrays(left, right);
      continue;
    }

    merged[i] = right ?? left;
  }

  return merged;
}
