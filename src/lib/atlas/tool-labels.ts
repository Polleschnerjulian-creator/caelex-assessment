/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Tool-label registry (client-safe).
 *
 * Maps internal snake_case tool names to user-facing German labels,
 * present-continuous "what it is doing" verbs, the source the tool
 * touches, and a parameter describer that pulls the most lawyer-
 * relevant field out of the input JSON (e.g. the `query` for a
 * corpus search, the `article_id` for a status check).
 *
 * Why this exists
 *   The chat surface used to render raw tool names (`search_legal_sources`,
 *   `check_article_status`, …) in the live trace. That's accurate but
 *   opaque — it asked the user to translate from engineering vocabulary
 *   to legal vocabulary mid-stream. This registry does the translation
 *   once, here, in plain German, with the source attached.
 *
 * Client-safe
 *   No `server-only` import — this file is read by AtlasChatView (a
 *   "use client" component). Keep it free of secrets, DB calls, etc.
 *
 * Adding a new tool
 *   Append an entry below the matching category. If you have no
 *   describer, leave it out — `labelFor()` falls back gracefully.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

export type ToolCategory =
  | "search"
  | "compliance"
  | "validity"
  | "document"
  | "drafting"
  | "matter"
  | "workspace";

export interface ToolLabel {
  /** Past tense ("Korpus durchsucht") — shown after completion. */
  done: string;
  /** Present continuous ("Sucht in Korpus") — shown while running. */
  running: string;
  /** Origin of the data ("Atlas-Korpus", "EUR-Lex", …). */
  source: string;
  /** Optional describer that pulls a relevant field from input. */
  describe?: (input: unknown) => string | undefined;
  /** Used for color/badge grouping in the UI. */
  category: ToolCategory;
}

/* Tiny safe accessors — input is always `unknown` because the
   chat-engine streams whatever Anthropic produces. */

function isObj(o: unknown): o is Record<string, unknown> {
  return typeof o === "object" && o !== null;
}

function s(o: unknown, k: string): string | undefined {
  if (!isObj(o)) return undefined;
  const v = o[k];
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

function firstString(o: unknown, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = s(o, k);
    if (v) return v;
  }
  return undefined;
}

function quote(s: string | undefined): string | undefined {
  if (!s) return undefined;
  /* German Anführungszeichen for strings the model produced. Truncate
     long queries so the row stays one-line in most cases. */
  const trimmed = s.length > 60 ? s.slice(0, 57) + "…" : s;
  return `„${trimmed}"`;
}

/* ── The registry ────────────────────────────────────────────────────── */

