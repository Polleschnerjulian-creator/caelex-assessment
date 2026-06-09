import "server-only";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Pre-ship precondition gate (Passage genial — P0 / fix G1).
 *
 * THE PROBLEM (2026-05-30 audit): the `LICENSED → EXECUTED` transition in
 * `api/trade/operations/[id]/route.ts` was gated on the ENUM VALUE ALONE.
 * The route never re-checked that every line is covered by a valid licence,
 * that the counterparty's screening is CLEAR, or that catch-all / notification
 * duties were discharged. An operator could advance an operation still showing
 * a Catch-all banner or a POTENTIAL_MATCH counterparty straight to "Executed".
 *
 * THE FIX (this module): BEFORE the route allows `LICENSED → EXECUTED`, it
 * RE-RUNS the conservative assess engine (`assessOperation`) and layers an
 * explicit per-line licence-coverage check + screening + catch-all/notification
 * verification on top. If anything is unresolved it returns a structured set of
 * SPECIFIC reasons (machine + human-readable) wrapped in the universal
 * `ExplainedResult` envelope, so the reasons carry WHAT / WHY / WHEREFORE /
 * SOURCES and render through `<ExplainedPanel>`.
 *
 * LEGAL INVARIANTS (preserved, never weakened):
 *   - This gate is ADDITIVE. It can only make `LICENSED → EXECUTED` HARDER,
 *     never easier. It never turns a non-GO into a pass.
 *   - It FAILS CLOSED: any engine failure, missing data, or stale screening
 *     yields a non-clear precondition (passed = false), never a silent pass.
 *   - A `verdict === "BLOCKED"` operation is `hardBlocked` — it can NOT be
 *     overridden to EXECUTED at all (the route refuses; only REVIEW-level
 *     gaps are eligible for a conscious, logged human override).
 *   - The engine stays the decision-of-record. This module re-uses
 *     `assessOperation`'s conservative three-valued verdict verbatim and only
 *     ADDS coverage checks the verdict does not already perform line-by-line.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  assessOperation,
  OperationNotFoundError,
} from "@/lib/trade/operation-assistant.server";
import type { ExplainedResult } from "@/lib/comply-v2/trade/explained-result";

export { OperationNotFoundError };

/** Stable machine codes for each unresolved-precondition reason. */
export type ShipGateReasonCode =
  | "VERDICT_BLOCKED"
  | "VERDICT_REVIEW"
  | "LINE_UNCOVERED"
  | "LICENSE_NOT_ACTIVE"
  | "LICENSE_CODE_NOT_COVERED"
  | "LICENSE_DEST_NOT_COVERED"
  | "SCREENING_NOT_CLEAR"
  | "CATCH_ALL_OPEN"
  | "NOTIFICATION_DUTY_OPEN"
  | "ENGINE_ERROR";

/** Severity of a single unresolved reason. */
export type ShipGateSeverity = "BLOCKING" | "GAP";

export interface ShipGateReason {
  /** Stable machine code (for clients / tests / analytics). */
  code: ShipGateReasonCode;
  /** Human-readable, operator-facing reason (German — DE/EU-first). */
  message: string;
  /**
   * BLOCKING = a hard block that can NOT be overridden to EXECUTED
   * (sanctions hit, ITAR/embargo/Annex-IV/MTCR-Cat-I hard block).
   * GAP = an unresolved precondition a NAMED human MAY consciously
   * override with a logged justification.
   */
  severity: ShipGateSeverity;
  /** Optional line this reason attaches to (for line-level coverage gaps). */
  lineId?: string;
  itemName?: string;
}

/** The machine-readable value carried inside the ExplainedResult envelope. */
export interface ShipGatePreconditionValue {
  operationId: string;
  /** True only when EVERY precondition is satisfied (verdict GO + all lines covered + screening CLEAR + no open catch-all/notification). */
  passed: boolean;
  /**
   * True when at least one reason is BLOCKING. A hard-blocked operation can
   * NOT be overridden to EXECUTED at all — the route refuses outright.
   */
  hardBlocked: boolean;
  /** The conservative engine verdict, surfaced verbatim. */
  verdict: "GO" | "REVIEW" | "BLOCKED";
  /** The specific unresolved reasons (empty iff passed === true). */
  reasons: ShipGateReason[];
}

/**
 * The default ExplainedResult source — the conservative assess engine plus the
 * structured EU/DE legal bases the precondition checks rest on.
 */
