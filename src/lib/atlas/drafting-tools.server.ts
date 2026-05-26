import "server-only";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V3 — Drafting Tools (T0.1.h bundle-split, 2026-05-26).
 *
 * Seven tools turning Atlas from a research surface into a working-
 * output surface:
 *   - draft_authorization_application (national space-licence scaffold)
 *   - draft_compliance_brief (multi-JD client-memo scaffold)
 *   - draft_schriftsatz (German-legal-style brief to authority/court)
 *   - draft_mandantenbrief (client letter, Mandanten-tone)
 *   - draft_vertrag (contract scaffold)
 *   - draft_aktennotiz (memo to file)
 *   - refine_document (re-render section/aspect of an existing draft)
 *
 * Each tool returns a STRUCTURED SCAFFOLD, not finished prose. The AI
 * uses the scaffold (sections, parties, citations, hints) to write the
 * actual draft IN ITS CHAT REPLY.
 *
 * Auto-loads mandate context (parties, jurisdiction, primary authority,
 * custom instructions) when mandateId is attached, via the shared
 * `loadMandateScaffoldContext` extracted in T0.1.c.
 *
 * HARD RULE in tool descriptions: every draft must include the legal-
 * review disclaimer + PRIVILEGED & CONFIDENTIAL marker for Schriftsatz /
 * Verträge. The scaffolds remind the AI of this.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import {
  ALL_SOURCES,
  getAuthoritiesByJurisdiction,
  type LegalSource,
} from "@/data/legal-sources";
import {
  ATLAS_CASES,
  getCasesApplyingSource,
  type LegalCase,
} from "@/data/legal-cases";
import { loadMandateScaffoldContext } from "./mandate-scaffold-context.server";

/* ── Result type ────────────────────────────────────────────────────── */

export interface DraftingToolResult {
  content: string;
  isError: boolean;
}

/* ── Tool definitions (Anthropic-tool format) ───────────────────────── */

