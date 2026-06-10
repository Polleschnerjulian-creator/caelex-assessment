/**
 * Test fixtures for the quick-tier result surface (plan Task 2.4).
 * Shared by quick-projection.test.ts, QuickResultPanel.test.tsx and
 * quick-summary.server.test.ts — NOT imported by any app code.
 *
 * Every finding is built with the THROWING envelope constructors
 * (Task 1.2), so the fixtures are valid explanation envelopes by
 * construction — exactly what the pipeline ships.
 */

import {
  determinedFinding,
  indeterminateFinding,
  type AssessmentFinding,
  type FindingSource,
} from "@/lib/assessment/finding";

export const FIXTURE_RB = "1.0.0";

const COMMISSION_ART6: FindingSource = {
  label: "EU Space Act proposal — Commission text",
  citation: "COM(2025) 335 Art. 6 (authorisation requirement)",
  asOf: "2025-06-25",
  verified: true,
};

const COMMISSION_ART10: FindingSource = {
  label: "EU Space Act proposal — Commission text",
  citation: "COM(2025) 335 Art. 10 (light regime)",
  asOf: "2025-06-25",
  verified: true,
};

const COMMISSION_RESILIENCE: FindingSource = {
  label: "EU Space Act proposal — Commission text",
  citation: "COM(2025) 335 Arts. 74–95 (resilience chapter)",
  asOf: "2025-06-25",
  verified: true,
};

const NIS2_SOURCE: FindingSource = {
  label: "NIS2 Directive",
  citation: "Directive (EU) 2022/2555 Art. 3 (size thresholds)",
  asOf: "2022-12-27",
  verified: true,
};

/** Scope note: a conditional gate finding (dual-use awareness note). */
export function scopeNoteFinding(): AssessmentFinding {
  return determinedFinding<string>({
    value: "dual_use_awareness_note",
    verdict: "conditional",
    what: "Dual-use export-control rules can apply to your spacecraft regardless of the EU Space Act outcome.",
    why: "Spacecraft and 'mission equipment' appear in Annex I of the EU Dual-Use Regulation as updated in 2025 — applicability is independent of Space Act scope.",
    wherefore:
      "Classify your items against Annex I before any cross-border shipment.",
    whyTrace: [
      { questionId: "q1_1_roles", answerLabel: "Spacecraft operator" },
    ],
    confidence: "DETERMINED",
    sources: [
      {
        label: "EU Dual-Use Regulation",
        citation: "Regulation (EU) 2021/821 Annex I",
        asOf: "2021-09-09",
        verified: true,
      },
    ],
    cluster: "export_control_sanctions",
    rulebookVersion: FIXTURE_RB,
  });
}

/** NIS2 gateway in the explicit OPEN state — the §6b clarification case. */
export function nis2NeedsClarificationFinding(): AssessmentFinding {
  return indeterminateFinding<string>({
    value: "needs_clarification",
    verdict: "conditional",
    what: "NIS2 gateway: classification needs clarification.",
    why: "Your headcount band is unknown and you operate EU ground infrastructure — the essential/important classification turns on the size thresholds you have not provided.",
    wherefore:
      "Resolve the named clarification questions — the classification (and the entire NIS2 obligation set) turns on them.",
    whyTrace: [
      { questionId: "q1_5_headcount", answerLabel: "I'm not sure" },
      { questionId: "q4_3_ground_segment", answerLabel: "Own ground segment" },
    ],
    sources: [NIS2_SOURCE],
    cluster: "resilience_cyber",
    rulebookVersion: FIXTURE_RB,
  });
}

/** Regime direction: likely light — verify group structure (Task 1.8). */
export function regimeLikelyEligibleFinding(): AssessmentFinding {
  return determinedFinding<string>({
    value: "likely_eligible_verify",
    verdict: "conditional",
    what: "Light-regime direction: likely eligible — verify group structure.",
    why: "Your standalone figures sit inside the SME ceilings, but linked-enterprise aggregation (group structure) was not confirmed — eligibility is read conservatively until it is.",
    wherefore:
      "Confirm the consolidated group headcount and turnover before relying on the light regime.",
    whyTrace: [{ questionId: "q1_5_headcount", answerLabel: "10–49" }],
    confidence: "PROBABLE",
    sources: [COMMISSION_ART10],
    cluster: "authorization_registration",
    rulebookVersion: FIXTURE_RB,
  });
}

/** Cluster headline: authorisation duty — DETERMINED, top by construction. */
export function authorizationFinding(): AssessmentFinding {
  return determinedFinding<string>({
    value: "authorization_required",
    verdict: "applicable",
    what: "Operator authorisation is required before launch or operation.",
    why: "Union spacecraft operators require prior authorisation from their competent national authority under the Commission text.",
    wherefore:
      "Plan the authorisation workstream with your national authority.",
    whyTrace: [
      { questionId: "q1_1_roles", answerLabel: "Spacecraft operator" },
    ],
    confidence: "DETERMINED",
    sources: [COMMISSION_ART6],
    cluster: "authorization_registration",
    rulebookVersion: FIXTURE_RB,
  });
}

