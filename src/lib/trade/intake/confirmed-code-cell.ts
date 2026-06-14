/**
 * Caelex Passage — shared, client-safe mapper: a confirmed control code → the
 * TradeItem regime cell it belongs on.
 *
 * THE single source of truth for "which column does this confirmed code land
 * on". Used by BOTH:
 *   - the client (/trade/assess AssessFlow.handleConfirm) — to thread the
 *     confirmed code onto the in-memory item it hands to the landscape engine
 *     (without this, a confirmed controlled item reaches the engine code-less
 *     and classifies as UNCONTROLLED → fail-open GO to embargoed destinations);
 *   - the server (POST /api/trade/assess/from-datasheet regimeCellPatch) — to
 *     persist the confirmed code onto the right TradeItem column.
 *
 * Keeping ONE mapper kills the "second copy drifts" risk: the cell the client
 * classifies against is byte-identical to the cell the route persists.
 *
 * PURE — no I/O, no DB, no `import "server-only"`. Safe to import on the client.
 * The mapper MIS-ROUTES NOTHING onto a typed regime cell: an unrecognised
 * regime + unrecognised prefix never guesses a column. But a confirmed code is
 * NEVER silently dropped — when no engine-readable cell resolves, the code is
 * carried as `declaredOtherCode` (regime + bare code) so the verdict engine
 * treats the item as a CONTROLLED good and fails closed (B2). Returning {} for
 * an unmappable confirmed code is the fail-open the engine cluster slipped
 * through: a controlled JP-METI / NSG / RU-833 / Wassenaar item reached the
 * landscape code-less → classified UNCONTROLLED → GO incl. to RU/BY.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

/** The five TradeItem regime columns a confirmed code can land on. */
export type RegimeCell =
  | "eccnEU"
  | "eccnUS"
  | "usmlCategory"
  | "mtcrCategory"
  | "germanAlEntry";

/**
 * The patch `confirmedCodeCell` returns. EITHER a typed regime cell (the five
 * columns above — these map to real TradeItem DB columns and are safe to spread
 * onto a Prisma `create`), OR `declaredOtherCode` for a confirmed code that maps
 * to no engine-readable cell. `declaredOtherCode` is NOT a DB column — the
 * verdict engine reads it (fail-closed), and the persist path drops it (see the
 * route's `regimeCellPatch`). The two are mutually exclusive by construction.
 */
export type ConfirmedCodePatch = Partial<Record<RegimeCell, string>> & {
  declaredOtherCode?: { regime: string; code: string };
};

export interface ConfirmedCodeInput {
  /** The load-bearing field, e.g. "EU:9A004" / "ECCN:9A515.a.1" / "USML:XV(e)(16)". */
  canonicalId: string;
  /** The corpus RegimeName, e.g. "EU-ANNEX-I" / "EAR-CCL" / "ITAR-USML". */
  regime?: string;
  /** Explicit cells (when the wizard already knows the exact column) — these win. */
  eccnEU?: string;
  eccnUS?: string;
  usmlCategory?: string;
  mtcrCategory?: string;
  germanAlEntry?: string;
}

/** Strip the "PREFIX:" so the cell holds the bare code ("EU:9A004" → "9A004"). */
function bareCode(canonicalId: string): string {
  const colon = canonicalId.indexOf(":");
  return colon === -1 ? canonicalId : canonicalId.slice(colon + 1);
}

/**
 * Map the corpus RegimeName → the TradeItem cell. Aligned with `RegimeName` in
 * control-list-cross-walk.ts. Unknown / multilateral-only / sanctions-annex
 * regimes (Wassenaar, NSG, JP-METI, RUSSIA-833-*, OTHER) have no dedicated cell
 * → null (the canonicalId-prefix fallback may still resolve it; otherwise {}).
 */
function cellForRegime(regime: string | undefined): RegimeCell | null {
  switch (regime) {
    case "EU-ANNEX-I":
      return "eccnEU";
    case "EAR-CCL":
      return "eccnUS";
    case "ITAR-USML":
      return "usmlCategory";
    case "MTCR-ANNEX":
      return "mtcrCategory";
    case "DE-AL-TEIL-IB":
      return "germanAlEntry";
    default:
      return null;
  }
}

/**
 * Map the canonicalId regime PREFIX → the TradeItem cell. The prefix (e.g. "EU"
 * in "EU:9A004") is the stable corpus key. THE single prefix→cell mapper —
 * `auto-classify-on-create.fieldForCanonicalId` delegates here so the two paths
 * can never drift (the bug the dedupe closes: the auto-classify copy lacked the
 * DE-AL prefix, silently dropping a German-Ausfuhrliste suggestion). Unknown →
 * null (never mis-route a code onto the wrong column).
 */
export function cellForCanonicalIdPrefix(
  canonicalId: string,
): RegimeCell | null {
  const colon = canonicalId.indexOf(":");
  if (colon === -1) return null;
  switch (canonicalId.slice(0, colon)) {
    case "USML":
      return "usmlCategory";
    case "MTCR":
      return "mtcrCategory";
    case "ECCN":
      return "eccnUS"; // US Commerce Control List (EAR)
    case "EU":
      return "eccnEU"; // EU dual-use Annex I
    case "DE-AL":
      return "germanAlEntry"; // German Ausfuhrliste Teil I B
    default:
      return null;
  }
}

/**
 * Resolve which TradeItem column the confirmed code lands on, as a partial
 * patch ready to spread onto an item.
 *
 * Precedence:
 *   1. An explicit cell (eccnEU/eccnUS/usmlCategory/mtcrCategory/germanAlEntry)
 *      always wins — the wizard already pinned the exact column.
 *   2. Else map by `regime` (RegimeName).
 *   3. Else map by the canonicalId PREFIX.
 *   4. Else — a confirmed code on a regime with NO engine-readable cell — carry
 *      it as `declaredOtherCode` (regime + bare code). FAIL-CLOSED (B2): the
 *      verdict engine treats it as a controlled good. NEVER returns {} for a
 *      confirmed code; only a truly empty input (no cell, no canonicalId) is {}.
 */
export function confirmedCodeCell(
  input: ConfirmedCodeInput,
): ConfirmedCodePatch {
  // 1. Explicit cells win (first non-empty in a stable order).
  if (input.eccnEU) return { eccnEU: input.eccnEU };
  if (input.eccnUS) return { eccnUS: input.eccnUS };
  if (input.usmlCategory) return { usmlCategory: input.usmlCategory };
  if (input.mtcrCategory) return { mtcrCategory: input.mtcrCategory };
  if (input.germanAlEntry) return { germanAlEntry: input.germanAlEntry };

  const canonicalId = input.canonicalId?.trim();
  if (!canonicalId) return {};

  // 2. Map by regime, else 3. by canonicalId prefix.
  const cell =
    cellForRegime(input.regime) ?? cellForCanonicalIdPrefix(canonicalId);
  if (cell) return { [cell]: bareCode(canonicalId) };

  // 4. No engine-readable cell — carry the code as declaredOtherCode so the
  // verdict engine fails closed. A confirmed code is NEVER silently dropped.
  return {
    declaredOtherCode: {
      regime: input.regime ?? canonicalId.split(":")[0] ?? "OTHER",
      code: bareCode(canonicalId),
    },
  };
}