export const DRAFTING_TOOLS: Anthropic.Tool[] = [
  // legal-review disclaimer (see system prompt).

  {
    name: "draft_authorization_application",
    description: `Builds a structured scaffold for a national space-licence / launch-authorisation application. Returns the binding legal framework, the competent authority, mandatory application sections (with what each must contain), required attachments, and the key quantitative thresholds (insurance cap, casualty-risk, PMD-timeline, disposal-reliability) for the chosen jurisdiction. Compose the actual draft in your reply using the scaffold + the operator's mission profile.

Use when the user asks "draft a UK launch licence", "write an authorisation application for FR LOS", "scaffold a Genehmigungsantrag nach dem deutschen WeltraumG", "prepare a NZ OSHAA payload permit", etc.

Output is BILINGUAL where DE translations exist — the agent can render in EN, DE, or both depending on the user's language. ALL section references and quantitative thresholds carry [ATLAS-ID] citations to the underlying sources. Wrap the final draft with the legal-review disclaimer from the system prompt.

Returns isError=true when the jurisdiction has no operative national space-licensing regime (e.g. EE, HR, HU, IS, LI, LT, LV, RO, SI, SK — Atlas catalogues these as "no domestic implementation"). In that case explain to the user that they need to operate under the Outer Space Treaty Art. VI obligation flowing through alternative routes (administrative practice, bilateral arrangement, etc.) rather than a dedicated statute.`,
    input_schema: {
      type: "object",
      properties: {
        jurisdiction: {
          type: "string",
          description:
            "ISO alpha-2 jurisdiction code (e.g. 'UK', 'FR', 'DE', 'US', 'JP', 'AU', 'NZ', 'IN', 'KR', 'IT', 'BE', 'NL', 'LU', 'PT', 'ES'). Use 'EU' only when drafting against the future EU Space Act regime.",
        },
        operator_type: {
          type: "string",
          enum: [
            "satellite_operator",
            "launch_provider",
            "ground_segment",
            "data_provider",
            "in_orbit_services",
            "constellation_operator",
            "space_resource_operator",
          ],
          description:
            "Operator category — determines which sub-permit class is the right starting point (e.g. SLR Act Part 4 vs. Part 6 in Australia; UK SIA operator licence vs. orbital activity licence).",
        },
        mission_profile: {
          type: "string",
          description:
            "Optional one-paragraph mission profile (orbit, payload mass, debris-mitigation strategy, end-customer). Helps the scaffold flag jurisdiction-specific risk areas (e.g. 5-year PMD applicability, casualty-risk threshold).",
        },
      },
      required: ["jurisdiction", "operator_type"],
    },
  },

  {
    name: "draft_compliance_brief",
    description: `Builds a structured scaffold for a multi-jurisdictional compliance brief / client memo. Returns the topic's regulatory map (which sources govern, in which jurisdictions), enforcement context (any cases that have applied these sources), per-jurisdiction key-points table, suggested brief structure (Executive Summary, Legal Framework, Risks, Recommendations), and the open questions the user should answer before the brief can be finalised.

Use when the user asks "draft a memo on 5-year LEO PMD compliance for our LEO constellation", "compliance brief on ITAR transfers between US and France", "advise on NIS2 ground-segment obligations across DE/FR/IT", "prepare client memo on debris-mitigation across our footprint", etc.

The scaffold is BILINGUAL where DE translations exist. Every cited authority/source/case in the scaffold uses ATLAS-ID/CASE-ID format so the final draft renders with hover-preview pills. Wrap the user-facing memo with the legal-review disclaimer from the system prompt.`,
    input_schema: {
      type: "object",
      properties: {
        topic: {
          type: "string",
          description:
            "Free-text compliance topic (e.g. '5-year LEO post-mission disposal', 'ITAR Cat. XV transfers to French JV partner', 'NIS2 obligations for satellite ground segment', 'Liability Convention exposure for collision in LEO'). 5-200 chars.",
        },
        jurisdictions: {
          type: "array",
          items: { type: "string" },
          description:
            "ISO alpha-2 jurisdictions (or 'INT'/'EU') to scope the brief. Empty array = global scope (top-7 most-relevant jurisdictions for the topic).",
        },
        operator_context: {
          type: "string",
          description:
            "Optional one-paragraph context about the client operator (HQ, fleet profile, key counterparties). Lets the scaffold flag which provisions are most likely binding.",
        },
      },
      required: ["topic"],
    },
  },
  {
    name: "draft_schriftsatz",
    description: `Builds a German-legal-style "Schriftsatz" scaffold (brief to an authority or court) using the current mandate's parties, jurisdiction, and primary authority. Returns the recommended structure (Briefkopf · Empfänger · Aktenzeichen · Bezug · Anrede · Sachverhalt · Anträge · Begründung · Schluss · Unterschrift), the parties block auto-filled from AtlasMandateParty rows, the today date, and bilingual section-headers when the matter is cross-border.

USE WHEN the user asks: "schreib mir nen Antrag an BNetzA", "Schriftsatz an das VG Köln für OrbitCo", "Beschwerde gegen Bescheid X", "Stellungnahme zum Bescheid vom 12.4."

After calling: write the actual Schriftsatz in your reply, using the scaffold sections. Apply the lawyer's custom instructions if any. Cite every regulatory claim with [ATLAS:...] tokens. Begin output with "PRIVILEGED & CONFIDENTIAL" and the legal-review disclaimer.`,
    input_schema: {
      type: "object",
      properties: {
        recipient: {
          type: "string",
          description:
            "Empfänger of the Schriftsatz — full authority/court name (z.B. 'Bundesnetzagentur', 'Verwaltungsgericht Köln'). When omitted, the tool uses the mandate's primaryAuthority.",
        },
        subject: {
          type: "string",
          description:
            "Subject-line / Bezug ('Antrag auf Frequenzzuteilung S-Band für Mission OrbitSat-1'). 5-200 chars.",
        },
        purpose: {
          type: "string",
          enum: [
            "antrag",
            "stellungnahme",
            "beschwerde",
            "klage",
            "widerspruch",
            "anhoerung",
            "sonstiges",
          ],
          description:
            "Schriftsatz-Typ. 'antrag' = Genehmigungs/Zulassungs-Antrag, 'stellungnahme' = Reply zu Anhörung, 'beschwerde' = formal complaint, 'klage' = Klageschrift, 'widerspruch' = Widerspruch gegen Bescheid, 'anhoerung' = Anhörung response.",
        },
        key_points: {
          type: "array",
          items: { type: "string" },
          description:
            "Optional 1-5 key arguments / Anträge the lawyer wants in the brief. The AI uses these as the spine of the Begründung section.",
        },
      },
      required: ["subject", "purpose"],
    },
  },
  {
    name: "draft_mandantenbrief",
    description: `Builds a client-letter scaffold (Brief an Mandant). Returns the recipient-block from the mandate's clientName + clientContact (or AtlasMandateParty of type='client'), today's date, suitable salutation, and the section-skeleton appropriate to the letter-kind (Mandatsbestätigung / Sachstandsbericht / Erstberatungs-Memo / Honorarnote-Begleitschreiben / Schlusssbericht).

USE WHEN the user asks: "schreib dem Mandanten X einen Sachstandsbericht", "Mandatsbestätigung für OrbitCo aufsetzen", "Memo zur Erstberatung am 5.5.", "Begleitschreiben zur Honorarnote".

After calling: write the actual letter in your reply with appropriate Anrede ("Sehr geehrte Frau Geschäftsführerin", "Lieber Herr Müller" only if signaled), formal-but-warm tone for Sachstandsbericht, factual-only for Bestätigung. End with the lawyer's salutation block.`,
    input_schema: {
      type: "object",
      properties: {
        kind: {
          type: "string",
          enum: [
            "mandatsbestaetigung",
            "sachstandsbericht",
            "erstberatung_memo",
            "schlussbericht",
            "honorarnote_begleitschreiben",
            "sonstiges",
          ],
          description:
            "Brief-Typ. Each kind has distinct section-skeleton + tone.",
        },
        subject: {
          type: "string",
          description:
            "Betreff / Bezug ('Sachstand Genehmigungsverfahren KW 18-2026'). 5-200 chars.",
        },
        key_points: {
          type: "array",
          items: { type: "string" },
          description:
            "Optional 1-5 facts/topics the lawyer wants covered (z.B. 'Frist bei BNetzA: 30.5.', 'Anhörungstermin: 12.6.', 'Risikoeinschätzung neuer Bescheid').",
        },
        tone: {
          type: "string",
          enum: ["formal", "warm", "neutral"],
          description:
            "Tone — 'formal' (Erstkontakt), 'warm' (etablierter Mandant), 'neutral' (default).",
        },
      },
      required: ["kind", "subject"],
    },
  },
  {
    name: "draft_vertrag",
    description: `Builds a contract scaffold (Vollmacht / Mandatsvereinbarung / NDA / Kooperationsvereinbarung / sonstige) for one of the parties in the current mandate. Returns the parties block, jurisdiction-appropriate boilerplate (German RVG-konforme Mandatsvereinbarung; AGB-Anlehnung), the suggested clause-spine, and standard salvatorische Klausel + Gerichtsstand.

USE WHEN the user asks: "Vollmacht für OrbitCo erstellen", "Mandatsvereinbarung mit neuem Mandanten", "NDA für Frequenz-Daten mit BNetzA", "Kooperationsvereinbarung Co-Counsel KanzleiX".

After calling: write the actual contract draft. Use {{Token}}-style placeholders only for variables the tool didn't auto-resolve (e.g. {{Honorarsatz EUR/h}}). Include "PRIVILEGED & CONFIDENTIAL" + the legal-review disclaimer at the top.`,
    input_schema: {
      type: "object",
      properties: {
        kind: {
          type: "string",
          enum: [
            "vollmacht",
            "mandatsvereinbarung",
            "nda",
            "kooperationsvereinbarung",
            "honorarvereinbarung",
            "sonstiges",
          ],
          description: "Vertrags-Typ.",
        },
        counterparty_party_id: {
          type: "string",
          description:
            "Optional AtlasMandateParty.id of the contract-counterparty. When provided, the tool auto-fills the parties block from that party's name/address/contact. Otherwise the AI infers from chat context.",
        },
        scope: {
          type: "string",
          description:
            "Free-text Spezial-Scope (z.B. 'beschränkt auf die Vertretung vor BNetzA in der Sache Frequenzzuteilung S-Band'). 5-500 chars.",
        },
      },
      required: ["kind"],
    },
  },
  {
    name: "draft_aktennotiz",
    description: `Builds an internal note scaffold (Aktennotiz / Telefon-Vermerk / Memo / Beratungsprotokoll). Returns the standard structure: Datum, Uhrzeit, Teilnehmer, Anlass, Inhalt, Vereinbarungen, Nächste Schritte. Picks up mandate parties + current lawyer as default Teilnehmer.

USE WHEN the user asks: "schreib mal nen Telefonvermerk zum Gespräch mit Anna Lee", "Aktennotiz zur heutigen Besprechung", "Memo zur Recherche zu §22 NIS2", "Beratungsprotokoll Erstberatung OrbitCo 5.5.".

After calling: write the actual note in your reply. Aktennotiz tone is FACTUAL + KNAPP — no formal salutation, no closing. Numbered subsections OK. Optional: short conclusion block ("Bewertung:" oder "Risikoeinschätzung:").`,
    input_schema: {
      type: "object",
      properties: {
        kind: {
          type: "string",
          enum: [
            "telefon_vermerk",
            "besprechungs_protokoll",
            "memo",
            "beratungs_protokoll",
            "recherche_memo",
            "sonstiges",
          ],
          description: "Notiz-Typ.",
        },
        subject: {
          type: "string",
          description:
            "Anlass / Betreff ('Telefonat Anna Lee zu Frequenz-Antrag', 'Recherche §22 NIS2 Anwendbarkeit auf Bodenstationen').",
        },
        participants: {
          type: "array",
          items: { type: "string" },
          description:
            "Optional list of Teilnehmer (Name + ggf. Funktion). When omitted, the lawyer + the mandate's primary client are used.",
        },
      },
      required: ["kind", "subject"],
    },
  },
  {
    name: "refine_document",
    description: `Takes an existing draft (Schriftsatz / Brief / Vertrag / Aktennotiz) the user is iterating on and produces refinement guidance for the AI to rewrite a specific section or aspect. Returns: which section to focus on, what aspect to change, suggested register (formaler/lockerer/kürzer/präziser), and any cross-references to mandate-data or citations that should be added.

USE WHEN the user says: "Begründung kürzer", "nochmal förmlicher", "Absatz 3 anders formulieren", "füg §22 NIS2 hinzu", "der Tonfall ist zu freundlich", "verkürz das auf eine Seite".

After calling: rewrite ONLY the requested section/aspect in your reply, NOT the whole document. Keep the rest implicitly unchanged. Output the new section block ready-to-paste.`,
    input_schema: {
      type: "object",
      properties: {
        target_section: {
          type: "string",
          description:
            "Which section to refine ('Begründung', 'Anrede', 'Anträge', 'Sachverhalt', 'gesamt'). 'gesamt' = entire document.",
        },
        change_kind: {
          type: "string",
          enum: [
            "kuerzer",
            "laenger",
            "formaler",
            "lockerer",
            "praeziser",
            "andere_formulierung",
            "zitat_hinzufuegen",
            "fakt_korrigieren",
            "sonstiges",
          ],
          description: "Art der Änderung.",
        },
        instruction: {
          type: "string",
          description:
            "Free-text spezifische Anweisung vom Anwalt ('halb so lang', 'mehr §-Bezüge', 'füg §22 NIS2 ein', 'der Mandant hieß Anna Lee nicht Hans Müller').",
        },
      },
      required: ["target_section", "change_kind", "instruction"],
    },
  },
];

