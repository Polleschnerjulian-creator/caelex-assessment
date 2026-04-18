import "server-only";
import { prisma } from "@/lib/prisma";

export interface LinkStatus {
  sourceId: string;
  status: "PENDING" | "UNCHANGED" | "CHANGED" | "ERROR";
  httpStatus: number | null;
  lastChecked: string; // ISO
  lastChanged: string | null;
  errorMessage: string | null;
}

/**
 * Fetch the monitoring status for a set of legal-source IDs.
 * Used by Atlas pages to surface the "verified / broken / changed" badge
 * next to each source. Returns a map keyed by sourceId.
 *
 * Missing IDs (never checked yet) are simply absent from the map.
 */
export async function getLinkStatusMap(
  sourceIds: string[],
): Promise<Record<string, LinkStatus>> {
  if (sourceIds.length === 0) return {};
  try {
    const rows = await prisma.atlasSourceCheck.findMany({
      where: { sourceId: { in: sourceIds } },
      select: {
        sourceId: true,
        status: true,
        httpStatus: true,
        lastChecked: true,
        lastChanged: true,
        errorMessage: true,
      },
    });
    const result: Record<string, LinkStatus> = {};
    for (const r of rows) {
      result[r.sourceId] = {
        sourceId: r.sourceId,
        status: r.status as LinkStatus["status"],
        httpStatus: r.httpStatus,
        lastChecked: r.lastChecked.toISOString(),
        lastChanged: r.lastChanged?.toISOString() ?? null,
        errorMessage: r.errorMessage,
      };
    }
    return result;
  } catch {
    // DB unavailable (e.g. local dev without DATABASE_URL) — degrade silently.
    return {};
  }
}
