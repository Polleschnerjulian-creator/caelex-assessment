import "server-only";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V3 — Korpus Tools (T0.1.d bundle-split, 2026-05-26).
 *
 * Five tools that surface the Atlas legal-source + case-law catalogue
 * to the chat-engine:
 *   - search_legal_sources (hybrid keyword + semantic over 950 sources)
 *   - get_legal_source_by_id (full source-record drill-down)
 *   - list_jurisdiction_authorities (regulator directory per JD)
 *   - search_cases (hybrid keyword + semantic over 55+ cases)
 *   - get_case_by_id (full case-record drill-down)
 *
 * Extracted from `atlas-tool-executor.ts` as part of T0.1.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import {
  ALL_SOURCES,
  getLegalSourceById,
  getAuthoritiesByJurisdiction,
  type LegalSourceType,
  type ComplianceArea,
} from "@/data/legal-sources";
import {
  ATLAS_CASES,
  getCaseById,
  getCasesApplyingSource,
  type LegalCase,
} from "@/data/legal-cases";
import { semanticSearch } from "./semantic-corpus.server";

/* ── Result type ────────────────────────────────────────────────────── */

export interface KorpusToolResult {
  content: string;
  isError: boolean;
}

/* ── Constants (lifted from executor) ───────────────────────────────── */

const VALID_TYPES: LegalSourceType[] = [
  "international_treaty",
  "federal_law",
  "federal_regulation",
  "technical_standard",
  "eu_regulation",
  "eu_directive",
  "policy_document",
  "draft_legislation",
];

const VALID_AREAS: ComplianceArea[] = [
  "licensing",
  "registration",
  "liability",
  "insurance",
  "cybersecurity",
  "export_control",
  "data_security",
  "frequency_spectrum",
  "environmental",
  "debris_mitigation",
  "space_traffic_management",
  "human_spaceflight",
  "military_dual_use",
];

const SOURCE_HIT_LIMIT = 10;
const CASE_HIT_LIMIT = 10;
const MIN_HIT_SCORE = 0.05;

/* ── Tool definitions (Anthropic-tool format) ───────────────────────── */

