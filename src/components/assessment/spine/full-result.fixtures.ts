/**
 * Test fixtures for the FULL-tier result surface (plan Task 3.3 / 3.6).
 * Shared by FindingCard.test.tsx, JurisdictionMatrix.test.tsx and
 * full-result.no-score.test.tsx — NOT imported by any app code.
 *
 * Extends the Task 2.4 quick fixtures (quick-result.fixtures.ts) with the
 * full-tier-only material: an `evidenceExamples`-carrying finding, an
 * unverified-source finding, readiness bands, unknowns, credit mappings,
 * roadmap items and MSTransposition arrays. Every finding is built with the
 * THROWING envelope constructors (Task 1.2) — valid by construction.
 */

import {
  determinedFinding,
  type AssessmentFinding,
} from "@/lib/assessment/finding";
// Type-only imports — erased at compile time; the server modules never load.
import type { MSTransposition } from "@/lib/assessment/nis2-gateway.server";
import type { ClusterReadiness } from "@/lib/assessment/readiness.server";
import type { CreditMapping } from "@/lib/assessment/credit-map.server";
import type { RoadmapItem } from "@/lib/assessment/roadmap.server";
import type { UnknownItem } from "./UnknownsList";
import { FIXTURE_RB } from "./quick-result.fixtures";

/** A DETERMINED finding carrying the §6 (2) evidence-examples list. */
export function evidenceFinding(): AssessmentFinding {
  return determinedFinding<string>({
    value: "debris_plan_required",
    verdict: "applicable",
    what: "A debris-mitigation plan is required for your spacecraft.",
    why: "Spacecraft operators must submit a debris-mitigation plan covering collision avoidance and post-mission disposal under the Commission text.",
    wherefore:
      "Prepare the debris-mitigation plan ahead of your authorisation application.",
    whyTrace: [
      { questionId: "q1_1_roles", answerLabel: "Spacecraft operator" },
    ],
    confidence: "DETERMINED",
    sources: [
      {
        label: "EU Space Act proposal — Commission text",
        citation: "COM(2025) 335 Arts. 30–40 (debris mitigation)",
        asOf: "2025-06-25",
        verified: true,
      },
    ],
    cluster: "debris_safety",
    evidenceExamples: [
      "Debris-mitigation plan submitted/approved",
      "Casualty-risk assessment",
      "Passivation design evidence",
    ],
    rulebookVersion: FIXTURE_RB,
  });
}

/** A finding whose source could NOT be verified against primary text —
 *  the renderer must show "legal basis pending verification". */
export function unverifiedSourceFinding(): AssessmentFinding {
  return determinedFinding<string>({
    value: "unverified_basis_example",
    verdict: "advisory",
    what: "An advisory duty whose legal basis is pending verification.",
    why: "The cited provision could not be verified against the primary text at rulebook compile time.",
    wherefore: "Treat as advisory until the basis is verified.",
    whyTrace: [],
    confidence: "PROBABLE",
    sources: [
      {
        label: "Unverified national circular",
        citation: "Circular (unverified)",
        asOf: "2025-01-01",
        verified: false,
      },
    ],
    cluster: "supervision_penalties",
    rulebookVersion: FIXTURE_RB,
  });
}

// ─── NIS2 transposition fixtures (gateway Rule 7 output shapes) ─────────────

export const TRANSPOSITION_DE_IN_FORCE: MSTransposition = {
  state: "de",
  actName: "NIS2UmsuCG",
  inForce: "2025-12-06",
  status: "in_force",
};

export const TRANSPOSITION_FR_UNVERIFIED: MSTransposition = {
  state: "fr",
  actName: null,
  inForce: null,
  status: "unverified",
};

// ─── Task 3.2 full-tier section fixtures ─────────────────────────────────────

export function readinessBandFixture(): ClusterReadiness {
  return {
    clusterId: "resilience_cyber",
    evidenced: 3,
    partial: 1,
    undocumented: 2,
    missing: 1,
    unsure: 1,
    total: 8,
  };
}

export function creditMapFixture(): CreditMapping[] {
  return [
    {
      source: "ISO/IEC 27001",
      covers: ["risk_assessment", "access_control_identity"],
      basis:
        "NIS2 Art 21 measure areas partially evidenced via ISO 27001 Annex A controls. A certificate narrows the evidence gap; it does not by itself establish NIS2 compliance.",
    },
  ];
}

export function roadmapFixture(): RoadmapItem[] {
  return [
    {
      due: "2026-09-01",
      action:
        "Target date for your space-activity authorization — assemble the application package ahead of this date.",
      basis: [
        {
          label: "EU Space Act proposal — Commission text",
          citation: "COM(2025) 335 Arts. 118–119 (transition windows)",
          asOf: "2025-06-25",
          verified: true,
        },
      ],
    },
    {
      due: "contested",
      action:
        "EU Space Act application window — align your authorization timeline with the final application date once the co-legislators converge.",
      basis: [
        {
          label: "EU Space Act proposal — Commission text",
          citation: "COM(2025) 335 Arts. 118–119 (transition windows)",
          asOf: "2025-06-25",
          verified: true,
        },
      ],
      fluxFlag: {
        summary: "contested — conservative reading shown",
        conservativeReading:
          "Plan against the earliest plausible application window; the application date differs across the three co-legislator texts.",
        positions: [
          { source: "com-2025-335", position: "1 January 2030" },
          {
            source: "presidency-compromise",
            position: "36 months after entry into force",
          },
        ],
      },
    },
  ];
}

export function unknownsFixture(): UnknownItem[] {
  return [
    {
      questionId: "q1_6_balance_sheet",
      question: "What is your balance-sheet total?",
      whatAnsweringChanges:
        "Answering narrows the obligation set and raises confidence for every finding that depends on it.",
      priority: "medium",
    },
    {
      questionId: "q9_2_itu_filing",
      question: "Where does your ITU frequency filing stand?",
      whatAnsweringChanges:
        "Spectrum is existential — the ITU filing stage decides whether your frequencies exist legally; an unfiled band cannot be recovered later.",
      priority: "high",
    },
  ];
}
