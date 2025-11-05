/**
 * Helper to set values at dot-notation paths with array support
 *
 * Examples:
 * - setByPath(obj, "header.title", "My Title")
 * - setByPath(obj, "diagnoses[0].code", "F33.1")
 */
export function setByPath(obj: any, path: string, value: any): void {
  const segments = path.split('.');
  let current = obj;

  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i];

    // Handle array index: "diagnoses[0]"
    const arrayMatch = segment.match(/^(.+)\[(\d+)\]$/);
    if (arrayMatch) {
      const key = arrayMatch[1];
      const index = parseInt(arrayMatch[2], 10);

      if (!current[key]) current[key] = [];
      if (!current[key][index]) current[key][index] = {};
      current = current[key][index];
    } else {
      if (!current[segment]) current[segment] = {};
      current = current[segment];
    }
  }

  // Set final value
  const lastSegment = segments[segments.length - 1];
  const arrayMatch = lastSegment.match(/^(.+)\[(\d+)\]$/);

  if (arrayMatch) {
    const key = arrayMatch[1];
    const index = parseInt(arrayMatch[2], 10);
    if (!current[key]) current[key] = [];
    current[key][index] = value;
  } else {
    current[lastSegment] = value;
  }
}