const GATE_SOURCES: ExplainedResult<ShipGatePreconditionValue>["sources"] = [
  {
    label: "Ausfuhrvorgang-Assistent (deterministische Engine)",
    citation:
      "Caelex Passage — assessOperation() · klassifiziert jede Zeile, screent die Gegenpartei, leitet den Genehmigungsbedarf konservativ (dreiwertig) ab.",
  },
  {
    label: "Genehmigungs- & Meldepflichten",
    citation:
      "VO (EU) 2021/821 (Dual-Use) · §§ 8, 9 AWV (Catch-all / Anzeigepflicht) · VO (EU) 833/2014 Anhang IV · 22 CFR/15 CFR (ITAR/EAR) für US-Anteile.",
  },
];

const SCREENING_STALE_AFTER_DAYS = 30;

/** A license whose status authorizes it to cover a line at ship time. */
function isLicenseUsable(status: string): boolean {
  return status === "ACTIVE";
}

/**
 * Read a string[] off a license `conditions` JSON field defensively.
 * Missing / malformed → empty array (which FAILS CLOSED: an empty
 * coveredCodes means "covers nothing specific" → the line is treated as
 * uncovered, never as universally covered).
 */
function conditionStringArray(
  conditions: unknown,
  key: "coveredCodes" | "coveredCountries",
): string[] {
  if (!conditions || typeof conditions !== "object") return [];
  const raw = (conditions as Record<string, unknown>)[key];
  if (!Array.isArray(raw)) return [];
  return raw.filter((v): v is string => typeof v === "string");
}

/**
 * Re-run the conservative assessment and layer an explicit per-line
 * licence-coverage + screening + catch-all/notification verification on top.
 * Returns the precondition wrapped in the universal ExplainedResult envelope.
 *
 * FAIL-CLOSED guarantee: any thrown engine error (other than not-found, which
 * the caller maps to 404) is caught and degraded to a BLOCKING ENGINE_ERROR
 * reason — never a silent pass.
 */
