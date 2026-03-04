/**
 * Verity CLI — File Loading Utilities
 *
 * Loads and parses JSON files with descriptive error messages.
 */

import { readFileSync } from "node:fs";

/**
 * Load and parse a JSON file from disk.
 *
 * @param filePath - Absolute or relative path to the JSON file
 * @returns The parsed JSON value
 * @throws Error with descriptive message on read or parse failure
 */
export function loadJsonFile(filePath: string): unknown {
  let raw: string;
  try {
    raw = readFileSync(filePath, "utf-8");
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      throw new Error(`File not found: ${filePath}`);
    }
    if (code === "EACCES") {
      throw new Error(`Permission denied: ${filePath}`);
    }
    throw new Error(
      `Failed to read file ${filePath}: ${err instanceof Error ? err.message : "unknown error"}`,
    );
  }

  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new Error(`Failed to parse JSON in ${filePath}: invalid JSON syntax`);
  }
}