export const KORPUS_TOOLS: Anthropic.Tool[] = [
  {
    name: "search_legal_sources",
    description: `Searches the Atlas legal-source catalogue (treaties, statutes, regulations, technical standards, policy documents, draft legislation) by free-text query. Returns up to 10 matches ranked by relevance, each with id, jurisdiction, type, status, title, and one-line scope_description.

Use this when the user asks discovery-style questions like:
  - "Welche EU-Sanktionen gegen Russland gelten für Raumfahrt-Hardware?"
  - "Show me the ITU coordination rules"
  - "What's in the Critical Raw Materials Act?"
  - "Find all sources about debris mitigation in Japan"

After calling, paraphrase the matches and offer to drill into a specific source via get_legal_source_by_id.

Filters: jurisdiction (ISO code or "INT"/"EU"), type (international_treaty | federal_law | federal_regulation | technical_standard | eu_regulation | eu_directive | policy_document | draft_legislation), compliance_area (licensing | registration | liability | insurance | cybersecurity | export_control | data_security | frequency_spectrum | environmental | debris_mitigation | space_traffic_management | human_spaceflight | military_dual_use). Combine filters as needed — narrow searches return better results than broad ones.

Score 0-1 per match (substring + title-position). Min returned score is 0.05.`,
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Free-text query string. 2-200 characters. Tokens, abbreviations, and case-insensitive. E.g. 'NIS2 transposition Germany', 'WRC-23', 'Lloyd's space insurance'.",
        },
        jurisdiction: {
          type: "string",
          description:
            "Optional jurisdiction filter — ISO alpha-2/3 code (DE, FR, UK, US, ...), 'INT' for international treaties, 'EU' for EU instruments. Omit to search all.",
        },
        type: {
          type: "string",
          enum: [
            "international_treaty",
            "federal_law",
            "federal_regulation",
            "technical_standard",
            "eu_regulation",
            "eu_directive",
            "policy_document",
            "draft_legislation",
          ],
          description: "Optional source-type filter. Omit to search all types.",
        },
        compliance_area: {
          type: "string",
          enum: [
            "licensing",
            "registration",
            "liability",
            "insurance",
            "cybersecurity",
            "export_control",
            "data_security",
            "frequency_spectrum",
            "environmental",
            "debris_mitigation",
            "space_traffic_management",
            "human_spaceflight",
            "military_dual_use",
          ],
          description:
            "Optional compliance-area filter. Omit to search all areas.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_legal_source_by_id",
    description: `Retrieves a single Atlas legal-source entry by its canonical id. Returns the full record: title, scope_description, all key_provisions with summaries and complianceImplications, related_sources, amends/amended_by chain, and notes. Use this AFTER search_legal_sources has identified the source the user wants to drill into, OR when the user mentions an ID directly (e.g. "tell me about INT-WASSENAAR" or "Atlas-ID DE-VVG").

Prefer this over vector recall when the user names a specific instrument. Returns isError=true with a 'NOT_FOUND' code if the id does not resolve — then offer search_legal_sources as fallback.`,
    input_schema: {
      type: "object",
      properties: {
        source_id: {
          type: "string",
          description:
            "Canonical Atlas source id (e.g. 'INT-OST-1967', 'DE-SATDSIG-2007', 'EU-NIS2-2022', 'INT-WASSENAAR'). Format: jurisdiction prefix + hyphen + identifier.",
        },
      },
      required: ["source_id"],
    },
  },
  {
    name: "list_jurisdiction_authorities",
    description: `Lists the regulatory authorities for a single jurisdiction — name, abbreviation, mandate, applicable areas, and contact info. Use this when the user asks "welche Behörden sind in Frankreich für Raumfahrt zuständig?" or "who licenses launches in Australia?".

For ISO-2/3 country codes the response covers the national regulatory landscape; for "INT"/"EU" returns the multilateral institutions (UNOOSA, ITU, EUSPA, ENISA, EC, etc.).`,
    input_schema: {
      type: "object",
      properties: {
        jurisdiction: {
          type: "string",
          description:
            "Jurisdiction code (ISO alpha-2/3, 'INT', or 'EU'). E.g. 'DE', 'FR', 'UK', 'US', 'JP', 'IN', 'AU', 'INT', 'EU'.",
        },
      },
      required: ["jurisdiction"],
    },
  },
  {
    name: "search_cases",
    description: `Searches the Atlas case law / enforcement-action knowledge base. Returns leading court decisions, regulator settlements, and Liability-Convention awards that operators must read alongside the statutes — Cosmos-954, Iridium-Cosmos-2009, FCC Swarm/$900K, FCC DISH/$150K, ITT/$100M ITAR, BAE/$79M, ZTE/$1.19B, Loral-Long-March, Viasat-v-FCC, FAA-SpaceX-2024, FCC-Ligado-2020, Vega VV15/VV22 inquiries, BAFA dual-use Bußgelder, etc.

Use this when:
  - User asks about ENFORCEMENT precedents ("welche Strafen gibt es für ITAR-Verstöße?", "what are FCC debris penalties?")
  - User asks about HISTORICAL cases ("hat Cosmos-954 jemals gezahlt?", "warum gibt es keine Article-III-Klagen?")
  - User wants the PRACTICE alongside the STATUTE ("how do regulators actually apply ISO 24113?")
  - User mentions a case name or company in litigation context (Swarm, DISH, Loral, Hughes, BAE, ZTE, Viasat, Ligado, AAIB Cornwall, Vega-failure)

Filter parameters:
  - jurisdiction: ISO-2 / 'INT' / 'EU' to scope by primary forum
  - compliance_area: filter to area (debris_mitigation, export_control, licensing, frequency_spectrum, liability, etc.)
  - applied_source_id: filter to cases that explicitly applied a given legal-source id (e.g. all cases applying INT-LIABILITY-1972)

Returns max 10 hits with title, plaintiff vs. defendant, date_decided, ruling_summary, industry_significance, and applied_sources[]. The case ids returned (e.g. CASE-COSMOS-954-1981) can then be passed to get_case_by_id for full detail, or rendered inline as [CASE-COSMOS-954-1981] which the UI surfaces as a hover-preview pill.

Returns empty array if no matches — say so honestly, do NOT invent cases.`,
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Free-text query — case name, company, regulator, key facts. Optional if a filter is supplied.",
        },
        jurisdiction: {
          type: "string",
          description:
            "Optional. Restrict to cases where this is the primary forum (ISO alpha-2, 'INT', or 'EU').",
        },
        compliance_area: {
          type: "string",
          description:
            "Optional. Restrict to cases tagged with this compliance area (e.g. 'debris_mitigation', 'export_control', 'licensing', 'liability', 'frequency_spectrum').",
        },
        applied_source_id: {
          type: "string",
          description:
            "Optional. Return only cases whose applied_sources[] contains this legal-source id (e.g. 'INT-LIABILITY-1972', 'US-ITAR', 'INT-IADC-MITIGATION-2020').",
        },
      },
    },
  },
  {
    name: "get_case_by_id",
    description: `Retrieves a single Atlas case law entry by its canonical id (always 'CASE-' prefix). Returns the full record: title, parties, date_decided, citation, facts, ruling_summary, legal_holding, remedy (monetary + non-monetary), industry_significance, compliance_areas, applied_sources[], parties_mentioned, notes, source_url.

Use this AFTER search_cases has identified the entry the user wants to drill into, OR when the user mentions a case id directly. Returns isError=true with NOT_FOUND if the id does not resolve — never invent.

Render inline references to other cases as [CASE-...] tokens; the UI translates them to hover-preview pills. Same applies to legal-source references like [US-ITAR] in your prose response.`,
    input_schema: {
      type: "object",
      properties: {
        case_id: {
          type: "string",
          description:
            "Canonical Atlas case id (always starts with 'CASE-'). E.g. 'CASE-COSMOS-954-1981', 'CASE-FCC-SWARM-2018', 'CASE-ITT-ITAR-2007', 'CASE-VEGA-VV15-2019'.",
        },
      },
      required: ["case_id"],
    },
  },
];

