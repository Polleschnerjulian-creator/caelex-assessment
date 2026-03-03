import { createHash } from "node:crypto";

/**
 * Produces a deterministic SHA-256 hash of any object.
 * Keys are sorted to ensure canonical JSON representation.
 */
export function hashContent(data: unknown): string {
  const canonical = canonicalize(data);
  const hash = createHash("sha256").update(canonical).digest("hex");
  return `sha256:${hash}`;
}

/**
 * Canonical JSON — sorted keys at every nesting level.
 * This ensures the same object always produces the same hash
 * regardless of property insertion order.
 */
function canonicalize(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);

  if (Array.isArray(value)) {
    return "[" + value.map((v) => canonicalize(v)).join(",") + "]";
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    const pairs = keys.map(
      (k) => `${JSON.stringify(k)}:${canonicalize(obj[k])}`,
    );
    return "{" + pairs.join(",") + "}";
  }

  return String(value);
}
