import "server-only";
import { executeKorpusTool } from "@/lib/atlas/korpus-tools.server";

export interface ScholarSearchHit {
  id: string;
  jurisdiction: string;
  type: string;
  status: string;
  title: string;
  scopeDescription: string | null;
  score: number;
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
    hits: payload.hits.map((h) => ({
      id: h.id,
      jurisdiction: h.jurisdiction,
      type: h.type,
      status: h.status,
      title: h.title,
      scopeDescription: h.scope_description ?? null,
      score: h.score,
    })),
  };
}
