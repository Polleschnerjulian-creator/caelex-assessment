/**
 * Structured JSON logger with automatic redaction of sensitive fields.
 *
 * REDACTION RULES — these fields MUST NEVER appear in logs:
 *  - private keys (encrypted or plaintext)
 *  - API key plaintext (log only key_prefix)
 *  - blinding factors
 *  - commitment inputs
 *  - actual measurement values
 *  - full request bodies (log only field names and types)
 *  - full signatures (log only first 16 hex chars)
 */

type LogLevel = "info" | "warn" | "error";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  [key: string]: unknown;
}

/** Field names that must never appear unredacted in log output. */
const SENSITIVE_FIELDS = new Set([
  "private_key",
  "privateKey",
  "private_key_encrypted",
  "encrypted_private_key",
  "secret",
  "api_key",
  "apiKey",
  "api_key_hash",
  "blinding_factor",
  "blindingFactor",
  "commitment_input",
  "commitmentInput",
  "measurement_value",
  "measurementValue",
  "actual_value",
  "actualValue",
  "password",
  "token",
  "authorization",
]);

/** Fields that contain hex signatures — log only first 16 chars. */
const SIGNATURE_FIELDS = new Set([
  "signature",
  "attester_signature",
  "issuer_signature",
  "operator_signature",
]);

/** Fields that represent request bodies — log only field names + types. */
const BODY_FIELDS = new Set(["body", "request_body", "requestBody", "payload"]);

function summarizeBody(value: unknown): string {
  if (value === null || value === undefined) {
    return String(value);
  }
  if (typeof value !== "object") {
    return `(${typeof value})`;
  }
  if (Array.isArray(value)) {
    return `[Array(${String(value.length)})]`;
  }
  const keys = Object.keys(value as Record<string, unknown>);
  const summary = keys.map((k) => {
    const v = (value as Record<string, unknown>)[k];
    const t = v === null ? "null" : Array.isArray(v) ? "array" : typeof v;
    return `${k}:${t}`;
  });
  return `{${summary.join(", ")}}`;
}

/**
 * Recursively redacts sensitive fields from an object.
 * Returns a new object — never mutates the input.
 */
export function redactObject(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => redactObject(item));
  }

  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();

    if (SENSITIVE_FIELDS.has(key) || SENSITIVE_FIELDS.has(lowerKey)) {
      redacted[key] = "[REDACTED]";
    } else if (SIGNATURE_FIELDS.has(key) || SIGNATURE_FIELDS.has(lowerKey)) {
      if (typeof value === "string" && value.length > 16) {
        redacted[key] = value.slice(0, 16) + "...";
      } else {
        redacted[key] = value;
      }
    } else if (BODY_FIELDS.has(key) || BODY_FIELDS.has(lowerKey)) {
      redacted[key] = summarizeBody(value);
    } else if (typeof value === "object" && value !== null) {
      redacted[key] = redactObject(value);
    } else {
      redacted[key] = value;
    }
  }

  return redacted;
}

class Logger {
  private readonly service: string;

  constructor(service = "verity-server") {
    this.service = service;
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.log("info", message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.log("warn", message, meta);
  }

  error(message: string, meta?: Record<string, unknown>): void {
    this.log("error", message, meta);
  }

  private log(
    level: LogLevel,
    message: string,
    meta?: Record<string, unknown>,
  ): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.service,
      message,
    };

    if (meta) {
      const redacted = redactObject(meta) as Record<string, unknown>;
      Object.assign(entry, redacted);
    }

    const line = JSON.stringify(entry);

    if (level === "error") {
      process.stderr.write(line + "\n");
    } else {
      process.stdout.write(line + "\n");
    }
  }
}

export const logger = new Logger();