const KORPUS_TOOL_NAMES = KORPUS_TOOLS.map((t) => t.name) as string[];

export function isKorpusToolName(name: string): boolean {
  return KORPUS_TOOL_NAMES.includes(name);
}

/* ── Zod schemas ────────────────────────────────────────────────────── */

const SearchSourcesInput = z.object({
  query: z.string().min(2).max(200),
  jurisdiction: z.string().max(5).optional(),
  type: z
    .enum(VALID_TYPES as [LegalSourceType, ...LegalSourceType[]])
    .optional(),
  compliance_area: z
    .enum(VALID_AREAS as [ComplianceArea, ...ComplianceArea[]])
    .optional(),
});

const GetSourceByIdInput = z.object({
  source_id: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[A-Z0-9][A-Za-z0-9-]+$/, {
      message: "source_id must be uppercase-prefixed alphanumeric with hyphens",
    }),
});

const ListAuthInput = z.object({
  jurisdiction: z
    .string()
    .min(2)
    .max(5)
    .regex(/^[A-Z]{2,3}$/, {
      message: "jurisdiction must be 2-3 uppercase letters",
    }),
});

const SearchCasesInput = z.object({
  query: z.string().min(0).max(200).optional(),
  jurisdiction: z
    .string()
    .min(2)
    .max(5)
    .regex(/^[A-Z]{2,3}$/)
    .optional(),
  compliance_area: z.string().max(40).optional(),
  applied_source_id: z.string().max(80).optional(),
});

const GetCaseByIdInput = z.object({
  case_id: z
    .string()
    .min(2)
    .max(100)
    .regex(/^CASE-[A-Z0-9-]+$/, {
      message:
        "case_id must start with 'CASE-' and contain only uppercase alphanumerics + hyphens",
    }),
});

/* ── Tool implementations ──────────────────────────────────────────── */