/** Second cluster finding — PROBABLE, must NOT be the rendered headline. */
export function registrationFinding(): AssessmentFinding {
  return determinedFinding<string>({
    value: "registration_required",
    verdict: "applicable",
    what: "Space-object registration duties attach to each spacecraft.",
    why: "Registered space objects must be entered in the national registry; the duty is read conservatively while your launching-State answer is unsure.",
    wherefore: "Prepare registry submissions per spacecraft.",
    whyTrace: [
      { questionId: "q4_8_launching_state", answerLabel: "I'm not sure" },
    ],
    confidence: "PROBABLE",
    sources: [COMMISSION_ART6],
    cluster: "authorization_registration",
    rulebookVersion: FIXTURE_RB,
  });
}

/** Contested cyber-routing finding with the (≥2 positions) flux flag. */
export function contestedCyberFinding(): AssessmentFinding {
  return determinedFinding<string>({
    value: "cyber_regime_routing_contested",
    verdict: "contested",
    what: "Cybersecurity regime routing — which instrument governs your cyber obligations is contested in the legislative process.",
    // NOTE: deliberately does NOT repeat the flux-position phrases — the
    // collapsed-chip tests assert those phrases appear ONLY after expansion.
    why: "The three co-legislator texts route cybersecurity through different instruments; no reading is settled in trilogue yet.",
    wherefore:
      "Treat both the NIS2 findings and the Space Act resilience findings as applicable until the architecture is settled.",
    whyTrace: [],
    confidence: "PROBABLE",
    sources: [COMMISSION_RESILIENCE],
    cluster: "resilience_cyber",
    fluxFlag: {
      summary: "contested — conservative reading shown",
      conservativeReading:
        "Both tracks are shown: NIS2 obligations AND the Space Act resilience chapter — the conservative reading assumes both apply until the co-legislators settle the architecture.",
      positions: [
        {
          source: "com-2025-335",
          position:
            "Space Act resilience chapter (Arts 74–95) as lex specialis",
        },
        {
          source: "presidency-compromise",
          position:
            "synchronisation — 'without prejudice to NIS2'; Art 75 et seq. only below the NIS2 thresholds",
        },
        {
          source: "ep-itre-draft",
          position: "resilience chapter deleted; NIS2 extended instead",
        },
      ],
    },
    rulebookVersion: FIXTURE_RB,
  });
}

/** A structurally INCOMPLETE envelope (hand-built — bypasses the throwing
 *  constructors on purpose) for the withhold-guard tests. */
export function incompleteFinding(): Record<string, unknown> {
  return {
    value: "half_baked",
    verdict: "applicable",
    what: "Half-baked obligation that must never render.",
    // why / wherefore / sources / whyTrace / cluster / confidence MISSING
    rulebookVersion: FIXTURE_RB,
  };
}

/**
 * The FULL ObligationMapResult-like fixture the QUICK snapshot stores
 * (Task 1.9 pipeline output shape): 2 clusters, 3 findings total,
 * 2 unknowns → §6b "M" = 3 identified − 2 headlines = 1.
 */
export function buildFullQuickResultFixture(): Record<string, unknown> {
  return {
    rulebookVersion: FIXTURE_RB,
    computedAt: "2026-06-10T12:00:00.000Z",
    tier: "quick",
    scope: [scopeNoteFinding()],
    nis2Gateway: nis2NeedsClarificationFinding(),
    regime: regimeLikelyEligibleFinding(),
    clusters: [
      {
        id: "authorization_registration",
        label: "Authorisation & registration",
        findings: [authorizationFinding(), registrationFinding()],
        counts: { applicable: 2, conditional: 0, contested: 0, advisory: 0 },
      },
      {
        id: "resilience_cyber",
        label: "Resilience & cybersecurity",
        findings: [contestedCyberFinding()],
        counts: { applicable: 0, conditional: 0, contested: 1, advisory: 0 },
      },
    ],
    crossFrameworkOverlaps: [],
    noneIdentifiedOverlaps: true,
    unknowns: [
      {
        questionId: "q9_2_itu_filing",
        question: "Where does your ITU frequency filing stand?",
        whatAnsweringChanges:
          "Spectrum is existential — the ITU filing stage decides whether your frequencies exist legally; an unfiled band cannot be recovered later.",
        priority: "high",
      },
      {
        questionId: "q1_6_balance_sheet",
        question: "What is your balance-sheet total?",
        whatAnsweringChanges:
          "Answering narrows the obligation set and raises confidence for every finding that depends on it.",
        priority: "medium",
      },
    ],
    aggregationDisclosures: [
      "Multiple orbital regimes declared (leo_lt_650, geo). Clusters are assessed against the MOST RESTRICTIVE regime — LEO.",
    ],
    contradictions: [],
  };
}

/** The already-projected Task 2.2 quick response shape (counts + top finding
 *  per cluster + unknowns COUNT — no full finding bodies). */
export function buildProjectedQuickResultFixture(): Record<string, unknown> {
  return {
    rulebookVersion: FIXTURE_RB,
    computedAt: "2026-06-10T12:00:00.000Z",
    tier: "quick",
    scope: [scopeNoteFinding()],
    nis2Gateway: nis2NeedsClarificationFinding(),
    regime: regimeLikelyEligibleFinding(),
    clusters: [
      {
        id: "authorization_registration",
        label: "Authorisation & registration",
        topFinding: authorizationFinding(),
        counts: { applicable: 2, conditional: 0, contested: 0, advisory: 0 },
      },
      {
        id: "resilience_cyber",
        label: "Resilience & cybersecurity",
        topFinding: contestedCyberFinding(),
        counts: { applicable: 0, conditional: 0, contested: 1, advisory: 0 },
      },
    ],
    unknownsCount: 2,
    aggregationDisclosures: [],
  };
}
