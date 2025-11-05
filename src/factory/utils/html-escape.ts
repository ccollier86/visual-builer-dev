// HTML escaping utilities
// Prevents XSS by escaping HTML special characters

/**
 * Escapes HTML special characters for safe content rendering
 * Converts: & < > "
 */
export function escapeHtml(text: string): string {
  const replacements: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
  };
  return text.replace(/[&<>"]/g, (char) => replacements[char]!);
}

/**
 * Escapes HTML for use in attributes
 * Same as escapeHtml but ensures quotes are escaped
 */
export function escapeAttr(text: string): string {
  return escapeHtml(text).replace(/"/g, "&quot;");
}