async function searchLegalSources(input: unknown): Promise<KorpusToolResult> {
  const parsed = SearchSourcesInput.safeParse(input);
  if (!parsed.success) {
    return {
      content: JSON.stringify({
        error: "Invalid tool input",
        code: "INVALID_INPUT",
        issues: parsed.error.issues.map((i) => i.path.join(".")),
      }),
      isError: true,
    };
  }

  const { query, jurisdiction, type, compliance_area } = parsed.data;
  const q = query.trim().toLowerCase();
  const tokens = q.split(/\s+/).filter((t) => t.length >= 2);

  type Hit = {
    id: string;
    jurisdiction: string;
    type: string;
    status: string;
    title: string;
    scope_description: string;
    score: number;
    keyword_score?: number;
    semantic_score?: number;
  };

  const candidates = ALL_SOURCES.filter((s) => {
    if (jurisdiction && s.jurisdiction !== jurisdiction.toUpperCase()) {
      return false;
    }
    if (type && s.type !== type) return false;
    if (compliance_area && !s.compliance_areas.includes(compliance_area)) {
      return false;
    }
    return true;
  });

  const semanticHits = await semanticSearch(query, {
    types: ["source"],
    limit: 60,
  }).catch(() => null);
  const semanticScores = new Map<string, number>();
  if (semanticHits) {
    for (const h of semanticHits) {
      semanticScores.set(h.entityId, h.score);
    }
  }

  const candidateIds = new Set(candidates.map((s) => s.id));
  const scoreMap = new Map<string, Hit>();

  for (const s of candidates) {
    const haystack = (
      s.title_en +
      " " +
      (s.title_local ?? "") +
      " " +
      (s.scope_description ?? "") +
      " " +
      s.key_provisions.map((p) => p.title + " " + p.summary).join(" ")
    ).toLowerCase();
    const titleLc = s.title_en.toLowerCase();

    let kw = 0;
    for (const tok of tokens) {
      const titleIdx = titleLc.indexOf(tok);
      if (titleIdx === 0) kw += 0.5;
      else if (titleIdx > 0) kw += 0.25;
      else if (haystack.includes(tok)) kw += 0.1;
    }
    if (titleLc.includes(q)) kw += 0.3;
    else if (haystack.includes(q)) kw += 0.15;
    kw = Math.min(kw, 1);

    const sem = semanticScores.get(s.id) ?? 0;
    const score = Math.min(kw * 0.6 + sem * 0.4, 1);
    if (score < MIN_HIT_SCORE) continue;

    scoreMap.set(s.id, {
      id: s.id,
      jurisdiction: s.jurisdiction,
      type: s.type,
      status: s.status,
      title: s.title_en,
      scope_description:
        s.scope_description?.slice(0, 220) ?? "(no scope description)",
      score: Math.round(score * 100) / 100,
      keyword_score: Math.round(kw * 100) / 100,
      semantic_score: Math.round(sem * 100) / 100,
    });
  }

  if (semanticHits) {
    for (const h of semanticHits) {
      if (scoreMap.has(h.entityId)) continue;
      if (!candidateIds.has(h.entityId)) continue;
      const s = ALL_SOURCES.find((x) => x.id === h.entityId);
      if (!s) continue;
      const score = h.score * 0.4;
      if (score < MIN_HIT_SCORE) continue;
      scoreMap.set(s.id, {
        id: s.id,
        jurisdiction: s.jurisdiction,
        type: s.type,
        status: s.status,
        title: s.title_en,
        scope_description:
          s.scope_description?.slice(0, 220) ?? "(no scope description)",
        score: Math.round(score * 100) / 100,
        keyword_score: 0,
        semantic_score: Math.round(h.score * 100) / 100,
      });
    }
  }

  const hits = [...scoreMap.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, SOURCE_HIT_LIMIT);

  return {
    content: JSON.stringify({
      query,
      filters: { jurisdiction, type, compliance_area },
      hit_count: hits.length,
      hits,
      semantic_available: semanticHits !== null,
      hint:
        hits.length === 0
          ? "No matches. Try a broader query or remove filters."
          : "Drill into a specific source via get_legal_source_by_id with its `id`.",
    }),
    isError: false,
  };
}

