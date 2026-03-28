/**
 * Prompt Injection Sanitization
 *
 * Sanitizes user-provided strings before interpolation into AI system prompts.
 * Prevents prompt injection attacks where malicious org names, jurisdiction values,
 * or other user-controlled fields could alter ASTRA's behavior.
 */

/**
 * Sanitize user-provided strings before interpolating into system prompts.
 * Removes characters that could break prompt structure or inject instructions:
 * - Quotes (", ') to prevent breaking out of string contexts
 * - Newlines (\n, \r) to prevent creating new prompt sections
 * - Tabs (\t) to prevent whitespace-based injection
 * - Backslashes (\) to prevent escape sequence injection
 * - Semicolons (;) to prevent instruction delimiter injection
 * - Curly braces ({, }) to prevent template literal injection
 */
export function sanitizeForPrompt(
  value: string | null | undefined,
  maxLength = 200,
): string {
  if (!value) return "Unknown";
  return value
    .replace(/["'\n\r\t\\;{}]/g, "") // Remove dangerous characters
    .trim()
    .substring(0, maxLength);
}
