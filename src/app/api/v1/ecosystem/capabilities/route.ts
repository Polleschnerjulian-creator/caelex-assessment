/**
 * POST /api/v1/ecosystem/capabilities (Sprint Capabilities)
 *
 * Returns the full CapabilitiesInventory for this Caelex deployment.
 * Unauthenticated — this is discovery data, safe to expose publicly.
 *
 * Used by:
 *   - External MCP clients to introspect available tools
 *   - Partner systems building dashboards over the Caelex API
 *   - The Astra tool `discover_caelex_capabilities` for chat-based
 *     "what can you do?" queries
 *   - Future marketing/platform page (live capability stats)
 */

import { NextResponse } from "next/server";
import { getCapabilitiesInventory } from "@/lib/capabilities/inventory";

export const dynamic = "force-static";
export const revalidate = 300; // 5-minute ISR cache

export async function GET() {
  const inventory = getCapabilitiesInventory();
  return NextResponse.json(inventory, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}

// POST returns the same payload but with no caching (callers may want a
// real-time snapshot e.g. right after a deploy).
export async function POST() {
  const inventory = getCapabilitiesInventory();
  return NextResponse.json(inventory);
}