function getLegalSourceByIdTool(input: unknown): KorpusToolResult {
  const parsed = GetSourceByIdInput.safeParse(input);
  if (!parsed.success) {
    return {
      content: JSON.stringify({
        error: "Invalid source_id format",
        code: "INVALID_INPUT",
      }),
      isError: true,
    };
  }
  const source = getLegalSourceById(parsed.data.source_id);
  if (!source) {
    return {
      content: JSON.stringify({
        error: `Source not found: ${parsed.data.source_id}`,
        code: "NOT_FOUND",
        hint: "Use search_legal_sources to discover the correct id.",
      }),
      isError: true,
    };
  }

  /* IP/Copyright safeguard (Compliance-Audit 2026-05): cap each
     `paragraph_text` at 600 chars + ellipsis. Verbatim statutory text
     is gemeinfrei under § 5 UrhG / EU Decision 2011/833/EU / 17 USC
     §105 etc., but quoting unbounded paragraphs would create downstream
     IP exposure. The lawyer can always open the official text via
     `paragraph_url` for the full version. */
  const PARAGRAPH_TEXT_CAP = 600;
  const cappedProvisions = source.key_provisions.map((p) => {
    if (!p.paragraph_text || p.paragraph_text.length <= PARAGRAPH_TEXT_CAP) {
      return p;
    }
    return {
      ...p,
      paragraph_text:
        p.paragraph_text.slice(0, PARAGRAPH_TEXT_CAP).trimEnd() +
        " […] (truncated — see paragraph_url for full text)",
      paragraph_text_truncated: true,
    };
  });

  return {
    content: JSON.stringify({
      id: source.id,
      jurisdiction: source.jurisdiction,
      type: source.type,
      status: source.status,
      title: source.title_en,
      title_local: source.title_local,
      official_reference: source.official_reference,
      source_url: source.source_url,
      issuing_body: source.issuing_body,
      competent_authorities: source.competent_authorities,
      relevance_level: source.relevance_level,
      applicable_to: source.applicable_to,
      compliance_areas: source.compliance_areas,
      scope_description: source.scope_description,
      key_provisions: cappedProvisions,
      related_sources: source.related_sources.slice(0, 12),
      amends: source.amends,
      amended_by: source.amended_by?.slice(0, 8),
      implements: source.implements,
      superseded_by: source.superseded_by,
      applies_to_jurisdictions: source.applies_to_jurisdictions?.slice(0, 32),
      signed_by_jurisdictions: source.signed_by_jurisdictions?.slice(0, 32),
      notes: source.notes?.slice(0, 8),
      last_verified: source.last_verified,
    }),
    isError: false,
  };
}

function listJurisdictionAuthorities(input: unknown): KorpusToolResult {
  const raw = input as { jurisdiction?: unknown };
  const normalized = {
    jurisdiction:
      typeof raw?.jurisdiction === "string"
        ? raw.jurisdiction.toUpperCase()
        : raw?.jurisdiction,
  };
  const parsed = ListAuthInput.safeParse(normalized);
  if (!parsed.success) {
    return {
      content: JSON.stringify({
        error: "Invalid jurisdiction code",
        code: "INVALID_INPUT",
      }),
      isError: true,
    };
  }
  const code = parsed.data.jurisdiction;
  const authorities = getAuthoritiesByJurisdiction(code);
  if (authorities.length === 0) {
    return {
      content: JSON.stringify({
        jurisdiction: code,
        authority_count: 0,
        authorities: [],
        hint: "No authorities catalogued for this jurisdiction code. Try a different code or 'INT'/'EU'.",
      }),
      isError: false,
    };
  }
  return {
    content: JSON.stringify({
      jurisdiction: code,
      authority_count: authorities.length,
      authorities: authorities.map((a) => ({
        id: a.id,
        name: a.name_en,
        name_local: a.name_local,
        abbreviation: a.abbreviation,
        parent_ministry: a.parent_ministry,
        website: a.website,
        space_mandate: a.space_mandate,
        applicable_areas: a.applicable_areas,
      })),
    }),
    isError: false,
  };
}

