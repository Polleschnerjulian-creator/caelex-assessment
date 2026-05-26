import "server-only";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas Tools — Claude-callable functions for the generic Atlas AI
 * Mode (/api/atlas/ai-chat). These differ from the matter-scoped tools
 * (matter-tools.ts): those only work inside a specific mandate with
 * consented scope, while these are *workspace-level* — they help users
 * find and open mandates, not read their data.
 *
 * Phase 6a: one tool, `find_or_open_matter`. The client-side SSE
 * handler translates its response into a `navigate` event that pushes
 * the user into the matter workspace.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type Anthropic from "@anthropic-ai/sdk";
import { COMPLIANCE_TOOLS } from "./compliance-tools.server";
import { VALIDITY_TOOLS } from "./validity-tools.server";
import { DOCUMENT_TOOLS } from "./document-tools.server";
import { BRANDING_TOOLS } from "./branding-tools.server";
import { MANDATE_TOOLS } from "./mandate-tools.server";
import { DEADLINES_TOOLS } from "./deadlines-tools.server";
import { TEMPLATES_TOOLS } from "./templates-tools.server";
import { KORPUS_TOOLS } from "./korpus-tools.server";
import { COMPARISON_TOOLS } from "./comparison-tools.server";

const CORE_ATLAS_TOOLS: Anthropic.Tool[] = [
  {
    name: "find_operator_organization",
    description: `Searches the Caelex operator-organisation directory (all registered satellite operators / launch providers / space-service companies) by name fragment. Use this before \`create_matter_invite\` to resolve a client name to an orgId — never pass a guessed id.

Matches are fuzzy (case-insensitive contains on name + slug). Only ACTIVE operator orgs are returned. Max 8 candidates.

After calling:
  - 1 match → use its \`id\` in create_matter_invite, confirm the org name with user.
  - Multiple matches → list numbered, ask user to pick.
  - Zero matches → operator is not (yet) on Caelex. **Two options to proceed**:
    (a) **DEFAULT for a project-workspace**: use \`create_solo_matter\` directly with free-text clientName. The lawyer can work in the mandate immediately (vault, chats, agent-runs, deadlines) — no bilateral handshake needed.
    (b) Only when the lawyer explicitly wants a bilateral Caelex-counsel relationship: tell them the operator must sign up at caelex.eu first (not supported by this tool).
  Prefer (a) for "lege ein Mandat an", "mach mir einen Workspace für X" — these don't need the operator on Caelex.`,
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Free-text org name fragment (e.g. 'Rocket', 'Arianespace', 'Planet Labs'). 2-100 characters.",
        },
      },
      required: ["query"],
    },
  },

  {
    name: "create_matter_invite",
    description: `Creates a bilateral matter invitation from the caller's law firm to a Caelex operator org. The operator must still accept (handshake), but from Atlas's side the mandate draft is persisted and the invitation email is sent to the operator's OWNER.

HARD RULE — confirmation flow:
  1. On first call for a given mandate, ALWAYS pass action='preview'. Returns a dry-run payload with operator name + proposed scope + expiry.
  2. Only after the user has explicitly approved in natural language (e.g. 'ja, schick', 'bestätigt', 'go'), call again with action='create'.
  Never create without a preview turn first — even if the user was very explicit, the preview shows the operator org resolution which may surprise them.

On successful create, the client automatically navigates into the new matter's workspace (hero state — no conversations yet). The invitation email dispatch happens best-effort; even if email fails the mandate is created and the user gets the workspace link.

Scope levels:
  - 'advisory' (L1) — read + summaries only. One-off advisory work.
  - 'active_counsel' (L2) — read + annotate on compliance/auth/docs/timeline/incidents. Ongoing mandate.
  - 'full_counsel' (L3) — L2 + export + spacecraft registry. Full legal representation.

Defaults: scope_level='active_counsel', duration_months=12.`,
    input_schema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["preview", "create"],
          description:
            "'preview' for dry-run (mandatory first turn); 'create' to actually persist + send email.",
        },
        operator_org_id: {
          type: "string",
          description:
            "cuid of the operator org (resolved via find_operator_organization first).",
        },
        matter_name: {
          type: "string",
          description:
            "Human-readable mandate name, 3-200 chars. E.g. 'ESA Copernicus — NIS2 Compliance', 'Rocket Inc — Launch Authorization'.",
        },
        reference: {
          type: "string",
          description:
            "Optional firm-internal reference number, e.g. 'BHO-2026-112'. Max 50 chars.",
        },
        scope_level: {
          type: "string",
          enum: ["advisory", "active_counsel", "full_counsel"],
          description:
            "Predefined scope tier. Use advisory for one-off questions, active_counsel for ongoing mandates, full_counsel for full representation.",
        },
        duration_months: {
          type: "number",
          description: "Validity in months, 1-60. Default 12.",
        },
      },
      required: ["action", "operator_org_id", "matter_name"],
    },
  },

  {
    name: "create_solo_matter",
    description: `Creates a LAWYER-SIDE-ONLY mandate (project workspace) WITHOUT requiring the operator to be a Caelex-registered org. This is the DEFAULT mandate-creation path for almost all cases. Use this when:
- find_operator_organization returns zero matches AND the lawyer wants a workspace anyway
- the lawyer says "lege ein Mandat an für X", "mach mir einen Workspace für Y", "ich brauch ein Projekt"
- the client/operator is a prospect, an internal project, or just doesn't need a Caelex login

The mandate becomes a FULL project workspace immediately: Vault (files), Chats, Notes, Deadlines, Time-Entries, Agent-Runs, Background-Agent — alles hängt am mandateId.

clientName / clientContact are FREE-TEXT strings (no FK enforcement, no Caelex registration). The lawyer can later upgrade to a bilateral Caelex-counsel relationship via /atlas/network if the operator joins.

Approval flow: this tool starts with \`create_\` prefix and therefore triggers Atlas's automatic approval-gate (Sprint B1). The lawyer sees an approval card with the proposed name/clientName before persistence. Single call (no preview/create split — the approval gate IS the preview).

After successful creation, returns the new \`mandateId\`. The client navigates into the workspace at /atlas/mandate/[id].`,
    input_schema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description:
            "Mandate name (3-200 chars). E.g. 'Spire · SAT-2026', 'Internes Compliance-Projekt Q1', 'Akquise Iridium NIS2-Pitch'.",
        },
        clientName: {
          type: "string",
          description:
            "OPTIONAL free-text client/operator name. NO Caelex registration needed. E.g. 'Spire Global GmbH', 'Iridium Communications', 'Intern'.",
        },
        clientContact: {
          type: "string",
          description:
            "OPTIONAL client contact (email or phone). E.g. 'legal@spire.com'.",
        },
        jurisdiction: {
          type: "string",
          description: "OPTIONAL ISO-Code. E.g. 'DE', 'FR', 'EU', 'US'.",
        },
        operatorType: {
          type: "string",
          description:
            "OPTIONAL operator-type tag. E.g. 'satellite_operator', 'launch_provider', 'isos', 'data_provider'.",
        },
        primaryAuthority: {
          type: "string",
          description:
            "OPTIONAL primary regulatory authority. E.g. 'BNetzA', 'CNES', 'FCC', 'ESA'.",
        },
        customInstructions: {
          type: "string",
          description:
            "OPTIONAL Markdown system-prompt suffix injected into every chat of this mandate. Max 4000 chars. Lawyer can edit later.",
        },
      },
      required: ["name"],
    },
  },

  /* find_or_open_matter moved to mandate-tools.server.ts as part of
     Atlas V3 T0.1 bundle-split (2026-05-26). Resolved at runtime via
     isMandateToolName() in atlas-tool-executor.ts. */

  // ───────────────────────────────────────────────────────────────────
  // Legal-source navigation tools — added 2026-04 to give Astra explicit
  // ID-routing across the catalogue rather than relying on vector recall
  // for cross-cutting sources (sanctions, standards, ITU, insurance,
  // sectoral, EU programmes). The tools complement library-recall: when
  // the lawyer asks something specific ("show me ITU coordination
  // procedure"), Astra invokes get_legal_source_by_id directly; for
  // open-ended questions Astra still falls back on vector recall over
  // the embedded library.
  // ───────────────────────────────────────────────────────────────────

  /* search_legal_sources, get_legal_source_by_id, list_jurisdiction_authorities,
     search_cases, get_case_by_id moved to korpus-tools.server.ts
     (Atlas V3 T0.1.d bundle-split, 2026-05-26). */

  // ─── Drafting tools ───────────────────────────────────────────────
  // The drafting tools turn Atlas from a research surface into a
  // working-output surface. Each tool returns a STRUCTURED SCAFFOLD —
  // never finished prose. The Astra agent (the model itself) composes
  // the final draft using the scaffold, the cited sources, and the
  // operator context the user supplied.
  //
  // HARD RULE — drafting outputs are first-pass scaffolds, not legal
  // advice. ALWAYS prefix the user-facing draft with the standard
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

  /* compare_jurisdictions_for_filing + summarize_changes_since moved
     to comparison-tools.server.ts (Atlas V3 T0.1.f bundle-split,
     2026-05-26). Resolved at runtime via isComparisonToolName(). */

  /* get_filing_deadlines moved to deadlines-tools.server.ts as part
     of Atlas V3 T0.1.g bundle-split (2026-05-26). Resolved at
     runtime via isDeadlinesToolName() in atlas-tool-executor.ts. */

  {
    name: "search_mandate_vault",
    description: `Durchsucht die Vault-Files des aktuell angehängten Mandats nach semantischer Ähnlichkeit zur Query (RAG). Nur verfügbar wenn Chat einem Mandat zugewiesen ist — die chat-engine filtert dieses Tool raus wenn kein Mandat attached ist.

Returns up to \`limit\` Treffer (default 5, max 10). Jeder Treffer enthält: \`fileId\` (für Citation-Link), \`filename\`, \`text\` (der relevante Chunk), \`score\` (cosine 0..1), und \`chunkIndex/totalChunks\` für Quellenangabe.

Use cases:
 - "Was steht im Schriftsatz vom 12.3. zur Frequenzkoordination?"
 - "Find die Stelle im BNetzA-Bescheid wo die Widerspruchsfrist genannt wird"
 - "Welche Files erwähnen den Antrag XY?"

Cite sources in your reply with markdown links: \`[Mandats-Datei: filename.pdf](/atlas/mandate/<mandateId>/vault/<fileId>)\`. The chat-view renders these as clickable file references.`,
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Free-text query — was suchst du im Vault? Mind. 3 Zeichen.",
        },
        limit: {
          type: "integer",
          description: "Max number of chunks to return (default 5, max 10).",
          default: 5,
          minimum: 1,
          maximum: 10,
        },
      },
      required: ["query"],
    },
  },

  /* ── Sprint 12 (2026-05-17): Chat-native Document Drafting ───────────
   * 5 tools that turn natural-language requests like "Schreib mir ne
   * Vollmacht für OrbitCo" or "Antrag an BNetzA für Frequenz" into
   * structured document scaffolds the AI uses to compose the actual
   * Word-ready document IN ITS CHAT REPLY.
   *
   * Each tool auto-loads mandate context (parties, jurisdiction,
   * primary authority, custom instructions) when a mandateId is
   * attached to the chat, so the lawyer doesn't have to repeat
   * Mandanten-Daten every time.
   *
   * All draft tools return a SCAFFOLD payload, not a finished
   * document — the AI uses the scaffold + the citations it picked
   * to write the actual prose. Output goes into the chat as Markdown
   * which the lawyer can download via the per-table PDF buttons
   * (existing) or copy-paste into Word.
   *
   * HARD RULE: every draft must include the legal-review disclaimer
   * + the PRIVILEGED & CONFIDENTIAL marker for Schriftsatz / Verträge.
   * ────────────────────────────────────────────────────────────────── */
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

  /* Sprint 12 C — Letterhead via Chat: get_org_branding +
     set_org_branding now live in `branding-tools.server.ts` (Atlas V3
     T0.1 bundle-split, 2026-05-26). They get merged into ATLAS_TOOLS
     below via the BRANDING_TOOLS spread. */

  /* Sprint 12 D — Document Templates as Chat-Memory: save/list/use
     document templates moved to templates-tools.server.ts (Atlas V3
     T0.1.c bundle-split, 2026-05-26). Resolved at runtime via
     isTemplatesToolName(). */

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

