/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Credit map — Ultimate Assessment rebuild (Task 3.2).
 *
 * "What you already have counts": maps held certifications (Q6.7) and existing
 * national space licenses (Q4.4) onto the obligation areas they PARTIALLY
 * evidence. Honesty framing is baked into every `basis` string — a credit is
 * "partially evidenced via …", never "compliant via …"; certifications do not
 * prove regulatory compliance and the copy must never imply they do.
 *
 * Pure derivation from answers; emits nothing for absent/unsure inputs (no
 * fabricated credits — invariant 4).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import "server-only";

import { answeredValue, type AnswerMap } from "@/lib/assessment/answers";

// ─── Contract (plan Task 3.2) ────────────────────────────────────────────────

export interface CreditMapping {
  source: string; // e.g. "ISO/IEC 27001"
  covers: string[]; // measure areas / obligation areas partially evidenced
  basis: string; // the honest mapping rationale
}

const Q_CERTS = "q6_7_certifications";
const Q_LICENSES = "q4_4_licenses_held";

/** NIS2 Art 21(2) measure areas the Q6.6 battery tracks (item ids). */
const ART21_AREAS_ISO27001 = [
  "risk_assessment",
  "incident_detection_reporting_chain",
  "business_continuity",
  "supply_chain",
  "cryptography",
  "access_control_identity",
  "security_training",
  "vulnerability_management",
];

const CERT_CREDITS: Record<string, CreditMapping> = {
  iso_27001: {
    source: "ISO/IEC 27001",
    covers: ART21_AREAS_ISO27001,
    basis:
      "NIS2 Art 21 measure areas partially evidenced via ISO 27001 Annex A controls (ENISA Technical Implementation Guidance mapping). A certificate narrows the evidence gap; it does not by itself establish NIS2 compliance.",
  },
  cyfun: {
    source: "CyberFundamentals (CyFun)",
    covers: [
      "risk_assessment",
      "incident_detection_reporting_chain",
      "access_control_identity",
      "vulnerability_management",
      "security_training",
    ],
    basis:
      "CCB CyberFundamentals assurance levels map onto NIS2 Art 21 measure areas (Belgian transposition practice). Partial evidence only — verification against the assessed scope is still required.",
  },
  soc_2: {
    source: "SOC 2",
    covers: [
      "access_control_identity",
      "incident_detection_reporting_chain",
      "vulnerability_management",
    ],
    basis:
      "SOC 2 Trust Services Criteria overlap a subset of NIS2 Art 21 measure areas. Partial evidence for the audited system boundary only.",
  },
  cyber_essentials: {
    source: "Cyber Essentials",
    covers: ["access_control_identity", "vulnerability_management"],
    basis:
      "UK Cyber Essentials controls partially evidence basic-hygiene measure areas. Narrow scope — does not cover incident reporting, continuity or supply-chain duties.",
  },
};

/** Q4.4 license option value → human label for the brownfield credit. */
const LICENSE_LABELS: Record<string, string> = {
  fr_los: "French LOS authorization",
  it_law_89_2025: "Italian Law 89/2025 authorization",
  uk_sia_osa: "UK SIA/OSA licence",
  lu: "Luxembourg space-activity authorization",
  at: "Austrian Outer Space Act authorization",
  be: "Belgian space-activities authorization",
  nl: "Dutch Space Activities Act licence",
  dk: "Danish Outer Space Act authorization",
  fi: "Finnish Space Activities Act authorization",
  se: "Swedish space-activity licence",
  ee: "Estonian space-activity authorization",
  pt: "Portuguese space-activity licence",
};

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string")
    : [];
}

/**
 * Compute the credit map from held certifications + existing licenses.
 * Unsure / unanswered inputs emit nothing (a credit is never fabricated).
 */
export function computeCreditMap(answers: AnswerMap): CreditMapping[] {
  const out: CreditMapping[] = [];

  for (const cert of stringArray(answeredValue(answers, Q_CERTS))) {
    const credit = CERT_CREDITS[cert];
    if (credit) out.push(credit);
  }

  for (const lic of stringArray(answeredValue(answers, Q_LICENSES))) {
    if (lic === "none") continue;
    const label = LICENSE_LABELS[lic] ?? null;
    if (!label) continue; // never invent a label for an unknown value
    out.push({
      source: label,
      covers: ["authorization_registration"],
      basis:
        "Brownfield credit: an existing national authorization means an evidence package, a registry entry and an authority relationship already exist — reusable in the EU Space Act transition (COM(2025) 335 Arts. 118–119, Commission text; transition mechanics are still in legislative flux).",
    });
  }

  return out;
}
