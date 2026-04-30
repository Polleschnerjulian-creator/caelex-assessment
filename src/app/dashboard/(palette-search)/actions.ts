"use server";

import { auth } from "@/lib/auth";
import {
  searchComplianceItemsForPalette,
  type PaletteSearchResult,
} from "@/lib/comply-v2/compliance-item.server";

/**
 * Cmd-K palette search action — debounced from the client and
 * called per keystroke. Returns lean PaletteSearchResult[] for the
 * client to render directly.
 *
 * Auth-checked: returns empty array for unauthenticated requests
 * (palette renders without ComplianceItem matches but other verbs
 * still work).
 *
 * Located under a route-group `(palette-search)` so the import path
 * is stable independent of the page that mounts the palette. The
 * route group has no page.tsx — it's a server-actions-only module.
 */

export async function searchPalette(
  query: string,
): Promise<PaletteSearchResult[]> {
  const session = await auth();
  if (!session?.user?.id) return [];
  return searchComplianceItemsForPalette(session.user.id, query);
}