/* Sprint D2 — agent-mode-only orchestration tools. Not used by chat-
   mode (the executor in atlas-tool-executor.ts has no handler; agent
   route special-cases them BEFORE delegating to the executor). The
   model is told about them via the agent system-prompt + the tool
   description below. */
const AGENT_ORCHESTRATION_TOOLS: Anthropic.Tool[] = [
  {
    name: "delegate_subtasks",
    description: `Sprint D2 — Fires K parallel sub-agents (max 4) to do genuinely-parallel work. Each sub-agent is single-completion (NO tool-use): it gets a self-contained prompt + lawyer-context and returns Markdown text. Results come back concatenated as \`## <title>\` sections so you can navigate them.

USE THIS WHEN:
 - "Compare X across N jurisdictions" — fire 1 sub-agent per jurisdiction
 - "Analyse N independent contract sections" — fire 1 sub-agent per section
 - "Recherchiere Argumentation für 3 verschiedene Hypothesen" — fire 1 per hypothesis

DO NOT use for:
 - Sequential dependencies (sub-agent B needs sub-agent A's output) — chain them in your own plan instead
 - Single-task work (just do it inline; delegation has overhead)
 - Anything requiring tool-use (sub-agents have no tools)

Each sub-task prompt MUST be self-contained — embed any mandate context, jurisdiction, or facts the sub-agent needs. Sub-agents see ONLY their own prompt, not your conversation.

Cost: K parallel Claude completions, max 1500 tokens each. Real wall-clock speedup ≈ K× for IO-bound work. Don't dispatch unless you'd genuinely save sequential turns.`,
    input_schema: {
      type: "object",
      properties: {
        subtasks: {
          type: "array",
          description:
            "Array of 1-4 sub-task specs. Each must have non-empty title (max 200 chars) + a self-contained prompt (≥10 chars, max 4000 chars).",
          items: {
            type: "object",
            properties: {
              title: {
                type: "string",
                description:
                  "Short label for the sub-task (e.g. 'Frankreich — Authorisierung', 'Sec 3.2 — Haftungsklausel').",
              },
              prompt: {
                type: "string",
                description:
                  "Self-contained prompt the sub-agent will receive. Embed any context the sub-agent needs — it has no conversation history.",
              },
            },
            required: ["title", "prompt"],
          },
          minItems: 1,
          maxItems: 4,
        },
      },
      required: ["subtasks"],
    },
  },
];

