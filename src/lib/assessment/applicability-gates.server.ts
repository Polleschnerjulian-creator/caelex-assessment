/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * SERVER-ONLY Applicability Gates — Ultimate Assessment spine (Task 1.8).
 *
 * Evaluates the EU Space Act applicability gates server-side at calculate
 * time (honesty invariant 3: gates are NEVER client-only). Three gates, in
 * order of decisiveness:
 *
 *   Gate 1 — Defence exclusivity (Q1.9, COM(2025) 335 Art. 2(3)):
 *     "exclusively_defense"  → HARD out-of-scope, DETERMINED, cited.
 *     "dual_use"             → in scope + a noted DETERMINED finding
 *                              (partial/dual-use stays fully in scope).
 *     unsure / missing       → in scope PRESUMED + clarification note
 *                              (unknown rounds UP — invariant 2; an unsure
 *                              never earns the exemption).
 *
 *   Gate 2 — EU nexus (Q1.2 establishment + Q4.1 EU nexus, Art. 2 scope):
 *     non-EU established + nexus "no" → HARD out-of-scope, DETERMINED, cited.
 *     nexus unsure / not asked        → in scope presumed + verify note.
 *     establishment unsure / missing  → in scope presumed + verify note.
 *
 *   Gate 3 — Launch timing (Q3.6, §7.1 #7): SOFT gate, NEVER a hard stop.
 *     "all_before" → out_of_scope_LIKELY, PROBABLE confidence, carrying a
 *     FluxFlag with the THREE contested application-date positions
 *     (Commission 1 Jan 2030 / Commission 1 Jan 2032 second prong /
 *     Council-track + EP 36 months after entry into force) and the
 *     unverified edge-case caveat (replenishment, lifetime extension,
 *     transfer). "some_or_all_after" / unsure → in scope.
 *
 * Hard gates short-circuit; the soft gate short-circuits only after no hard
 * gate fired, and its finding keeps the contested-date scenario visible.
 *
 * Question ids and option values are the plan-pinned graph contract
 * (docs/superpowers/plans/2026-06-10-ultimate-assessment-rebuild.md,
 * Tasks 1.5/1.8): `q1_9_defense_exclusivity`, `q1_2_establishment`,
 * `q4_1_eu_nexus`, `q3_6_launch_timing`.
 *
 * PROPRIETARY AND CONFIDENTIAL
 */

import "server-only";

import type { AnswerMap } from "@/lib/assessment/answers";
import {
  determinedFinding,
  indeterminateFinding,
  type AssessmentFinding,
  type FindingSource,
} from "@/lib/assessment/finding";
import { CONTESTED_POSITIONS } from "@/data/assessment/rulebook";

// ─── Question ids (plan-pinned graph contract) ──────────────────────────────

const Q_DEFENSE = "q1_9_defense_exclusivity";
const Q_ESTABLISHMENT = "q1_2_establishment";
const Q_EU_NEXUS = "q4_1_eu_nexus";
const Q_LAUNCH_TIMING = "q3_6_launch_timing";

// ─── Sources ────────────────────────────────────────────────────────────────

function commissionSource(provision: string): FindingSource {
  return {
    label: "EU Space Act proposal — Commission text",
    citation: `COM(2025) 335 ${provision}`,
    asOf: "2025-06-25",
    verified: true,
  };
}

/** §7.1 #7: the three contested application-date sources (Q3.6 citation set). */
const LAUNCH_TIMING_SOURCES: FindingSource[] = [
  commissionSource(
    "Art. 2 + application provisions (1 Jan 2030 / 1 Jan 2032 second prong)",
  ),
  {
    label:
      "Danish Presidency compromise text (Council track — no Council position adopted as of June 2026)",
    citation: "application: 36 months after entry into force",
    asOf: "2025-12-05",
    verified: true,
  },
  {
    label: "EP ITRE draft report",
    citation: "application: 36 months after entry into force",
    asOf: "2026-03-03",
    verified: true,
  },
];

// ─── Public contract (plan Task 1.8) ────────────────────────────────────────

export type GateOutcome =
  | { kind: "in_scope"; notes: AssessmentFinding[] } // dual-use note etc.
  | { kind: "out_of_scope"; finding: AssessmentFinding } // DETERMINED, hard
  | { kind: "out_of_scope_likely"; finding: AssessmentFinding }; // PROBABLE + fluxFlag, soft (launch timing)

// ─── Implementation ─────────────────────────────────────────────────────────

export function evaluateApplicabilityGates(
  answers: AnswerMap,
  rulebookVersion: string,
): GateOutcome {
  const notes: AssessmentFinding[] = [];

  // ── Gate 1: defence exclusivity (Art. 2(3)) — HARD ──────────────────────
  const defense = answers[Q_DEFENSE];
  if (
    defense?.state === "answered" &&
    defense.value === "exclusively_defense"
  ) {
    return {
      kind: "out_of_scope",
      finding: determinedFinding<string>({
        value: "out_of_scope_defense_exclusive",
        verdict: "not_applicable",
        what: "The EU Space Act does not apply — exclusively-defence activities are excluded from scope.",
        why: "COM(2025) 335 Art. 2(3) excludes space activities conducted exclusively for defence or national security purposes from the scope of the proposed EU Space Act. You answered that your space assets are used exclusively for defence / national security.",
        wherefore:
          "No EU Space Act obligations attach to exclusively-defence activities. If any asset takes on civil, commercial or dual use, the exclusion is lost and the Act applies in full — re-run this assessment on any such change.",
        whyTrace: [
          {
            questionId: Q_DEFENSE,
            answerLabel: "Yes — exclusively defence / national security",
          },
        ],
        confidence: "DETERMINED",
        sources: [commissionSource("Art. 2(3)")],
        cluster: "authorization_registration",
        rulebookVersion,
      }),
    };
  }

  if (defense?.state === "answered" && defense.value === "dual_use") {
    // Partial / dual-use stays fully in scope — noted finding, not an exemption.
    notes.push(
      determinedFinding<string>({
        value: "dual_use_in_scope_note",
        verdict: "applicable",
        what: "EU Space Act applies — dual-use assets remain fully in scope.",
        why: "COM(2025) 335 Art. 2(3) excludes only EXCLUSIVELY-defence activities. Mixed civil/defence (dual-use) assets do not qualify for the exclusion and remain fully within the Act's scope.",
        wherefore:
          "Treat all obligations in this verdict as applying to your dual-use assets; the defence component does not reduce them.",
        whyTrace: [
          {
            questionId: Q_DEFENSE,
            answerLabel: "Partially — dual-use or mixed civil/defence",
          },
        ],
        confidence: "DETERMINED",
        sources: [commissionSource("Art. 2(3)")],
        cluster: "authorization_registration",
        rulebookVersion,
      }),
    );
  }

  if (!defense || defense.state !== "answered") {
    // unsure / not_asked / missing → in scope PRESUMED (rounds UP, never to
    // an exemption — invariant 2) + clarification entry.
    notes.push(
      indeterminateFinding<string>({
        value: "in_scope_presumed_defense_unclear",
        verdict: "conditional",
        what: "EU Space Act applicability presumed — defence exclusivity unconfirmed.",
        why: "The Art. 2(3) exclusion applies only to EXCLUSIVELY-defence activities. Because the defence-exclusivity question was not answered with certainty, the conservative reading is taken: the Act is presumed to apply and all obligations are shown. An unknown never earns an exemption.",
        wherefore:
          "Confirm whether your space assets are used exclusively for defence / national security. If yes, the Act does not apply; until confirmed, treat the obligations shown as applicable.",
        whyTrace: [
          {
            questionId: Q_DEFENSE,
            answerLabel:
              defense?.state === "unsure" ? "I'm not sure" : "Not answered",
          },
        ],
        sources: [commissionSource("Art. 2(3)")],
        cluster: "authorization_registration",
        rulebookVersion,
      }),
    );
  }

  // ── Gate 2: EU nexus (Art. 2 territorial/market scope) — HARD ───────────
  const establishment = answers[Q_ESTABLISHMENT];
  if (establishment?.state === "answered") {
    if (establishment.value !== "eu") {
      const nexus = answers[Q_EU_NEXUS];
      if (nexus?.state === "answered" && nexus.value === "no") {
        return {
          kind: "out_of_scope",
          finding: determinedFinding<string>({
            value: "out_of_scope_no_eu_nexus",
            verdict: "not_applicable",
            what: "The EU Space Act does not apply — no EU establishment and no EU services or data offered.",
            why: "Per COM(2025) 335 Art. 2, the proposed EU Space Act applies to operators established in the Union and to third-country operators providing space services or space-based data to users in the Union. You answered that you are established outside the EU and do not provide services or data to the EU market.",
            wherefore:
              "No EU Space Act obligations attach today. If you later begin serving EU customers, you become a third-country operator in scope (EU representative designation and registration duties) — re-run this assessment on that change.",
            whyTrace: [
              {
                questionId: Q_ESTABLISHMENT,
                answerLabel: String(establishment.value),
              },
              { questionId: Q_EU_NEXUS, answerLabel: "No" },
            ],
            confidence: "DETERMINED",
            sources: [
              commissionSource("Art. 2 (territorial and market scope)"),
            ],
            cluster: "authorization_registration",
            rulebookVersion,
          }),
        };
      }
      if (!nexus || nexus.state !== "answered") {
        // unsure / not asked → in scope presumed + verify flag (§4 Q4.1).
        notes.push(
          indeterminateFinding<string>({
            value: "in_scope_presumed_eu_nexus_unclear",
            verdict: "conditional",
            what: "EU Space Act applicability presumed — EU market nexus unconfirmed.",
            why: "You are established outside the EU. Whether the Act applies turns on whether you provide space services or space-based data to users in the Union (COM(2025) 335 Art. 2). That nexus was not answered with certainty, so the conservative reading is taken: in scope presumed.",
            wherefore:
              "Verify whether any customer, service or data recipient is in the EU. If none, you are outside the Act's scope; until verified, the obligations shown are presumed applicable.",
            whyTrace: [
              {
                questionId: Q_ESTABLISHMENT,
                answerLabel: String(establishment.value),
              },
              {
                questionId: Q_EU_NEXUS,
                answerLabel:
                  nexus?.state === "unsure" ? "I'm not sure" : "Not answered",
              },
            ],
            sources: [
              commissionSource("Art. 2 (territorial and market scope)"),
            ],
            cluster: "authorization_registration",
            rulebookVersion,
          }),
        );
      }
      // nexus answered "yes" → in scope, no note needed.
    }
  } else {
    // establishment unsure / missing → in scope presumed + verify note
    // (monotonic round-up: an unknown establishment never narrows scope).
    notes.push(
      indeterminateFinding<string>({
        value: "in_scope_presumed_establishment_unclear",
        verdict: "conditional",
        what: "EU Space Act applicability presumed — place of establishment unconfirmed.",
        why: "Scope under COM(2025) 335 Art. 2 turns on EU establishment or an EU market nexus. The establishment question was not answered with certainty, so the conservative reading is taken: in scope presumed.",
        wherefore:
          "Confirm where your organisation is established. Until confirmed, the obligations shown are presumed applicable.",
        whyTrace: [
          {
            questionId: Q_ESTABLISHMENT,
            answerLabel:
              establishment?.state === "unsure"
                ? "I'm not sure"
                : "Not answered",
          },
        ],
        sources: [commissionSource("Art. 2 (territorial and material scope)")],
        cluster: "authorization_registration",
        rulebookVersion,
      }),
    );
  }

  // ── Gate 3: launch timing (Art. 2 grandfathering) — SOFT (§7.1 #7) ──────
  const timing = answers[Q_LAUNCH_TIMING];
  if (timing?.state === "answered" && timing.value === "all_before") {
    return {
      kind: "out_of_scope_likely",
      finding: determinedFinding<string>({
        value: "out_of_scope_likely_pre_application_assets",
        verdict: "contested",
        what: "Likely outside the EU Space Act — all assets launch before the (contested) application date.",
        why: "COM(2025) 335 grandfathers space objects launched before the Act's application date. The application date itself is contested THREE ways in the legislative process: 1 January 2030 (Commission) or 1 January 2032 for certain assets (Commission second prong) versus 36 months after entry into force (Presidency compromise + EP ITRE). Replenishment, lifetime-extension and transfer edge cases remain UNVERIFIED against the primary texts — this verdict is therefore a likely-out-of-scope reading at PROBABLE confidence, never an unqualified hard stop.",
        wherefore:
          "Track the legislative timetable: if any launch slips past the finally-adopted application date — or a replenishment, lifetime extension or in-orbit transfer occurs — the affected assets come into scope. Re-run this assessment when the application date is settled.",
        whyTrace: [
          {
            questionId: Q_LAUNCH_TIMING,
            answerLabel: "All assets launch before the application date",
          },
        ],
        confidence: "PROBABLE",
        sources: LAUNCH_TIMING_SOURCES,
        cluster: "authorization_registration",
        fluxFlag: {
          summary: "contested — conservative reading shown",
          conservativeReading:
            "All assets are assumed grandfathered only if every launch precedes EVERY contested application-date scenario; any launch after the earliest contested date may be in scope.",
          positions: CONTESTED_POSITIONS.applicationDate.map((p) => ({
            source: p.source,
            position: p.position,
          })),
        },
        rulebookVersion,
      }),
    };
  }

  if (!timing || timing.state !== "answered") {
    // unsure / not_asked / missing → in scope (rounds UP) + clarification entry.
    notes.push(
      indeterminateFinding<string>({
        value: "in_scope_presumed_launch_timing_unclear",
        verdict: "conditional",
        what: "EU Space Act applicability presumed — launch timing relative to the application date unconfirmed.",
        why: "Grandfathering under COM(2025) 335 attaches only to assets launched before the (contested) application date. Because launch timing was not answered with certainty, the conservative reading is taken: in scope presumed.",
        wherefore:
          "Confirm your launch schedule against the application-date scenarios (1 Jan 2030 / 1 Jan 2032 / 36 months after entry into force). Until confirmed, the obligations shown are presumed applicable.",
        whyTrace: [
          {
            questionId: Q_LAUNCH_TIMING,
            answerLabel:
              timing?.state === "unsure" ? "I'm not sure" : "Not answered",
          },
        ],
        sources: LAUNCH_TIMING_SOURCES,
        cluster: "authorization_registration",
        rulebookVersion,
      }),
    );
  }

  return { kind: "in_scope", notes };
}
