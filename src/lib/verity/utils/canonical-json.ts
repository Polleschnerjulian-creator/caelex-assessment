/**
 * Deterministic JSON serialization for cryptographic purposes.
 *
 * Rules:
 * 1. Object keys are RECURSIVELY sorted alphabetically (all levels)
 * 2. Arrays retain their order (not sorted)
 * 3. Date → ISO 8601 string
 * 4. undefined → throw Error (not allowed in canonical JSON)
 * 5. NaN, Infinity, -Infinity → throw Error
 * 6. null → "null"
 * 7. No whitespace, no BOM, UTF-8
 * 8. Numbers: Standard JSON serialization (no trailing zeros, no leading plus)
 *
 * Guarantee: Identical objects → identical string → identical hash
 * on ANY system, in ANY Node.js version.
 */
export function canonicalJsonStringify(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined)
    throw new Error("Canonical JSON: undefined is not allowed");

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(`Canonical JSON: ${value} is not allowed (NaN/Infinity)`);
    }
    return JSON.stringify(value);
  }

  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return JSON.stringify(value);

  if (value instanceof Date) {
    return JSON.stringify(value.toISOString());
  }

  if (Array.isArray(value)) {
    const items = value.map((item) => canonicalJsonStringify(item));
    return `[${items.join(",")}]`;
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const sortedKeys = Object.keys(obj).sort();
    const pairs: string[] = [];
    for (const key of sortedKeys) {
      // CRITICAL: undefined MUST throw, NOT skip.
      // If two parties have the same object with/without an undefined property,
      // they MUST NOT produce the same hash.
      if (obj[key] === undefined) {
        throw new Error(
          `Canonical JSON: property "${key}" is undefined. Remove it or set to null.`,
        );
      }
      pairs.push(`${JSON.stringify(key)}:${canonicalJsonStringify(obj[key])}`);
    }
    return `{${pairs.join(",")}}`;
  }

  throw new Error(`Canonical JSON: unsupported type ${typeof value}`);
}