/* Atlas V2 Sprint 3-5 + V3 T0.1: tool bundles merged into the
   canonical ATLAS_TOOLS array so the chat-engine picks them up
   automatically.
   - Sprint 3: 8 compliance tools (compliance-tools.server.ts)
   - Sprint 4: 3 validity tools (validity-tools.server.ts)
   - Sprint 5: 5 document tools (document-tools.server.ts)
   - V3 T0.1: 2 branding tools (branding-tools.server.ts) */
export const ATLAS_TOOLS: Anthropic.Tool[] = [
  ...CORE_ATLAS_TOOLS,
  ...COMPLIANCE_TOOLS,
  ...VALIDITY_TOOLS,
  ...DOCUMENT_TOOLS,
  ...BRANDING_TOOLS,
  ...MANDATE_TOOLS,
  ...DEADLINES_TOOLS,
  ...TEMPLATES_TOOLS,
  ...KORPUS_TOOLS,
  ...COMPARISON_TOOLS,
  /* Sprint D2 — orchestration tools (agent-mode special-case). */
  ...AGENT_ORCHESTRATION_TOOLS,
];

/* Core (Sprint 1) tool-name union. Compliance tool names are matched at
   runtime via isComplianceToolName(); we intentionally don't enumerate
   them in the AtlasToolName literal-union to keep this file stable as
   the compliance-tools file grows. */