export async function evaluateShipGate(
  operationId: string,
  ctx: { organizationId: string },
  now: Date = new Date(),
): Promise<ExplainedResult<ShipGatePreconditionValue>> {
  // Pull the row we need for the per-line coverage + catch-all checks. We do
  // this independently of assessOperation so a coverage gap is caught even if
  // the verdict engine's own classification path happens to be lenient.
  const operation = await prisma.tradeOperation.findFirst({
    where: { id: operationId, organizationId: ctx.organizationId },
    select: {
      id: true,
      shipToCountry: true,
      endUseCountry: true,
      catchAllArt4Hit: true,
      catchAllArt5Hit: true,
      catchAllArt9Hit: true,
      catchAllArt10Hit: true,
      para9NuclearHit: true,
      para9MilitaryHit: true,
      notificationDuty: true,
      counterparty: {
        select: {
          legalName: true,
          screeningStatus: true,
          status: true,
          lastScreenedAt: true,
        },
      },
      lines: {
        select: {
          id: true,
          item: {
            select: {
              name: true,
              eccnEU: true,
              eccnUS: true,
              usmlCategory: true,
              mtcrCategory: true,
              germanAlEntry: true,
            },
          },
          appliedLicense: {
            select: { id: true, status: true, conditions: true },
          },
        },
      },
    },
  });
  if (!operation) throw new OperationNotFoundError(operationId);

  const reasons: ShipGateReason[] = [];
  let verdict: ShipGatePreconditionValue["verdict"] = "REVIEW";

  // ── 1. Re-run the conservative engine verdict (the primary gate) ──
  try {
    const assessment = await assessOperation(operationId, ctx);
    verdict = assessment.verdict;

    if (assessment.verdict === "BLOCKED") {
      reasons.push({
        code: "VERDICT_BLOCKED",
        message:
          "Der Ausfuhrvorgang-Assistent stuft den Vorgang als VERBOTEN ein (harte Sperre: ITAR / Embargo / Anhang IV / MTCR Cat-I). Eine Freigabe zu EXECUTED ist nicht möglich.",
        severity: "BLOCKING",
      });
    } else if (assessment.verdict === "REVIEW") {
      // Surface the engine's own open Pendenzen as specific reasons so the
      // operator sees exactly WHAT is unresolved — not a bare "not GO".
      const pendenzLabels = assessment.pendenzen.map((p) => p.label);
      reasons.push({
        code: "VERDICT_REVIEW",
        message:
          pendenzLabels.length > 0
            ? `Offene Punkte vor Lieferung: ${pendenzLabels.join("; ")}.`
            : "Der Ausfuhrvorgang-Assistent meldet offene Punkte (REVIEW) — Lieferung erst nach Klärung.",
        severity: "GAP",
      });
    }
  } catch (err) {
    if (err instanceof OperationNotFoundError) throw err;
    // FAIL CLOSED — an engine failure must never produce a passable gate.
    logger.error("evaluateShipGate: assessOperation failed", err, {
      operationId,
    });
    reasons.push({
      code: "ENGINE_ERROR",
      message:
        "Die Risiko-/Genehmigungsprüfung konnte nicht abgeschlossen werden. Aus Sicherheitsgründen bleibt der Vorgang gesperrt, bis die Prüfung erneut durchläuft.",
      severity: "BLOCKING",
    });
  }

  // ── 2. Screening must be CLEAR (and fresh) ──
  const cp = operation.counterparty;
  const screeningStale =
    cp.screeningStatus === "CLEAR" &&
    !!cp.lastScreenedAt &&
    now.getTime() - cp.lastScreenedAt.getTime() >
      SCREENING_STALE_AFTER_DAYS * 24 * 60 * 60 * 1000;
  if (cp.status === "BLOCKED" || cp.screeningStatus === "CONFIRMED_HIT") {
    reasons.push({
      code: "SCREENING_NOT_CLEAR",
      message: `Gegenpartei „${cp.legalName}“ hat einen bestätigten Sanktionstreffer — Lieferung untersagt.`,
      severity: "BLOCKING",
    });
  } else if (cp.screeningStatus !== "CLEAR") {
    reasons.push({
      code: "SCREENING_NOT_CLEAR",
      message: `Screening der Gegenpartei „${cp.legalName}“ ist nicht CLEAR (Status: ${cp.screeningStatus}). Vor Lieferung klären/neu screenen.`,
      severity: "GAP",
    });
  } else if (screeningStale) {
    reasons.push({
      code: "SCREENING_NOT_CLEAR",
      message: `Screening der Gegenpartei „${cp.legalName}“ ist älter als ${SCREENING_STALE_AFTER_DAYS} Tage — vor Lieferung neu screenen.`,
      severity: "GAP",
    });
  }

  // ── 3. Every line must be covered by an ACTIVE licence for its code+dest ──
  // This is the explicit per-line check the enum-only gate was missing.
  const dest = operation.shipToCountry;
  const endUse = operation.endUseCountry ?? dest;
  for (const line of operation.lines) {
    const lineCodes = [
      line.item.eccnEU,
      line.item.eccnUS,
      line.item.usmlCategory,
      line.item.mtcrCategory,
      line.item.germanAlEntry,
    ].filter((c): c is string => !!c);

    const lic = line.appliedLicense;
    if (!lic) {
      reasons.push({
        code: "LINE_UNCOVERED",
        message: `Artikel „${line.item.name}“ ist keiner gültigen Genehmigung zugeordnet.`,
        severity: "GAP",
        lineId: line.id,
        itemName: line.item.name,
      });
      continue;
    }
    if (!isLicenseUsable(lic.status)) {
      reasons.push({
        code: "LICENSE_NOT_ACTIVE",
        message: `Die Genehmigung für Artikel „${line.item.name}“ ist nicht aktiv (Status: ${lic.status}).`,
        severity: "GAP",
        lineId: line.id,
        itemName: line.item.name,
      });
      continue;
    }

    const coveredCodes = conditionStringArray(lic.conditions, "coveredCodes");
    const coveredCountries = conditionStringArray(
      lic.conditions,
      "coveredCountries",
    );

    // Code coverage: if the line carries control codes, at least one must be
    // covered. A licence with an EMPTY coveredCodes covers nothing specific —
    // that FAILS CLOSED (we do not treat empty as "covers everything").
    if (lineCodes.length > 0) {
      const codeCovered = lineCodes.some((code) =>
        coveredCodes.some(
          (cc) => code === cc || code.startsWith(cc) || cc.startsWith(code),
        ),
      );
      if (!codeCovered) {
        reasons.push({
          code: "LICENSE_CODE_NOT_COVERED",
          message: `Die zugeordnete Genehmigung deckt den Code von „${line.item.name}“ (${lineCodes.join(", ")}) nicht ab.`,
          severity: "GAP",
          lineId: line.id,
          itemName: line.item.name,
        });
      }
    }

    // Destination coverage: an EMPTY coveredCountries is treated as
    // "unrestricted destination" (matches the license-application convention
    // where empty = no country restriction). A NON-empty list must include
    // the ship-to (and end-use) destination.
    if (coveredCountries.length > 0) {
      const destCovered =
        coveredCountries.includes(dest) && coveredCountries.includes(endUse);
      if (!destCovered) {
        reasons.push({
          code: "LICENSE_DEST_NOT_COVERED",
          message: `Die zugeordnete Genehmigung für „${line.item.name}“ deckt das Bestimmungsland (${dest === endUse ? dest : `${dest}/${endUse}`}) nicht ab.`,
          severity: "GAP",
          lineId: line.id,
          itemName: line.item.name,
        });
      }
    }
  }

  // ── 4. Open catch-all / notification duty ──
  // notificationDuty = a catch-all fired AND no covering licence attached yet
  // (§8 AWV Anzeigepflicht). It must be discharged before shipment.
  if (operation.notificationDuty) {
    reasons.push({
      code: "NOTIFICATION_DUTY_OPEN",
      message:
        "Offene §8-AWV-Anzeigepflicht: Ein Catch-all hat ausgelöst und es liegt noch keine deckende Genehmigung vor — vor Lieferung BAFA-Meldung abschließen.",
      severity: "GAP",
    });
  } else {
    // Even with a licence attached, surface an UNRESOLVED catch-all hit so the
    // operator consciously confirms the licence actually covers the trigger.
    const anyCatchAll =
      operation.catchAllArt4Hit ||
      operation.catchAllArt5Hit ||
      operation.catchAllArt9Hit ||
      operation.catchAllArt10Hit ||
      operation.para9NuclearHit ||
      operation.para9MilitaryHit;
    if (anyCatchAll) {
      const fired: string[] = [];
      if (operation.catchAllArt4Hit) fired.push("Art. 4 (WMD/Militär)");
      if (operation.catchAllArt5Hit)
        fired.push("Art. 5 (Cyber/Menschenrechte)");
      if (operation.catchAllArt9Hit) fired.push("§8 AWV (national)");
      if (operation.catchAllArt10Hit) fired.push("Art. 10 (Anhang IV)");
      if (operation.para9NuclearHit) fired.push("§9(1) AWV (nuklear)");
      if (operation.para9MilitaryHit) fired.push("§9(2) AWV (militärisch)");
      reasons.push({
        code: "CATCH_ALL_OPEN",
        message: `Aktive Catch-all-Trigger (${fired.join(", ")}): bestätige, dass die zugeordnete Genehmigung diese End-Use-/End-User-Pflichten abdeckt, bevor geliefert wird.`,
        severity: "GAP",
      });
    }
  }

  const hardBlocked = reasons.some((r) => r.severity === "BLOCKING");
  const passed = reasons.length === 0;

  return composeExplained(operation.id, {
    operationId: operation.id,
    passed,
    hardBlocked,
    verdict,
    reasons,
  });
}

