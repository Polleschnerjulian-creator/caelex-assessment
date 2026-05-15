/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Sprint A2 — BORA / BRAO red-flag scanner.
 * ────────────────────────────────────────────────────────────────────
 * Lexicon-based first-pass for the most common berufsrechtlichen
 * Verstöße in lawyer-drafted documents:
 *   - § 6 BORA: Werbeverbot (Erfolgsversprechen, reißerische Vergleiche)
 *   - § 43a BRAO: Verschwiegenheit (Mandantennamen in marketing-y context)
 *   - § 49b BRAO: Honorar-Aussagen ohne RVG-Bezug
 *
 * Not exhaustive — meant as a first-defence guard before the lawyer
 * sees the artefact, not a substitute for professional review. Every
 * finding surfaces inline next to the artifact-card so the lawyer can
 * decide whether to keep, edit, or discard the flagged passage.
 *
 * Lexical regexes are intentionally narrow: a false-positive on a
 * lawyer-grade artefact is much more annoying than a missed edge-case
 * (the human still reviews everything). When in doubt, prefer no
 * flag — the lawyer is the safety-net of last resort, not the BORA
 * checker.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import "server-only";

export type BoraSeverity = "warn" | "error";

export interface BoraIssue {
  /// The rule label (e.g. "BORA §6 Erfolgsversprechen") — surfaced in
  /// the UI tooltip / legend so the lawyer can look up the underlying
  /// norm if they want to dispute the flag.
  rule: string;
  severity: BoraSeverity;
  message: string;
  /// Char-offset within the artefact body where the rule fired. Lets
  /// the UI scroll-to / highlight the exact passage on click.
  offset?: number;
}

interface BoraRule {
  rule: string;
  severity: BoraSeverity;
  pattern: RegExp;
  message: string;
  /// Restrict the rule to certain artefact kinds. A Schriftsatz
  /// addressed to the court has different conventions than an outbound
  /// Mandanten-Email; a "Mandantenname GmbH" reference in a Schriftsatz
  /// is normal, in an Email it's a Verschwiegenheits-Risiko.
  appliesToKinds?: ArtifactKindForBora[];
}

export type ArtifactKindForBora =
  | "memo"
  | "schriftsatz"
  | "email"
  | "checklist"
  | "summary";

/* The rule-set is intentionally short and conservative. Each entry
   targets a textual fingerprint a human lawyer would recognise as a
   yellow-flag while reading. Keep the patterns narrow — false-positives
   train the lawyer to ignore the warnings. */
const RULES: BoraRule[] = [
  {
    rule: "BORA §6 Erfolgsversprechen",
    severity: "error",
    /* Garantierter Erfolg, "100% Sieg/Gewinn", "sicherer Erfolg" —
       the textbook Werbeverbot trigger. */
    pattern:
      /\b(garantier(?:e|t)|100\s?%\s+(?:erfolg|gewinn|sieg)|sicher(?:e|er)\s+(?:erfolg|sieg|gewinn))\b/i,
    message: "Erfolgsversprechen sind nach § 6 BORA unzulässig.",
  },
  {
    rule: "BORA §6 reißerische Werbung",
    severity: "warn",
    pattern: /\b(beste(?:r|n)?\s+anwalt|nummer\s?eins\s+kanzlei|unschlagbar)/i,
    message:
      "Vergleichende / superlative Werbung kann gegen § 6 BORA verstoßen.",
  },
  {
    rule: "BRAO §43a Verschwiegenheit",
    severity: "warn",
    /* "Unsere Mandantschaft Astralink GmbH" in einem outbound Email
       ist klassischer Verschwiegenheits-Verstoß. Im Schriftsatz dagegen
       muss der Name oft genannt werden — daher kind-restriction. */
    pattern:
      /(?:unsere\s+)?mandantschaft\s+(?:[A-ZÄÖÜ][a-zäöüß]+\s+)?(?:GmbH|AG|KG|OHG|e\.\s?V\.|UG|SE)/,
    message:
      "Konkrete Mandantennamen — bitte prüfen ob Verschwiegenheit nach § 43a BRAO gewahrt bleibt.",
    appliesToKinds: ["email", "memo"],
  },
  {
    rule: "BRAO §49b Honorar",
    severity: "warn",
    /* "Kostenlos" / "gratis" / "gegen Erfolgshonorar" ohne RVG-Bezug
       in der gleichen Aussage. Negative-lookahead RVG erlaubt korrekte
       Formulierungen wie "abweichend vom RVG kostenlos". */
    pattern: /(kostenlos|gratis|gegen\s+erfolgshonorar)\b(?!.{0,80}RVG)/i,
    message:
      "Honorar-Aussagen müssen RVG-konform sein (oder Erfolgshonorar-Vereinbarung erforderlich, § 49b BRAO).",
  },
];

/**
 * Scan an artefact body against the BORA / BRAO rule-set. Returns
 * one finding per rule-fire (only the FIRST match per rule — the UI
 * needs ONE flag per concern, not 12 copies of the same warning).
 *
 * Performance note: each rule is a single regex.exec(); for typical
 * artefacts (1-5 KB body) this is sub-millisecond.
 */
export function checkBoraConformance(
  body: string,
  kind: ArtifactKindForBora,
): BoraIssue[] {
  if (!body) return [];

  const issues: BoraIssue[] = [];
  for (const rule of RULES) {
    if (rule.appliesToKinds && !rule.appliesToKinds.includes(kind)) {
      continue;
    }
    /* Reset lastIndex defensively — these regexes do NOT have the /g
       flag set, but a future maintainer might add it without noticing
       the cross-call leakage that would result. */
    rule.pattern.lastIndex = 0;
    const match = rule.pattern.exec(body);
    if (match) {
      issues.push({
        rule: rule.rule,
        severity: rule.severity,
        message: rule.message,
        offset: match.index,
      });
    }
  }
  return issues;
}