const DRAFTING_TOOL_NAMES = DRAFTING_TOOLS.map((t) => t.name) as string[];

export function isDraftingToolName(name: string): boolean {
  return DRAFTING_TOOL_NAMES.includes(name);
}

/* Type alias kept for verbatim function compat with executor code. */
type AtlasToolResult = DraftingToolResult;

/* ── Implementations (extracted verbatim from atlas-tool-executor.ts) ─ */

// ─── draft_authorization_application ─────────────────────────────────

const OPERATOR_TYPES = [
  "satellite_operator",
  "launch_provider",
  "ground_segment",
  "data_provider",
  "in_orbit_services",
  "constellation_operator",
  "space_resource_operator",
] as const;

const DraftApplicationInput = z.object({
  jurisdiction: z
    .string()
    .min(2)
    .max(5)
    .regex(/^[A-Z]{2,3}$/, {
      message: "jurisdiction must be 2-3 uppercase letters",
    }),
  operator_type: z.enum(OPERATOR_TYPES),
  mission_profile: z.string().max(2000).optional(),
});

/**
 * Returns the highest-relevance OPERATIVE national licensing statutes
 * for a JD. Only primary or secondary national legislation qualifies:
 * a UK SIA 2018 entry is something an operator files under; OST
 * ratifications, ESA accession policy papers, technical standards,
 * and draft proposals are not the regime that grants the licence.
 *
 * Allowlist (not denylist) is the right semantic: treaty stubs and
 * accession policy documents share the `licensing` compliance area
 * tag but don't constitute a domestic licensing regime, and we want
 * `NO_REGIME` to fire honestly for jurisdictions that lack a
 * national space-licensing statute (e.g. Estonia).
 */
function topLicensingSources(jurisdiction: string, limit = 5): LegalSource[] {
  const order: Record<string, number> = {
    fundamental: 0,
    critical: 1,
    high: 2,
    medium: 3,
    low: 4,
  };
  const STATUTORY_TYPES: ReadonlySet<LegalSource["type"]> = new Set([
    "federal_law",
    "federal_regulation",
  ]);
  return ALL_SOURCES.filter(
    (s) =>
      s.jurisdiction === jurisdiction &&
      s.compliance_areas.includes("licensing") &&
      s.status === "in_force" &&
      STATUTORY_TYPES.has(s.type),
  )
    .sort(
      (a, b) =>
        (order[a.relevance_level] ?? 9) - (order[b.relevance_level] ?? 9),
    )
    .slice(0, limit);
}