export const TOOL_LABELS: Record<string, ToolLabel> = {
  /* ── General Atlas tools (atlas-tools.ts) ───────────────────────── */
  search_legal_sources: {
    done: "Korpus durchsucht",
    running: "Durchsucht Atlas-Korpus",
    source: "Atlas-Korpus",
    describe: (i) => quote(firstString(i, "query", "q")),
    category: "search",
  },
  get_legal_source_by_id: {
    done: "Quelle abgerufen",
    running: "Ruft Quelle ab",
    source: "Atlas-Korpus",
    describe: (i) => firstString(i, "source_id", "id"),
    category: "search",
  },
  search_cases: {
    done: "Rechtsprechung durchsucht",
    running: "Durchsucht Rechtsprechung",
    source: "Atlas Cases",
    describe: (i) => quote(firstString(i, "query", "q")),
    category: "search",
  },
  get_case_by_id: {
    done: "Fall abgerufen",
    running: "Ruft Fall ab",
    source: "Atlas Cases",
    describe: (i) => firstString(i, "case_id", "id"),
    category: "search",
  },
  list_jurisdiction_authorities: {
    done: "Behörden aufgelistet",
    running: "Listet Behörden auf",
    source: "Jurisdiktions-Index",
    describe: (i) => firstString(i, "jurisdiction", "country"),
    category: "search",
  },
  list_workspace_templates: {
    done: "Vorlagen geladen",
    running: "Lädt Vorlagen",
    source: "Workspace-Bibliothek",
    category: "workspace",
  },
  find_operator_organization: {
    done: "Organisation gefunden",
    running: "Sucht Organisation",
    source: "Mandate-Index",
    describe: (i) => firstString(i, "name", "organization_name"),
    category: "matter",
  },
  find_or_open_matter: {
    done: "Mandat geöffnet",
    running: "Öffnet Mandat",
    source: "Mandate-Index",
    describe: (i) => firstString(i, "name", "matter_name"),
    category: "matter",
  },
  create_matter_invite: {
    done: "Mandats-Einladung erstellt",
    running: "Erstellt Mandats-Einladung",
    source: "Mandate-Index",
    describe: (i) => firstString(i, "matter_name", "name"),
    category: "matter",
  },

  /* ── Compliance tools (compliance-tools.server.ts) ──────────────── */
  assess_eu_space_act: {
    done: "EU Space Act bewertet",
    running: "Bewertet EU Space Act",
    source: "EU Space Act (COM(2025) 335)",
    describe: (i) => firstString(i, "operator_type"),
    category: "compliance",
  },
  classify_nis2: {
    done: "NIS2-Klassifizierung",
    running: "Klassifiziert nach NIS2",
    source: "NIS2-Richtlinie (EU 2022/2555)",
    describe: (i) => firstString(i, "sector", "operator_type"),
    category: "compliance",
  },
  assess_national_space_law: {
    done: "Nationales Weltraumrecht bewertet",
    running: "Bewertet nationales Weltraumrecht",
    source: "National Space Laws",
    describe: (i) => firstString(i, "jurisdiction", "country"),
    category: "compliance",
  },
  assess_uk_space_industry: {
    done: "UK Space Industry Act bewertet",
    running: "Bewertet UK Space Industry Act",
    source: "Space Industry Act 2018",
    category: "compliance",
  },
  assess_us_regulatory: {
    done: "US-Regulierung bewertet",
    running: "Bewertet US-Regulierung (FCC/FAA)",
    source: "FCC, FAA, Title 47/14 CFR",
    describe: (i) => firstString(i, "service_type"),
    category: "compliance",
  },
  classify_export_control: {
    done: "Exportkontrolle klassifiziert",
    running: "Klassifiziert Exportkontrolle (ITAR/EAR)",
    source: "ITAR (22 CFR 120-130) / EAR (15 CFR 734-774)",
    describe: (i) => firstString(i, "item", "technology"),
    category: "compliance",
  },
  check_spectrum_filing: {
    done: "Spektrum-Filing geprüft",
    running: "Prüft Spektrum-Filing (ITU)",
    source: "ITU Radio Regulations",
    describe: (i) => firstString(i, "frequency_band", "service"),
    category: "compliance",
  },
  check_copuos_compliance: {
    done: "COPUOS/IADC-Compliance geprüft",
    running: "Prüft COPUOS/IADC-Compliance",
    source: "UN COPUOS, IADC Guidelines",
    describe: (i) => firstString(i, "topic"),
    category: "compliance",
  },
  compare_jurisdictions_for_filing: {
    done: "Jurisdiktionen verglichen",
    running: "Vergleicht Jurisdiktionen",
    source: "10 nationale Weltraumgesetze",
    describe: (i) => {
      if (!isObj(i)) return undefined;
      const list = i.jurisdictions;
      if (Array.isArray(list))
        return list.filter((x) => typeof x === "string").join(", ");
      return undefined;
    },
    category: "compliance",
  },
  get_filing_deadlines: {
    done: "Fristen abgerufen",
    running: "Ruft Fristen ab",
    source: "Jurisdiktions-Index",
    describe: (i) => firstString(i, "jurisdiction", "regulation"),
    category: "compliance",
  },

  /* ── Validity tools (validity-tools.server.ts) ──────────────────── */
  check_article_status: {
    done: "Artikelstatus geprüft",
    running: "Prüft Artikelstatus",
    source: "Validity-Index",
    describe: (i) => firstString(i, "article_id", "article", "source_id"),
    category: "validity",
  },
  get_recent_norm_changes: {
    done: "Normänderungen abgerufen",
    running: "Sucht aktuelle Normänderungen",
    source: "Validity-Index",
    describe: (i) => firstString(i, "since", "regulation"),
    category: "validity",
  },
  find_related_norms: {
    done: "Verwandte Normen gefunden",
    running: "Sucht verwandte Normen",
    source: "Cross-Reference-Index",
    describe: (i) => firstString(i, "source_id", "article_id"),
    category: "validity",
  },
  summarize_changes_since: {
    done: "Änderungen zusammengefasst",
    running: "Fasst Änderungen zusammen",
    source: "Validity-Index",
    describe: (i) => firstString(i, "since"),
    category: "validity",
  },

  /* ── Document tools (document-tools.server.ts) ─────────────────── */
  extract_text_from_pdf: {
    done: "PDF-Text extrahiert",
    running: "Extrahiert PDF-Text",
    source: "Mandats-Dokumente",
    describe: (i) => firstString(i, "filename", "file_id"),
    category: "document",
  },
  find_clauses: {
    done: "Klauseln gefunden",
    running: "Sucht Klauseln",
    source: "Mandats-Dokumente",
    describe: (i) => quote(firstString(i, "query", "clause_type")),
    category: "document",
  },
  summarize_document: {
    done: "Dokument zusammengefasst",
    running: "Fasst Dokument zusammen",
    source: "Mandats-Dokumente",
    describe: (i) => firstString(i, "filename", "file_id"),
    category: "document",
  },
  classify_document: {
    done: "Dokument klassifiziert",
    running: "Klassifiziert Dokument",
    source: "Mandats-Dokumente",
    describe: (i) => firstString(i, "filename", "file_id"),
    category: "document",
  },
  compare_documents: {
    done: "Dokumente verglichen",
    running: "Vergleicht Dokumente",
    source: "Mandats-Dokumente",
    category: "document",
  },

  /* ── Drafting tools ─────────────────────────────────────────────── */
  draft_authorization_application: {
    done: "Genehmigungsantrag entworfen",
    running: "Entwirft Genehmigungsantrag",
    source: "Drafting-Engine",
    describe: (i) => firstString(i, "jurisdiction"),
    category: "drafting",
  },
  draft_compliance_brief: {
    done: "Compliance-Brief entworfen",
    running: "Entwirft Compliance-Brief",
    source: "Drafting-Engine",
    describe: (i) => firstString(i, "topic", "regulation"),
    category: "drafting",
  },
};

/**
 * Returns a sensible label for any tool name. Unknown tools fall back
 * to a human-ish version of the snake_case ("foo_bar_baz" → "Foo Bar Baz").
 */
export function labelFor(toolName: string): ToolLabel {
  const hit = TOOL_LABELS[toolName];
  if (hit) return hit;
  const human = toolName
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  return {
    done: human,
    running: human,
    source: "Atlas",
    category: "search",
  };
}

/**
 * Tailwind text color class per category. Used for the source-pill
 * and small leading dot in the live trace. Kept theme-aware.
 */
export const CATEGORY_DOT: Record<ToolCategory, string> = {
  search: "bg-sky-500 dark:bg-sky-400",
  compliance: "bg-emerald-500 dark:bg-emerald-400",
  validity: "bg-amber-500 dark:bg-amber-400",
  document: "bg-violet-500 dark:bg-violet-400",
  drafting: "bg-rose-500 dark:bg-rose-400",
  matter: "bg-slate-500 dark:bg-slate-400",
  workspace: "bg-slate-500 dark:bg-slate-400",
};
