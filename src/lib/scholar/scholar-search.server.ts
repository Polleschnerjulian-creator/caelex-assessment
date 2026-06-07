import "server-only";
import { executeKorpusTool } from "@/lib/atlas/korpus-tools.server";
import { getLegalSourceById } from "@/data/legal-sources";

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

/**
 * Scholar-scoped source search. Reuses the Atlas korpus engine via its public
 * tool entry-point (executeKorpusTool) — no Atlas files are modified. Returns a
 * camelCase DTO for the Scholar API; the engine's stringified JSON is parsed here.
 */
export async function scholarSearchSources(
  input: ScholarSearchInput,
): Promise<ScholarSearchResult> {
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