/**
 * Wrap a precondition value in the universal ExplainedResult envelope.
 * Exported so the route + tests build the exact same shape and the
 * `<ExplainedPanel>` renderer never refuses (every field is populated).
 */
export function composeExplained(
  operationId: string,
  value: ShipGatePreconditionValue,
): ExplainedResult<ShipGatePreconditionValue> {
  if (value.passed) {
    return {
      value,
      what: "Alle Versand-Voraussetzungen erfüllt — Vorgang darf auf EXECUTED gesetzt werden.",
      why: "Der Ausfuhrvorgang-Assistent liefert GO: jede Zeile ist durch eine aktive, code- und länderdeckende Genehmigung abgedeckt, das Screening der Gegenpartei ist CLEAR und aktuell, und es bestehen keine offenen Catch-all-/Anzeigepflichten.",
      wherefore:
        "Empfohlene nächste Aktion: Versand bestätigen (LICENSED → EXECUTED). Die Verantwortung trägt die ausführende Person.",
      confidence: "HIGH",
      sources: GATE_SOURCES,
      override: { allowed: false },
    };
  }

  const blockingCount = value.reasons.filter(
    (r) => r.severity === "BLOCKING",
  ).length;
  const gapCount = value.reasons.length - blockingCount;
  const reasonLines = value.reasons.map((r) => `• ${r.message}`).join("\n");

  return {
    value,
    what: value.hardBlocked
      ? `Versand gesperrt — ${value.reasons.length} ungelöste${value.reasons.length === 1 ? "r Punkt" : " Punkte"}, davon ${blockingCount} harte Sperre${blockingCount === 1 ? "" : "n"}. EXECUTED ist NICHT möglich.`
      : `Versand-Voraussetzungen nicht erfüllt — ${value.reasons.length} ungelöste${value.reasons.length === 1 ? "r Punkt" : " Punkte"}.`,
    why: `Die Server-seitige Vorab-Prüfung (erneuter Assess-Lauf + Zeilen-Deckung + Screening + Catch-all) hat folgende Punkte gefunden:\n${reasonLines}`,
    wherefore: value.hardBlocked
      ? "Eine harte Sperre kann nicht zu EXECUTED übersteuert werden. Vorgang auf BLOCKED setzen und ggf. Voluntary Self-Disclosure prüfen."
      : `${gapCount} offene${gapCount === 1 ? "r Punkt" : " Punkte"} müssen geklärt werden. Mit bewusster, protokollierter Begründung kann eine benannte Person den Versand dennoch freigeben (Override) — andernfalls zuerst die Punkte schließen.`,
    confidence: "HIGH",
    sources: GATE_SOURCES,
    override: { allowed: !value.hardBlocked },
  };
}