function draftAuthorizationApplication(args: {
  input: unknown;
}): AtlasToolResult {
  const raw = args.input as { jurisdiction?: unknown };
  const normalised = {
    ...((args.input as object) ?? {}),
    jurisdiction:
      typeof raw?.jurisdiction === "string"
        ? raw.jurisdiction.toUpperCase()
        : raw?.jurisdiction,
  };
  const parsed = DraftApplicationInput.safeParse(normalised);
  if (!parsed.success) {
    return {
      content: JSON.stringify({
        error: "Invalid drafting input",
        code: "INVALID_INPUT",
        issues: parsed.error.issues.map((i) => i.path.join(".")),
      }),
      isError: true,
    };
  }

  const { jurisdiction, operator_type, mission_profile } = parsed.data;
  const sources = topLicensingSources(jurisdiction, 6);

  if (sources.length === 0) {
    // The "no domestic implementation" stub jurisdictions: EE, HR, HU,
    // IS, LI, LT, LV, RO, SI, SK and similar — Atlas has flagged them
    // as having no operative national space-law statute. The agent
    // should explain the OST Art. VI fallback rather than draft.
    return {
      content: JSON.stringify({
        error: `No operative national space-licensing regime catalogued for ${jurisdiction}.`,
        code: "NO_REGIME",
        jurisdiction,
        guidance:
          "Atlas catalogues this jurisdiction as having no dedicated national space-activities statute. The OST Art. VI authorisation obligation is typically discharged through (a) inter-ministerial administrative practice, (b) bilateral arrangements with another jurisdiction whose regime applies, or (c) operating under a foreign operator licence. Tell the user the jurisdiction is not directly draftable and suggest these fallbacks.",
      }),
      isError: true,
    };
  }

  const authorities = getAuthoritiesByJurisdiction(jurisdiction);
  const primaryAuthority = authorities.find((a) =>
    a.applicable_areas.includes("licensing"),
  );

  // Pull quantitative thresholds out of the source provisions. The
  // model can re-cite them in the scaffold without inventing numbers.
  const quantitativeAnchors: Array<{
    label: string;
    source_id: string;
    section: string;
    text: string;
  }> = [];
  for (const s of sources) {
    for (const p of s.key_provisions) {
      const blob = `${p.title} ${p.summary}`.toLowerCase();
      if (
        blob.includes("insurance") ||
        blob.includes("indemnif") ||
        blob.includes("haftpflicht") ||
        blob.includes("versicherung")
      ) {
        quantitativeAnchors.push({
          label: "insurance / indemnification",
          source_id: s.id,
          section: p.section,
          text: p.summary.slice(0, 280),
        });
      } else if (
        blob.includes("casualty") ||
        blob.includes("10⁻⁴") ||
        blob.includes("10⁻⁵") ||
        blob.includes("10⁻⁶") ||
        blob.includes("1:10,000") ||
        blob.includes("re-entry risk") ||
        blob.includes("re-entry casualty")
      ) {
        quantitativeAnchors.push({
          label: "casualty-risk threshold",
          source_id: s.id,
          section: p.section,
          text: p.summary.slice(0, 280),
        });
      } else if (
        blob.includes("post-mission disposal") ||
        blob.includes("end of mission") ||
        blob.includes("end-of-life") ||
        blob.includes("debris mitigation") ||
        blob.includes("trümmer") ||
        blob.includes("entsorgung") ||
        blob.includes("25-year") ||
        blob.includes("5-year")
      ) {
        quantitativeAnchors.push({
          label: "post-mission disposal / debris mitigation",
          source_id: s.id,
          section: p.section,
          text: p.summary.slice(0, 280),
        });
      } else if (
        blob.includes("disposal-reliability") ||
        blob.includes("0.9") ||
        blob.includes("0.95") ||
        blob.includes("reliability ≥") ||
        blob.includes("zuverlässigkeit")
      ) {
        quantitativeAnchors.push({
          label: "disposal reliability target",
          source_id: s.id,
          section: p.section,
          text: p.summary.slice(0, 280),
        });
      }
    }
  }

  const sectionTemplate = [
    {
      heading: "1. Operator identification & corporate authority",
      content_brief:
        "Legal name, registered office, ownership structure, ultimate beneficial owner, prior space-activity history, regulatory record. For non-domestic operators include certified translation of corporate documents.",
    },
    {
      heading: "2. Mission profile",
      content_brief:
        "Orbit, payload mass, frequency bands, end-customer profile, mission duration, propulsion architecture, planned manoeuvre cadence. Reference the operator's mission_profile input verbatim where supplied.",
    },
    {
      heading: "3. Technical safety case",
      content_brief:
        "Failure-mode-and-effects analysis, redundancy architecture, ground-segment cybersecurity baseline, range-safety coordination plan. Cite sectoral standards (ECSS-Q-ST-80C for software-PA, ISO 24113 for SDM).",
    },
    {
      heading: "4. Debris-mitigation and end-of-life plan",
      content_brief:
        "Apply the jurisdiction's PMD timeline (5-year vs 25-year), passivation procedures, casualty-risk computation, disposal-reliability demonstration, conjunction-data-sharing commitment.",
    },
    {
      heading: "5. Insurance and indemnification",
      content_brief:
        "Third-party-liability cover at the jurisdiction's threshold, named beneficiaries, cross-waiver of liability where applicable, indemnification regime above the operator-insurance ceiling.",
    },
    {
      heading: "6. Spectrum coordination",
      content_brief:
        "ITU-R coordination status (API/CR/C filings), national spectrum licence (Ofcom/BNetzA/ANFR/etc.), Resolution 35 milestone schedule for NGSO constellations.",
    },
    {
      heading: "7. Export-control & sanctions screening",
      content_brief:
        "ITAR / EAR / Wassenaar / MTCR / NSG screening of payload origin and end-customer. UK ECJU / FR CIEEMG / DE BAFA / US DDTC / BIS clearance status.",
    },
    {
      heading: "8. National-security review (where applicable)",
      content_brief:
        "FDI screening, Article-346-TFEU defence-industry overlay, dual-use technology disclosure, foreign-control thresholds.",
    },
    {
      heading: "9. Required attachments",
      content_brief:
        "Technical drawings, financial statements, insurance certificates, end-user-undertaking letters, environmental review (NEPA / EIA / Habitats), prior-launch-history attestations.",
    },
  ];

  const payload = {
    drafting_mode: "authorization_application",
    jurisdiction,
    operator_type,
    mission_profile_provided: !!mission_profile,
    primary_authority: primaryAuthority
      ? {
          id: primaryAuthority.id,
          name_en: primaryAuthority.name_en,
          abbreviation: primaryAuthority.abbreviation,
          website: primaryAuthority.website,
        }
      : null,
    legal_framework: sources.map((s) => ({
      id: s.id,
      title: s.title_en,
      type: s.type,
      relevance: s.relevance_level,
      official_reference: s.official_reference,
    })),
    quantitative_anchors: quantitativeAnchors.slice(0, 12),
    section_template: sectionTemplate,
    drafting_directives: [
      "Compose the application in the user's preferred language (DE / EN / FR — match the conversation).",
      "Cite EVERY substantive provision with [ATLAS-ID] in square brackets at the end of the sentence — never invent IDs, only cite IDs from this scaffold.",
      "When the user supplied a mission_profile, weave it into Section 2 and tailor Sections 3-5 to its specifics.",
      "Wrap the final draft with the legal-review disclaimer (see system prompt).",
      "Mark every numerical threshold (insurance cap, casualty risk, PMD year, reliability target) with the source id it came from. Cite the exact provision.",
      "If a section's information is not in the scaffold, write 'TODO — operator to supply' rather than guessing.",
    ],
    next_step_for_user: mission_profile
      ? "Compose the draft, then ask the user to verify the operator details, mission specifics, and which optional sections (FDI, sanctions screening) need to be filled in."
      : "Compose the draft as a template with operator-specific TODOs flagged. Ask the user for operator name, mission profile, and insurance arrangements before finalising.",
  };

  return { content: JSON.stringify(payload), isError: false };
}

// ─── draft_compliance_brief ──────────────────────────────────────────

const DraftBriefInput = z.object({
  topic: z.string().min(5).max(200),
  jurisdictions: z
    .array(
      z
        .string()
        .min(2)
        .max(5)
        .regex(/^[A-Z]{2,3}$/),
    )
    .max(15)
    .optional(),
  operator_context: z.string().max(2000).optional(),
});

