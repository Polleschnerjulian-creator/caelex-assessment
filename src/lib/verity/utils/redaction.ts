/**
 * Redaction for logging and error messages.
 *
 * An actual_value MUST NEVER appear in logs, error messages, or console output.
 * This utility ensures that.
 */

const REDACTED_FIELDS = [
  "actual_value",
  "value",
  "blinding_factor",
  "secret",
  "privateKey",
  "private_key",
  "encryptedPrivKey",
  "VERITY_MASTER_KEY",
  "SENTINEL_TOKEN",
  "password",
];

/**
 * Creates a log-safe copy of an object.
 * Sensitive fields are replaced with "[REDACTED]".
 */
export function redact(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (
      REDACTED_FIELDS.some((f) => key.toLowerCase().includes(f.toLowerCase()))
    ) {
      result[key] = "[REDACTED]";
    } else if (val && typeof val === "object" && !Array.isArray(val)) {
      result[key] = redact(val as Record<string, unknown>);
    } else {
      result[key] = val;
    }
  }
  return result;
}

/**
 * Safe logger that automatically redacts sensitive data.
 * Use this instead of console.log in all Verity modules.
 */
export function safeLog(message: string, data?: Record<string, unknown>): void {
  if (data) {
    console.log(`[Verity] ${message}`, redact(data));
  } else {
    console.log(`[Verity] ${message}`);
  }
}
