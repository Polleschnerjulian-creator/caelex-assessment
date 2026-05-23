/**
 * Caelex Trade — BOM De Minimis ↔ Three-Gate Cascade adapter.
 *
 * Sprint Z12. Tier 5 per the Living Execution Plan.
 *
 * Bridges the Z12 BOM-level data shape (`BomLine`) to the existing
 * Three-Gate Cascade input shape (`CascadeBOMComponent` —
 * `src/lib/trade/subject-to-ear/cascade.ts`). DOES NOT modify the
 * cascade engine itself.
 *
 * Why an adapter rather than a direct shared type? The two shapes
 * have intentionally different responsibilities:
 *
 *   - `BomLine`             — minimal § 734.4 percentage math fields
 *                             (origin, ECCN, FMV). Stable for operator
 *                             data entry + storage.
 *   - `CascadeBOMComponent` — adds USML routing, FDPR provenance,
 *                             carve-out facts. Driven by the cascade's
 *                             internal needs; may grow as FDPR rules
 *                             expand (Z20).
 *
 * Keeping them decoupled means an operator's BOM can be ingested,
 * persisted, and visualised without forcing every storage path to know
 * about every FDPR scenario the cascade evaluates.
 *
 * Pure function — no I/O.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { CascadeBOMComponent } from "../subject-to-ear/cascade";
import type { BomLine } from "./calculator";

// ─── Adapter input shape ────────────────────────────────────────────

/**
 * Augmented BOM line for the cascade adapter. Extends the minimal
 * `BomLine` with optional fields the cascade's downstream gates
 * consult (Gate 1 ITAR see-through, Gate 2 FDPR provenance).
 *
 * Callers that don't have these provenance fields can omit them —
 * the cascade treats absent provenance as "no FDPR trigger".
 */
export interface BomLineWithProvenance extends BomLine {
  /**
   * True if the upstream classifier (Z3 matcher) flagged this line as
   * USML-controlled. Drives Gate 1 (ITAR see-through stop) in the
   * cascade. When not supplied, derived from the ECCN prefix.
   */
  isUSML?: boolean;
  /**
   * True if this USML line falls within a published USML→EAR carve-out
   * (e.g. USML XV(c)(3) / XV(e) certain paragraphs when integrated
   * into 9A610 aircraft).
   */
  usmlCarveOutToEar?: boolean;
  // ── Gate 2 (FDPR) provenance fields ────────────────────────────
  /** True if the foreign manufacturer used US-origin technology. */
  madeWithUSTechnology?: boolean;
  /** Specific US technology ECCNs used. */
  usTechnologyEccns?: string[];
  /** True if the foreign manufacturer used US-origin software. */
  madeWithUSSoftware?: boolean;
  /** Specific US software ECCNs used. */
  usSoftwareEccns?: string[];
  /**
   * True if the foreign manufacturer's plant (or major component) is
   * itself the direct product of US-origin technology.
   */
  producedByPlantThatIsUSDirectProduct?: boolean;
  /** Specific US technology ECCNs the plant is a direct product of. */
  plantTechEccns?: string[];
}

// ─── Helpers ────────────────────────────────────────────────────────

/**
 * Heuristic: derive `isUSML` from an ECCN string if the caller didn't
 * supply it explicitly. The cascade's Gate 1 needs a hard signal;
 * this lets the adapter compute one from the ECCN form.
 */
function deriveIsUsml(eccn: string, explicit: boolean | undefined): boolean {
  if (explicit !== undefined) return explicit;
  const trimmed = eccn.trim().toUpperCase();
  return trimmed.startsWith("USML") || trimmed.startsWith("ITAR");
}

// ─── Adapter ────────────────────────────────────────────────────────

/**
 * Convert a Caelex `BomLine` (with optional provenance) into the
 * cascade's `CascadeBOMComponent` shape. One-to-one mapping; the
 * adapter exists to keep the two shapes decoupled.
 *
 * The cascade's `BOMComponentForCarveOut` base requires:
 *   - `nodeId`             ← `line.nodeId`
 *   - `usOrigin`           ← `line.usOrigin`
 *   - `eccn`               ← `line.eccn`
 *   - `fairMarketValueEur` ← `line.fairMarketValueEur`
 *   - `description` (opt)  ← `line.description`
 *
 * The cascade extends with:
 *   - `isUSML` + `usmlCarveOutToEar` (Gate 1)
 *   - FDPR provenance fields (Gate 2)
 *
 * @example
 *   const bom = item.bom.map(bomLineToCascadeBomComponent);
 *   const result = evaluateSubjectToEAR({ destinationCountry: "CN", bom, ... });
 */
export function bomLineToCascadeBomComponent(
  line: BomLineWithProvenance,
): CascadeBOMComponent {
  return {
    // ── Base (BOMComponentForCarveOut) ─────────────────────────
    nodeId: line.nodeId,
    description: line.description,
    usOrigin: line.usOrigin,
    eccn: line.eccn,
    fairMarketValueEur: line.fairMarketValueEur,
    // ── Gate 1 (ITAR see-through) ──────────────────────────────
    isUSML: deriveIsUsml(line.eccn, line.isUSML),
    usmlCarveOutToEar: line.usmlCarveOutToEar,
    // ── Gate 2 (FDPR provenance) ───────────────────────────────
    madeWithUSTechnology: line.madeWithUSTechnology,
    usTechnologyEccns: line.usTechnologyEccns,
    madeWithUSSoftware: line.madeWithUSSoftware,
    usSoftwareEccns: line.usSoftwareEccns,
    producedByPlantThatIsUSDirectProduct:
      line.producedByPlantThatIsUSDirectProduct,
    plantTechEccns: line.plantTechEccns,
  };
}

/**
 * Bulk-adapter: convert an entire BOM (array of `BomLineWithProvenance`)
 * into the cascade's BOM-component array. Sugar around `Array.map()`.
 */
export function bomToCascadeBom(
  bom: BomLineWithProvenance[],
): CascadeBOMComponent[] {
  return bom.map(bomLineToCascadeBomComponent);
}
