import "server-only";
import { executeKorpusTool } from "@/lib/atlas/korpus-tools.server";
import { getLegalSourceById, ALL_SOURCES } from "@/data/legal-sources";

export interface ScholarSearchHit {
  id: string;
  jurisdiction: string;
  type: string;
  status: string;
  title: string;
  scopeDescription: string | null;
  /**
   * Short excerpt for the result row (≤220 chars). The korpus engine's only
   * per-hit excerpt is the (capped) scope_description, so `snippet` aliases it
   * — surfaced as its own field so the search UI reads as a scannable excerpt
   * rather than reusing the detail-page "scope" semantics. `null` when the
   * source has no scope description.
   */
  snippet: string | null;
  /** Overall relevance 0–1 (keyword + semantic blend) used for ordering. */
  score: number;
  /** Keyword-only sub-score 0–1, when the engine reports it. */
  keywordScore: number | null;
  /** Semantic-only sub-score 0–1, when the engine reports it. */
  semanticScore: number | null;
  relevanceLevel: string | null;
  officialReference: string | null;
}

export interface ScholarSearchResult {
  query: string;
  hitCount: number;
  semanticAvailable: boolean;
  hits: ScholarSearchHit[];
}

export interface ScholarSearchInput {
  query: string;
  jurisdiction?: string;
  type?: string;
  complianceArea?: string;
}

interface RawSourceHit {
  id: string;
  jurisdiction: string;
  type: string;
  status: string;
  title: string;
  scope_description?: string;
  score: number;
  keyword_score?: number;
  semantic_score?: number;
}
interface RawSearchPayload {
  query: string;
  hit_count: number;
  semantic_available: boolean;
  hits: RawSourceHit[];
  error?: string;
}

// Minimum keyword score for a hit to be returned in the keyword-only path.
const MIN_KEYWORD_SCORE = 0.05;

/**
 * Keyword-only source search — NO embedding / NO external (OpenAI) call.
 *
 * Used for users who have NOT opted into AI semantic search (privacy-by-default,
 * the majority): it honours the documented consent model and keeps Scholar at
 * zero external cost. The scoring deliberately mirrors the Atlas korpus engine's
 * keyword branch (title-prefix 0.5 / title-substring 0.25 / body 0.1, +full-query
 * bonuses) with the semantic blend set to zero, so ranking quality matches the
 * hybrid engine's keyword-only behaviour (what the korpus already does when
 * semantic is disabled). Pure in-memory over the static corpus.
 */
function keywordSearchSources(input: ScholarSearchInput): ScholarSearchResult {
  const q = input.query.trim().toLowerCase();
  const tokens = q.split(/\s+/).filter((t) => t.length >= 2);
  const juris = input.jurisdiction?.toUpperCase();

  const hits: ScholarSearchHit[] = [];
  for (const s of ALL_SOURCES) {
    if (juris && s.jurisdiction !== juris) continue;
    if (input.type && s.type !== input.type) continue;
    if (
      input.complianceArea &&
      !s.compliance_areas.includes(
        input.complianceArea as (typeof s.compliance_areas)[number],
      )
    ) {
      continue;
    }

    const titleLc = s.title_en.toLowerCase();
    const haystack = (
      s.title_en +
      " " +
      (s.title_local ?? "") +
      " " +
      (s.scope_description ?? "") +
      " " +
      s.key_provisions.map((p) => p.title + " " + p.summary).join(" ")
    ).toLowerCase();

    let kw = 0;
    for (const tok of tokens) {
      const idx = titleLc.indexOf(tok);
      if (idx === 0) kw += 0.5;
      else if (idx > 0) kw += 0.25;
      else if (haystack.includes(tok)) kw += 0.1;
    }
    if (titleLc.includes(q)) kw += 0.3;
    else if (haystack.includes(q)) kw += 0.15;
    kw = Math.min(kw, 1);
    if (kw < MIN_KEYWORD_SCORE) continue;

    const excerpt = s.scope_description
      ? s.scope_description.slice(0, 220)
      : null;
    const rounded = Math.round(kw * 100) / 100;
    hits.push({
      id: s.id,
      jurisdiction: s.jurisdiction,
      type: s.type,
      status: s.status,
      title: s.title_en,
      scopeDescription: excerpt,
      snippet: excerpt,
      score: rounded,
      keywordScore: rounded,
      semanticScore: null,
      relevanceLevel: s.relevance_level ?? null,
      officialReference: s.official_reference ?? null,
    });
  }

  hits.sort((a, b) => b.score - a.score);
  const top = hits.slice(0, 60);
  return {
    query: input.query,
    hitCount: top.length,
    semanticAvailable: false,
    hits: top,
  };
}

/**
 * Scholar-scoped source search. Reuses the Atlas korpus engine via its public
 * tool entry-point (executeKorpusTool) — no Atlas files are modified. Returns a
 * camelCase DTO for the Scholar API; the engine's stringified JSON is parsed here.
 *
 * `opts.semantic` honours the per-user AI-search consent: when explicitly
 * `false`, the keyword-only path runs (no embedding / no OpenAI call). When
 * omitted or `true`, the full hybrid engine runs. The /api/scholar/search route
 * always passes the user's persisted `semanticSearch` preference, so an
 * opted-out user's query is NEVER sent to the embedding provider.
 */
export async function scholarSearchSources(
  input: ScholarSearchInput,
  opts: { semantic?: boolean } = {},
): Promise<ScholarSearchResult> {
  if (opts.semantic === false) {
    return keywordSearchSources(input);
  }

  const result = await executeKorpusTool({
    name: "search_legal_sources",
    input: {
      query: input.query,
      jurisdiction: input.jurisdiction,
      type: input.type,
      compliance_area: input.complianceArea,
    },
  });
  if (result.isError) {
    let message = "Scholar search failed";
    try {
      message =
        (JSON.parse(result.content) as { error?: string }).error ?? message;
    } catch {
      /* non-JSON error content — keep generic message */
    }
    throw new Error(message);
  }
  const payload = JSON.parse(result.content) as RawSearchPayload;
  return {
    query: payload.query,
    hitCount: payload.hit_count,
    semanticAvailable: payload.semantic_available,
    hits: payload.hits.map((h) => {
      const source = getLegalSourceById(h.id);
      const excerpt = h.scope_description ?? null;
      return {
        id: h.id,
        jurisdiction: h.jurisdiction,
        type: h.type,
        status: h.status,
        title: h.title,
        scopeDescription: excerpt,
        snippet: excerpt,
        score: h.score,
        keywordScore: h.keyword_score ?? null,
        semanticScore: h.semantic_score ?? null,
        relevanceLevel: source?.relevance_level ?? null,
        officialReference: source?.official_reference ?? null,
      };
    }),
  };
}