async function searchCasesTool(input: unknown): Promise<KorpusToolResult> {
  const raw = input as {
    query?: unknown;
    jurisdiction?: unknown;
    compliance_area?: unknown;
    applied_source_id?: unknown;
  };
  const normalised = {
    query: typeof raw?.query === "string" ? raw.query : undefined,
    jurisdiction:
      typeof raw?.jurisdiction === "string"
        ? raw.jurisdiction.toUpperCase()
        : undefined,
    compliance_area:
      typeof raw?.compliance_area === "string"
        ? raw.compliance_area
        : undefined,
    applied_source_id:
      typeof raw?.applied_source_id === "string"
        ? raw.applied_source_id
        : undefined,
  };
  const parsed = SearchCasesInput.safeParse(normalised);
  if (!parsed.success) {
    return {
      content: JSON.stringify({
        error: "Invalid tool input",
        code: "INVALID_INPUT",
        issues: parsed.error.issues.map((i) => i.path.join(".")),
      }),
      isError: true,
    };
  }

  const { query, jurisdiction, compliance_area, applied_source_id } =
    parsed.data;
  const q = (query ?? "").trim().toLowerCase();
  const tokens = q.split(/\s+/).filter((t) => t.length >= 2);

  let candidates: LegalCase[] = ATLAS_CASES;
  if (jurisdiction) {
    candidates = candidates.filter((c) => c.jurisdiction === jurisdiction);
  }
  if (compliance_area) {
    candidates = candidates.filter((c) =>
      c.compliance_areas.includes(
        compliance_area as LegalCase["compliance_areas"][number],
      ),
    );
  }
  if (applied_source_id) {
    candidates = candidates.filter((c) =>
      c.applied_sources.includes(applied_source_id),
    );
  }

  if (!q) {
    const ordered = [...candidates]
      .sort((a, b) => b.date_decided.localeCompare(a.date_decided))
      .slice(0, CASE_HIT_LIMIT);
    return {
      content: JSON.stringify({
        filters: { jurisdiction, compliance_area, applied_source_id },
        hit_count: ordered.length,
        hits: ordered.map((c) => ({
          id: c.id,
          jurisdiction: c.jurisdiction,
          forum: c.forum,
          title: c.title,
          plaintiff: c.plaintiff,
          defendant: c.defendant,
          date_decided: c.date_decided,
          ruling_summary: c.ruling_summary.slice(0, 220),
          industry_significance: c.industry_significance.slice(0, 200),
          applied_sources: c.applied_sources,
        })),
        hint:
          ordered.length === 0
            ? "No cases match these filters. Be honest with the user — do NOT invent."
            : "Drill into a specific case via get_case_by_id with its `id`. Reference any case inline as [CASE-...] for hover-preview pills.",
      }),
      isError: false,
    };
  }

  /* AUDIT-FIX H03 (2026-05-17): skip semantic pass entirely when no
     query — `semanticSearch(query!)` previously crashed when called
     with only filter args. */
  const semanticHits =
    query && query.trim().length > 0
      ? await semanticSearch(query, {
          types: ["case"],
          limit: 40,
        }).catch(() => null)
      : null;
  const semanticScores = new Map<string, number>();
  if (semanticHits) {
    for (const h of semanticHits) semanticScores.set(h.entityId, h.score);
  }

  type Hit = LegalCase & { score: number };
  const scoreMap = new Map<string, Hit>();
  const candidateIds = new Set(candidates.map((c) => c.id));

  for (const c of candidates) {
    const haystack = [
      c.title,
      c.plaintiff,
      c.defendant,
      c.facts,
      c.ruling_summary,
      c.legal_holding,
      c.industry_significance,
      ...(c.parties_mentioned ?? []),
      ...(c.notes ?? []),
    ]
      .join(" ")
      .toLowerCase();
    const titleLc = c.title.toLowerCase();

    let kw = 0;
    for (const tok of tokens) {
      const titleIdx = titleLc.indexOf(tok);
      if (titleIdx === 0) kw += 0.5;
      else if (titleIdx > 0) kw += 0.25;
      else if (haystack.includes(tok)) kw += 0.1;
    }
    if (titleLc.includes(q)) kw += 0.3;
    else if (haystack.includes(q)) kw += 0.15;
    kw = Math.min(kw, 1);

    const sem = semanticScores.get(c.id) ?? 0;
    const score = Math.min(kw * 0.6 + sem * 0.4, 1);
    if (score < MIN_HIT_SCORE) continue;

    scoreMap.set(c.id, { ...c, score });
  }

  if (semanticHits) {
    for (const h of semanticHits) {
      if (scoreMap.has(h.entityId)) continue;
      if (!candidateIds.has(h.entityId)) continue;
      const c = ATLAS_CASES.find((x) => x.id === h.entityId);
      if (!c) continue;
      const score = h.score * 0.4;
      if (score < MIN_HIT_SCORE) continue;
      scoreMap.set(c.id, { ...c, score });
    }
  }

  const hits = [...scoreMap.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, CASE_HIT_LIMIT);

  return {
    content: JSON.stringify({
      query,
      filters: { jurisdiction, compliance_area, applied_source_id },
      hit_count: hits.length,
      hits: hits.map((c) => ({
        id: c.id,
        jurisdiction: c.jurisdiction,
        forum: c.forum,
        title: c.title,
        plaintiff: c.plaintiff,
        defendant: c.defendant,
        date_decided: c.date_decided,
        ruling_summary: c.ruling_summary.slice(0, 220),
        industry_significance: c.industry_significance.slice(0, 200),
        applied_sources: c.applied_sources,
        score: Math.round(c.score * 100) / 100,
      })),
      hint:
        hits.length === 0
          ? "No matches. Try a broader query or remove filters. Do NOT invent cases."
          : "Drill into a specific case via get_case_by_id. Reference inline as [CASE-...] for hover-preview pills.",
    }),
    isError: false,
  };
}