function draftComplianceBrief(args: { input: unknown }): AtlasToolResult {
  const raw = args.input as {
    jurisdictions?: unknown;
  };
  const normalised = {
    ...((args.input as object) ?? {}),
    jurisdictions: Array.isArray(raw?.jurisdictions)
      ? (raw.jurisdictions as string[]).map((j) =>
          typeof j === "string" ? j.toUpperCase() : j,
        )
      : raw?.jurisdictions,
  };
  const parsed = DraftBriefInput.safeParse(normalised);
  if (!parsed.success) {
    return {
      content: JSON.stringify({
        error: "Invalid drafting input",
        code: "INVALID_INPUT",
        issues: parsed.error.issues.map((i) => i.path.join(".")),
      }),
      isError: true,
    };
  }

  const { topic, jurisdictions, operator_context } = parsed.data;
  const topicLc = topic.toLowerCase();
  const tokens = topicLc.split(/\s+/).filter((t) => t.length >= 3);

  // Score every source by token overlap on title + scope_description +
  // key_provisions, then pick top hits — no semantic call so the brief
  // scaffold builds with zero external cost.
  type Hit = { source: LegalSource; score: number };
  const scored: Hit[] = [];
  for (const s of ALL_SOURCES) {
    if (s.status !== "in_force" && s.status !== "draft") continue;
    if (jurisdictions && jurisdictions.length > 0) {
      if (
        !jurisdictions.includes(s.jurisdiction) &&
        // Always allow INT/EU sources through — they apply across the
        // jurisdiction list rather than belonging to a single member.
        s.jurisdiction !== "INT" &&
        s.jurisdiction !== "EU"
      ) {
        continue;
      }
    }
    const haystack = (
      s.title_en +
      " " +
      (s.scope_description ?? "") +
      " " +
      s.key_provisions.map((p) => `${p.title} ${p.summary}`).join(" ") +
      " " +
      s.compliance_areas.join(" ")
    ).toLowerCase();
    let score = 0;
    for (const tok of tokens) {
      if (haystack.includes(tok)) score += 0.1;
      if (s.title_en.toLowerCase().includes(tok)) score += 0.3;
    }
    if (haystack.includes(topicLc)) score += 0.4;
    score = Math.min(score, 1);
    if (score >= 0.1) scored.push({ source: s, score });
  }

  scored.sort((a, b) => b.score - a.score);
  const topSources = scored.slice(0, 12);

  // Cross-link cases applying the top-scoring sources.
  const caseSet = new Map<string, LegalCase>();
  for (const { source } of topSources.slice(0, 6)) {
    for (const c of getCasesApplyingSource(source.id)) {
      caseSet.set(c.id, c);
    }
  }
  const relevantCases = [...caseSet.values()].slice(0, 8);

  // Group sources by jurisdiction for the per-JD key-points table.
  const byJurisdiction = new Map<string, Hit[]>();
  for (const hit of topSources) {
    const arr = byJurisdiction.get(hit.source.jurisdiction) ?? [];
    arr.push(hit);
    byJurisdiction.set(hit.source.jurisdiction, arr);
  }
  const jurisdictionBuckets = [...byJurisdiction.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 7)
    .map(([jd, hits]) => ({
      jurisdiction: jd,
      key_sources: hits.slice(0, 4).map((h) => ({
        id: h.source.id,
        title: h.source.title_en,
        relevance: h.source.relevance_level,
      })),
    }));

  const briefStructure = [
    {
      heading: "Executive Summary",
      content_brief:
        "Two-three-sentence answer to the topic. Lead with the operator-actionable conclusion.",
    },
    {
      heading: "Legal Framework",
      content_brief:
        "Hierarchy of governing instruments: international (treaties, IADC, ISO), EU (regulations, directives), national (statutes, decrees). Cite each with [ATLAS-ID].",
    },
    {
      heading: "Per-jurisdiction Analysis",
      content_brief:
        "Render the jurisdictionBuckets as a table. Each row: jurisdiction · primary statute · key-threshold · enforcement-trail.",
    },
    {
      heading: "Enforcement Context",
      content_brief:
        "Cases that have applied the cited sources — render with [CASE-ID] tokens for hover-preview pills. Highlight precedential weight (binding / persuasive / settled-facts).",
    },
    {
      heading: "Risks & Open Questions",
      content_brief:
        "Identify the gaps where the catalogue does not give a definitive answer. Flag what additional facts the operator must supply.",
    },
    {
      heading: "Recommendations",
      content_brief:
        "Concrete next steps. Be specific (e.g. 'file under §X by Y date', 'add an indemnification clause referencing [Z]') rather than abstract.",
    },
  ];

  const payload = {
    drafting_mode: "compliance_brief",
    topic,
    jurisdictions_in_scope: jurisdictions ?? [],
    operator_context_provided: !!operator_context,
    sources_total: scored.length,
    top_sources: topSources.map((h) => ({
      id: h.source.id,
      jurisdiction: h.source.jurisdiction,
      type: h.source.type,
      title: h.source.title_en,
      relevance: h.source.relevance_level,
      score: Math.round(h.score * 100) / 100,
      provisions_count: h.source.key_provisions.length,
    })),
    jurisdiction_buckets: jurisdictionBuckets,
    relevant_cases: relevantCases.map((c) => ({
      id: c.id,
      jurisdiction: c.jurisdiction,
      title: c.title,
      date_decided: c.date_decided,
      precedential_weight: c.precedential_weight,
    })),
    brief_structure: briefStructure,
    drafting_directives: [
      "Render the brief in the user's preferred language (DE / EN — match the conversation).",
      "Use the brief_structure as the section order; tailor section content to the operator_context where supplied.",
      "Cite every substantive proposition with [ATLAS-ID] (sources) or [CASE-ID] (cases) — never invent IDs.",
      "Where the catalogue has no source for a sub-question, say so explicitly and recommend the user supply more facts.",
      "Wrap the final memo with the legal-review disclaimer (see system prompt).",
    ],
  };

  return { content: JSON.stringify(payload), isError: false };
}

/* compare_jurisdictions_for_filing + summarize_changes_since
   moved to comparison-tools.server.ts (Atlas V3 T0.1.f bundle-split,
   2026-05-26). All constants (COMPARE_CRITERIA, DEFAULT_COMPARE_
   JURISDICTIONS, DEFAULT_CRITERIA), zod schemas (CompareInput,
   ChangesInput), interfaces (CriterionMatch, AmendmentEntry,
   LifecycleEntry), and the findCriterionMatch helper all moved
   with the bundle. REGULATION_TIMELINE + RegulationPhase imports
   removed from this file. */

/* ─── Sprint 12 (2026-05-17): Chat-native Document Drafting ─────────────
 *
 * 5 tools that turn natural-language requests like "schreib ne Vollmacht
 * für OrbitCo" into structured scaffolds the AI uses to compose the
 * actual document IN ITS CHAT REPLY. All auto-load mandate context
 * (parties, header, custom instructions, deadlines) when mandateId is
 * attached, so the lawyer never has to repeat Mandanten-Daten.
 *
 * Each draft tool RETURNS A SCAFFOLD, not a finished document. The AI
 * uses the scaffold (sections, parties, citations, hints) to write the
 * actual prose. Output goes into the chat as Markdown — the lawyer can
 * download via the existing per-table PDF / per-artifact PDF+DOCX
 * buttons (when in agent-mode) or copy-paste into Word.
 *
 * HARD RULE in the tool descriptions: every draft must include the
 * legal-review disclaimer + PRIVILEGED & CONFIDENTIAL marker for
 * Schriftsatz / Verträge. The scaffolds remind the AI of this.
 * ─────────────────────────────────────────────────────────────────── */

/* loadMandateScaffoldContext moved to
   `./mandate-scaffold-context.server.ts` as part of Atlas V3 T0.1.c
   bundle-split (2026-05-26). Imported above. Same signature + behaviour. */

const DRAFT_DISCLAIMER_DE =
  "Hinweis: AI-generierter Entwurf. Vor Versand juristisch zu prüfen.";
const PRIVILEGE_BANNER_DE = "PRIVILEGED & CONFIDENTIAL · Anwaltsgeheimnis";

const DraftSchriftsatzInput = z.object({
  recipient: z.string().trim().max(200).optional(),
  subject: z.string().trim().min(5).max(200),
  purpose: z.enum([
    "antrag",
    "stellungnahme",
    "beschwerde",
    "klage",
    "widerspruch",
    "anhoerung",
    "sonstiges",
  ]),
  key_points: z.array(z.string().max(500)).max(5).optional(),
});

