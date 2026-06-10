/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * nis2TranspositionSuffix — the §6 verdict-header "(DE transposition —
 * NIS2UmsuCG)" suffix (plan Task 3.3).
 *
 * PURE module (no "use client", no server-only, no React): the full-result
 * PAGE calls it server-side while the tests exercise it directly — it must
 * not live inside a client-boundary file (a non-component export of a
 * "use client" module is a client reference on the server, not a callable).
 *
 * DATA-driven only — never a hardcoded member-state string:
 *   - `in_force` with a verified act name → "DE transposition — NIS2UmsuCG"
 *   - `unverified` (or a malformed in_force entry with no act name — an act
 *     name is NEVER invented, gateway Rule 7 invariant) →
 *     "DE transposition status unverified"
 *   - empty input → null (no suffix rendered)
 * Multiple member states join with " · " inside one parenthesis.
 */

// Type-only import — erased at compile time; the server module never loads.
import type { MSTransposition } from "@/lib/assessment/nis2-gateway.server";

export function nis2TranspositionSuffix(
  transpositions: readonly MSTransposition[],
): string | null {
  if (!Array.isArray(transpositions) || transpositions.length === 0) {
    return null;
  }
  const parts = transpositions.map((t) => {
    const code = t.state.toUpperCase();
    if (t.status === "in_force" && t.actName) {
      return `${code} transposition — ${t.actName}`;
    }
    return `${code} transposition status unverified`;
  });
  return `(${parts.join(" · ")})`;
}