function getCaseByIdTool(input: unknown): KorpusToolResult {
  const parsed = GetCaseByIdInput.safeParse(input);
  if (!parsed.success) {
    return {
      content: JSON.stringify({
        error: "Invalid case_id format",
        code: "INVALID_INPUT",
        hint: "case_id must look like 'CASE-COSMOS-954-1981' or 'CASE-FCC-SWARM-2018'.",
      }),
      isError: true,
    };
  }
  const c = getCaseById(parsed.data.case_id);
  if (!c) {
    return {
      content: JSON.stringify({
        error: `Case not found: ${parsed.data.case_id}`,
        code: "NOT_FOUND",
        hint: "Use search_cases to discover the correct id. Do NOT invent.",
      }),
      isError: true,
    };
  }

  const peerCases =
    c.applied_sources.length > 0
      ? getCasesApplyingSource(c.applied_sources[0])
          .filter((p) => p.id !== c.id)
          .slice(0, 5)
          .map((p) => ({ id: p.id, title: p.title }))
      : [];

  return {
    content: JSON.stringify({
      id: c.id,
      jurisdiction: c.jurisdiction,
      forum: c.forum,
      forum_name: c.forum_name,
      title: c.title,
      plaintiff: c.plaintiff,
      defendant: c.defendant,
      date_decided: c.date_decided,
      date_filed: c.date_filed,
      citation: c.citation,
      case_number: c.case_number,
      status: c.status,
      facts: c.facts,
      ruling_summary: c.ruling_summary,
      legal_holding: c.legal_holding,
      remedy: c.remedy,
      industry_significance: c.industry_significance,
      compliance_areas: c.compliance_areas,
      precedential_weight: c.precedential_weight,
      applied_sources: c.applied_sources,
      parties_mentioned: c.parties_mentioned ?? [],
      source_url: c.source_url,
      notes: c.notes ?? [],
      peer_cases_on_same_source: peerCases,
      last_verified: c.last_verified,
    }),
    isError: false,
  };
}

/** Bundle entry-point. */
export async function executeKorpusTool(args: {
  name: string;
  input: unknown;
}): Promise<KorpusToolResult> {
  switch (args.name) {
    case "search_legal_sources":
      return searchLegalSources(args.input);
    case "get_legal_source_by_id":
      return getLegalSourceByIdTool(args.input);
    case "list_jurisdiction_authorities":
      return listJurisdictionAuthorities(args.input);
    case "search_cases":
      return searchCasesTool(args.input);
    case "get_case_by_id":
      return getCaseByIdTool(args.input);
    default:
      return {
        content: JSON.stringify({
          error: `Unknown korpus tool: ${args.name}`,
        }),
        isError: true,
      };
  }
}