export type AtlasToolName =
  /* find_or_open_matter moved to mandate-tools.server.ts
     (Atlas V3 T0.1.b bundle-split). Resolved at runtime. */
  | "find_operator_organization"
  | "create_matter_invite"
  | "create_solo_matter"
  /* search_legal_sources, get_legal_source_by_id,
     list_jurisdiction_authorities, search_cases, get_case_by_id moved
     to korpus-tools.server.ts (Atlas V3 T0.1.d bundle-split). */
  /* list_workspace_templates moved to templates-tools.server.ts (T0.1.c). */
  | "draft_authorization_application"
  | "draft_compliance_brief"
  /* compare_jurisdictions_for_filing + summarize_changes_since moved
     to comparison-tools.server.ts (T0.1.f). */
  /* get_filing_deadlines moved to deadlines-tools.server.ts (T0.1.g). */
  /* Sprint 12 — chat-native document drafting. */
  | "draft_schriftsatz"
  | "draft_mandantenbrief"
  | "draft_vertrag"
  | "draft_aktennotiz"
  | "refine_document"
  /* Sprint 12 C — letterhead via chat. Now lives in branding-tools.server.ts
     (Atlas V3 T0.1 bundle-split). Names resolved at runtime via
     isBrandingToolName() in atlas-tool-executor.ts, like the
     compliance/validity/document bundles. */
  /* Sprint 12 D — document templates moved to templates-tools.server.ts
     (Atlas V3 T0.1.c bundle-split, 2026-05-26). */
  /* Sprint D2 — agent-mode orchestration. Resolved by the agent
     route's special-case path, NOT by atlas-tool-executor. */
  | "delegate_subtasks";

export function isAtlasToolName(name: string): boolean {
  return ATLAS_TOOLS.some((t) => t.name === name);
}