async function draftSchriftsatzTool(args: {
  input: unknown;
  callerUserId: string;
  callerOrgId: string;
  mandateId?: string | null;
}): Promise<AtlasToolResult> {
  const parsed = DraftSchriftsatzInput.safeParse(args.input);
  if (!parsed.success) {
    return {
      content: JSON.stringify({
        error: "Invalid input",
        details: parsed.error.flatten(),
      }),
      isError: true,
    };
  }
  const d = parsed.data;
  const ctx = await loadMandateScaffoldContext({
    mandateId: args.mandateId,
    callerUserId: args.callerUserId,
    callerOrgId: args.callerOrgId,
  });
  const today = new Date().toLocaleDateString("de-DE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  /* Resolve recipient: explicit > mandate.primaryAuthority > first
     authority-party > placeholder. */
  const authorityParty = ctx?.parties.find((p) => p.type === "authority");
  const recipientName =
    d.recipient ??
    ctx?.primaryAuthority ??
    authorityParty?.name ??
    "[Empfänger einsetzen]";
  const clientParty = ctx?.parties.find((p) => p.type === "client") ?? null;
  const aktenzeichen = clientParty?.reference ?? null;

  const sections = [
    "Briefkopf (Kanzlei-Branding, automatisch wenn AtlasOrgBranding gepflegt)",
    `Empfänger: ${recipientName}`,
    aktenzeichen
      ? `Aktenzeichen: ${aktenzeichen}`
      : "Aktenzeichen: [falls vorhanden einsetzen]",
    `Bezug / Betreff: ${d.subject}`,
    "Anrede (formal: 'Sehr geehrte Damen und Herren')",
    "Sachverhalt (kurz, faktisch, chronologisch)",
    "Anträge / Begehren (klar nummeriert)",
    "Begründung (auf Anträge bezogen, mit [ATLAS:...] Citations)",
    "Schlussformel ('Mit freundlichen Grüßen')",
    "Unterschriftsblock (Anwalt-Name, Funktion)",
  ];

  const payload = {
    kind: "schriftsatz" as const,
    purpose: d.purpose,
    today,
    recipient: recipientName,
    aktenzeichen,
    subject: d.subject,
    key_points: d.key_points ?? [],
    sections,
    mandate_context: ctx
      ? {
          name: ctx.name,
          jurisdiction: ctx.jurisdiction,
          operatorType: ctx.operatorType,
          customInstructions: ctx.customInstructions,
          parties: ctx.parties,
        }
      : null,
    lawyer: ctx ? { name: ctx.ownerName, email: ctx.ownerEmail } : null,
    drafting_directives: [
      `Begin output with: "${PRIVILEGE_BANNER_DE}" auf eigener Zeile, dann eine Leerzeile, dann den Schriftsatz.`,
      "Sprache: Deutsch (formal, juristischer Stil).",
      "Begründung: jede regulatorische Aussage MIT [ATLAS:...] Citation belegen.",
      "Anträge: nummeriert (1., 2., 3.) und prägnant.",
      d.key_points && d.key_points.length > 0
        ? `Key-Points aus Lawyer-Input einbauen: ${d.key_points.join(" · ")}`
        : null,
      ctx?.customInstructions
        ? "Mandate-Custom-Instructions berücksichtigen (siehe mandate_context.customInstructions)."
        : null,
      `End output with: "${DRAFT_DISCLAIMER_DE}" auf eigener Zeile.`,
    ].filter(Boolean),
  };
  return { content: JSON.stringify(payload), isError: false };
}

const DraftMandantenbriefInput = z.object({
  kind: z.enum([
    "mandatsbestaetigung",
    "sachstandsbericht",
    "erstberatung_memo",
    "schlussbericht",
    "honorarnote_begleitschreiben",
    "sonstiges",
  ]),
  subject: z.string().trim().min(5).max(200),
  key_points: z.array(z.string().max(500)).max(5).optional(),
  tone: z.enum(["formal", "warm", "neutral"]).optional(),
});

async function draftMandantenbriefTool(args: {
  input: unknown;
  callerUserId: string;
  callerOrgId: string;
  mandateId?: string | null;
}): Promise<AtlasToolResult> {
  const parsed = DraftMandantenbriefInput.safeParse(args.input);
  if (!parsed.success) {
    return {
      content: JSON.stringify({
        error: "Invalid input",
        details: parsed.error.flatten(),
      }),
      isError: true,
    };
  }
  const d = parsed.data;
  const ctx = await loadMandateScaffoldContext({
    mandateId: args.mandateId,
    callerUserId: args.callerUserId,
    callerOrgId: args.callerOrgId,
  });
  const today = new Date().toLocaleDateString("de-DE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const clientParty = ctx?.parties.find((p) => p.type === "client") ?? null;
  const recipientName =
    clientParty?.name ?? ctx?.clientName ?? "[Mandant einsetzen]";
  const recipientContact = clientParty?.contact ?? ctx?.clientContact ?? null;

  /* Section skeleton varies per kind. */
  const sectionsByKind: Record<typeof d.kind, string[]> = {
    mandatsbestaetigung: [
      "Anrede",
      "Bestätigung der Mandatsannahme + Datum",
      "Definition des Mandatsgegenstandes (kurz, präzise)",
      "Honorarvereinbarung (Verweis oder Inline)",
      "Nächste Schritte + Erstkontakt-Zusage",
      "Schlussformel",
    ],
    sachstandsbericht: [
      "Anrede",
      "Zusammenfassung (1 Absatz, oben)",
      "Was wurde seit letztem Bericht erreicht (chronologisch)",
      "Aktuelle Fristen + nächste Termine",
      "Empfehlung / nächste Anwalt-Aktion + ggf. Mandanten-Aktion",
      "Schlussformel",
    ],
    erstberatung_memo: [
      "Anrede",
      "Bezug auf Erstberatung + Datum",
      "Rechtliche Einordnung des Sachverhalts (mit [ATLAS:...] Citations)",
      "Risiken + Handlungsoptionen",
      "Empfehlung",
      "Honorar-Hinweis + Mandats-Annahme-Schritt",
      "Schlussformel",
    ],
    schlussbericht: [
      "Anrede",
      "Mandatsabschluss-Erklärung + Datum",
      "Endergebnis (kurz, faktisch)",
      "Aktenarchivierungs-Hinweis + DSGVO-Bezug",
      "Schlussformel",
    ],
    honorarnote_begleitschreiben: [
      "Anrede",
      "Begleitsatz zur anliegenden Honorarnote",
      "Bezahl-Hinweis (BIC/IBAN, Zahlungsfrist)",
      "Schlussformel",
    ],
    sonstiges: ["Anrede", "Sachverhalt / Anliegen", "Inhalt", "Schlussformel"],
  };

  const payload = {
    kind: "brief" as const,
    sub_kind: d.kind,
    today,
    recipient: recipientName,
    recipient_contact: recipientContact,
    subject: d.subject,
    tone: d.tone ?? "formal",
    key_points: d.key_points ?? [],
    sections: sectionsByKind[d.kind],
    mandate_context: ctx
      ? {
          name: ctx.name,
          jurisdiction: ctx.jurisdiction,
          customInstructions: ctx.customInstructions,
          authority: ctx.primaryAuthority,
        }
      : null,
    lawyer: ctx ? { name: ctx.ownerName, email: ctx.ownerEmail } : null,
    drafting_directives: [
      "Sprache: Deutsch, juristisch-präzise aber Mandanten-verständlich (keine Fachjargon-Mauern).",
      d.tone === "warm"
        ? "Anrede: persönlich ('Liebe Frau Lee') aber formell. Schluss: 'Mit den besten Grüßen'."
        : "Anrede: formell ('Sehr geehrte Frau Lee'). Schluss: 'Mit freundlichen Grüßen'.",
      d.kind === "sachstandsbericht"
        ? "Wenn Fristen aus mandate_context.deadlines vorliegen, in 'Aktuelle Fristen' Section listen."
        : null,
      `Datum oben rechts: ${today}`,
      `End output with: "${DRAFT_DISCLAIMER_DE}" auf eigener Zeile.`,
    ].filter(Boolean),
  };
  return { content: JSON.stringify(payload), isError: false };
}

const DraftVertragInput = z.object({
  kind: z.enum([
    "vollmacht",
    "mandatsvereinbarung",
    "nda",
    "kooperationsvereinbarung",
    "honorarvereinbarung",
    "sonstiges",
  ]),
  counterparty_party_id: z.string().cuid().optional(),
  scope: z.string().trim().min(5).max(500).optional(),
});

async function draftVertragTool(args: {
  input: unknown;
  callerUserId: string;
  callerOrgId: string;
  mandateId?: string | null;
}): Promise<AtlasToolResult> {
  const parsed = DraftVertragInput.safeParse(args.input);
  if (!parsed.success) {
    return {
      content: JSON.stringify({
        error: "Invalid input",
        details: parsed.error.flatten(),
      }),
      isError: true,
    };
  }
  const d = parsed.data;
  const ctx = await loadMandateScaffoldContext({
    mandateId: args.mandateId,
    callerUserId: args.callerUserId,
    callerOrgId: args.callerOrgId,
  });

  /* Counterparty resolution: explicit party-id > first client > placeholder. */
  let counterparty: {
    name: string;
    address: string | null;
    contact: string | null;
  };
  if (d.counterparty_party_id && ctx) {
    const p = ctx.parties.find((x) => x.id === d.counterparty_party_id);
    counterparty = p
      ? { name: p.name, address: p.address, contact: p.contact }
      : { name: "[Gegenpartei]", address: null, contact: null };
  } else {
    const c = ctx?.parties.find((p) => p.type === "client") ?? null;
    counterparty = c
      ? { name: c.name, address: c.address, contact: c.contact }
      : {
          name: ctx?.clientName ?? "[Gegenpartei]",
          address: null,
          contact: ctx?.clientContact ?? null,
        };
  }

  /* Clause-spine differs per Vertrags-Typ. */
  const spineByKind: Record<typeof d.kind, string[]> = {
    vollmacht: [
      "Bezeichnung (Vollmacht)",
      "Vollmachtgeber (Counterparty)",
      "Bevollmächtigter (Anwalt)",
      "Gegenstand der Vollmacht (Scope)",
      "Umfang (Vertretung vor Gerichten, Behörden, Aufnahme/Entgegennahme von Zustellungen)",
      "Untervollmacht-Klausel",
      "Erlöschens-Klausel",
      "Ort, Datum, Unterschriften",
    ],
    mandatsvereinbarung: [
      "Präambel",
      "§1 Mandatsgegenstand",
      "§2 Mandatsumfang (Was IST + was IST NICHT vom Mandat erfasst)",
      "§3 Honorar (RVG / Vereinbarung) — TODO: {{Honorarsatz EUR/h}} einsetzen",
      "§4 Auslagen + Vorschuss",
      "§5 Pflichten Mandant (Mitwirkung, Wahrheit)",
      "§6 Datenschutz (DSGVO + §43e BRAO)",
      "§7 Schlichtungsstelle",
      "§8 Gerichtsstand + anwendbares Recht",
      "Ort, Datum, Unterschriften",
    ],
    nda: [
      "Parteien",
      "Präambel (Anlass)",
      "§1 Vertrauliche Information (Definition)",
      "§2 Verpflichtungen",
      "§3 Ausnahmen",
      "§4 Dauer + Rückgabe",
      "§5 Vertragsstrafe",
      "§6 Gerichtsstand + anwendbares Recht",
      "§7 Salvatorische Klausel",
      "Ort, Datum, Unterschriften",
    ],
    kooperationsvereinbarung: [
      "Parteien",
      "Präambel (Anlass + Ziel der Kooperation)",
      "§1 Gegenstand",
      "§2 Pflichten beider Parteien",
      "§3 Honorar-Teilung + Abrechnung",
      "§4 Haftung",
      "§5 Vertraulichkeit",
      "§6 Laufzeit + Kündigung",
      "§7 Gerichtsstand",
      "Unterschriften",
    ],
    honorarvereinbarung: [
      "Parteien",
      "§1 Gegenstand der Vereinbarung",
      "§2 Honorarsatz / Stundensatz",
      "§3 Vorschuss + Abrechnung",
      "§4 Auslagen + Umsatzsteuer",
      "§5 Fälligkeit + Verzug",
      "Unterschriften",
    ],
    sonstiges: [
      "Parteien",
      "Präambel",
      "Vertragsinhalt",
      "Schlussbestimmungen",
      "Unterschriften",
    ],
  };

  const payload = {
    kind: "vertrag" as const,
    sub_kind: d.kind,
    counterparty,
    scope: d.scope ?? null,
    clause_spine: spineByKind[d.kind],
    mandate_context: ctx
      ? { name: ctx.name, jurisdiction: ctx.jurisdiction }
      : null,
    lawyer: ctx ? { name: ctx.ownerName, email: ctx.ownerEmail } : null,
    drafting_directives: [
      `Begin output with: "${PRIVILEGE_BANNER_DE}" auf eigener Zeile.`,
      "Sprache: Deutsch, juristisch-präzise. RVG-konform wo zutreffend.",
      "Gerichtsstand: Sitz der Kanzlei (falls AtlasOrgBranding vorhanden, sonst Platzhalter).",
      "{{Token}}-Style Placeholders NUR für Variablen die nicht aufgelöst werden konnten.",
      `End output with: "${DRAFT_DISCLAIMER_DE}" auf eigener Zeile.`,
    ],
  };
  return { content: JSON.stringify(payload), isError: false };
}

const DraftAktennotizInput = z.object({
  kind: z.enum([
    "telefon_vermerk",
    "besprechungs_protokoll",
    "memo",
    "beratungs_protokoll",
    "recherche_memo",
    "sonstiges",
  ]),
  subject: z.string().trim().min(5).max(200),
  participants: z.array(z.string().max(200)).max(20).optional(),
});

async function draftAktennotizTool(args: {
  input: unknown;
  callerUserId: string;
  callerOrgId: string;
  mandateId?: string | null;
}): Promise<AtlasToolResult> {
  const parsed = DraftAktennotizInput.safeParse(args.input);
  if (!parsed.success) {
    return {
      content: JSON.stringify({
        error: "Invalid input",
        details: parsed.error.flatten(),
      }),
      isError: true,
    };
  }
  const d = parsed.data;
  const ctx = await loadMandateScaffoldContext({
    mandateId: args.mandateId,
    callerUserId: args.callerUserId,
    callerOrgId: args.callerOrgId,
  });
  const now = new Date();
  const today = now.toLocaleDateString("de-DE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const time = now.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });

  /* Default Teilnehmer: lawyer + first client party. */
  const participants = d.participants ?? [];
  if (participants.length === 0 && ctx) {
    const lawyer = ctx.ownerName ?? ctx.ownerEmail;
    if (lawyer) participants.push(`${lawyer} (Anwalt)`);
    const client = ctx.parties.find((p) => p.type === "client");
    if (client) participants.push(`${client.name} (Mandant)`);
  }

  const payload = {
    kind: "aktennotiz" as const,
    sub_kind: d.kind,
    today,
    time,
    subject: d.subject,
    participants,
    mandate_context: ctx ? { name: ctx.name } : null,
    sections: [
      "Datum + Uhrzeit",
      "Teilnehmer",
      "Anlass / Bezug",
      "Inhalt (numerische Sub-Punkte)",
      "Vereinbarungen / Ergebnisse",
      "Nächste Schritte (mit Verantwortlichkeit + Frist)",
    ],
    drafting_directives: [
      "Sprache: Deutsch, knapp + faktisch. KEINE Anrede, KEIN Briefkopf, KEINE Schlussformel.",
      "Inhalt nummeriert (1., 2., 3.). Ein-Satz-Punkte bevorzugt.",
      d.kind === "recherche_memo"
        ? "Bei Recherche-Memo: jede Rechtsaussage mit [ATLAS:...] Citation belegen."
        : null,
      "Aktennotiz ist INTERN — keine Privilege-Banner nötig.",
    ].filter(Boolean),
  };
  return { content: JSON.stringify(payload), isError: false };
}

const RefineDocumentInput = z.object({
  target_section: z.string().trim().min(1).max(80),
  change_kind: z.enum([
    "kuerzer",
    "laenger",
    "formaler",
    "lockerer",
    "praeziser",
    "andere_formulierung",
    "zitat_hinzufuegen",
    "fakt_korrigieren",
    "sonstiges",
  ]),
  instruction: z.string().trim().min(1).max(1000),
});

/* Sprint 12 C — Letterhead via Chat: getOrgBrandingTool /
   setOrgBrandingTool / SetOrgBrandingInput moved to
   branding-tools.server.ts as part of Atlas V3 T0.1 bundle-split
   (2026-05-26). The dispatch lives in the early-route guard at the
   top of executeAtlasTool() above. */

/* Sprint 12 D — Document Templates as Chat-Memory: SaveDocument-
   TemplateInput, tokenizeBody, saveDocumentTemplateTool,
   ListDocumentTemplatesInput, listDocumentTemplatesTool,
   UseDocumentTemplateInput, applyDocumentTemplateTool — all moved
   to templates-tools.server.ts as part of Atlas V3 T0.1.c bundle-
   split (2026-05-26). The unused block below has been removed. */

function refineDocumentTool(args: { input: unknown }): AtlasToolResult {
  const parsed = RefineDocumentInput.safeParse(args.input);
  if (!parsed.success) {
    return {
      content: JSON.stringify({
        error: "Invalid input",
        details: parsed.error.flatten(),
      }),
      isError: true,
    };
  }
  const d = parsed.data;

  const directives: Record<typeof d.change_kind, string> = {
    kuerzer:
      "Auf max. 50% der Original-Länge kürzen. Kernaussagen behalten, Schmuck weglassen.",
    laenger:
      "Inhaltlich vertiefen — zusätzliche Argumente, Belege, ggf. Beispiele.",
    formaler:
      "Tonfall förmlicher. Vollständige Sätze, keine Umgangssprache, juristisch präzise.",
    lockerer:
      "Tonfall weniger förmlich. Persönlicher, mandanten-näher, aber juristisch korrekt.",
    praeziser:
      "Vage Aussagen durch konkrete Tatsachen + Zahlen + Citations ersetzen.",
    andere_formulierung:
      "Selber Inhalt, völlig neue Formulierung. Wörter NICHT 1:1 wiederverwenden.",
    zitat_hinzufuegen:
      "Spezifische [ATLAS:...] Citations zur belegenden Behörde/Norm einfügen.",
    fakt_korrigieren: "Spezifischen Fakt im Text korrigieren wie beschrieben.",
    sonstiges: "Lawyer-Instruction wörtlich umsetzen.",
  };

  const payload = {
    target_section: d.target_section,
    change_kind: d.change_kind,
    instruction: d.instruction,
    directive: directives[d.change_kind],
    drafting_directives: [
      `Rewrite ONLY the section "${d.target_section}" — leave everything else as-is.`,
      directives[d.change_kind],
      `Lawyer's specific instruction: "${d.instruction}"`,
      "Output the new section block ready-to-paste — no preamble, no explanation, just the rewritten content.",
    ],
  };
  return { content: JSON.stringify(payload), isError: false };
}

// ─── Dispatcher ─────────────────────────────────────────────────────

/* ── Bundle entry-point ─────────────────────────────────────────────── */

export async function executeDraftingTool(args: {
  name: string;
  input: unknown;
  callerUserId: string;
  callerOrgId: string;
  mandateId?: string | null;
}): Promise<DraftingToolResult> {
  switch (args.name) {
    case "draft_authorization_application":
      return draftAuthorizationApplication({ input: args.input });
    case "draft_compliance_brief":
      return draftComplianceBrief({ input: args.input });
    case "draft_schriftsatz":
      return draftSchriftsatzTool({
        input: args.input,
        callerUserId: args.callerUserId,
        callerOrgId: args.callerOrgId,
        mandateId: args.mandateId,
      });
    case "draft_mandantenbrief":
      return draftMandantenbriefTool({
        input: args.input,
        callerUserId: args.callerUserId,
        callerOrgId: args.callerOrgId,
        mandateId: args.mandateId,
      });
    case "draft_vertrag":
      return draftVertragTool({
        input: args.input,
        callerUserId: args.callerUserId,
        callerOrgId: args.callerOrgId,
        mandateId: args.mandateId,
      });
    case "draft_aktennotiz":
      return draftAktennotizTool({
        input: args.input,
        callerUserId: args.callerUserId,
        callerOrgId: args.callerOrgId,
        mandateId: args.mandateId,
      });
    case "refine_document":
      return refineDocumentTool({ input: args.input });
    default:
      return {
        content: JSON.stringify({
          error: `Unknown drafting tool: ${args.name}`,
        }),
        isError: true,
      };
  }
}
