import { NextResponse } from "next/server";
import { getScholarAuth } from "@/lib/scholar/scholar-auth";
import { getScholarSourceDetail } from "@/lib/scholar/source-detail.server";
import {
  checkRateLimit,
  createRateLimitResponse,
  getIdentifier,
} from "@/lib/ratelimit";
import { logAuditEvent, getRequestContext } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getScholarAuth();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rl = await checkRateLimit("scholar", getIdentifier(req, auth.userId));
  if (!rl.success) return createRateLimitResponse(rl);

  const { id } = await params;
  const detail = getScholarSourceDetail(id);
  if (!detail)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  await logAuditEvent({
    userId: auth.userId,
    organizationId: auth.organizationId,
    action: "scholar_view_source",
    entityType: "scholar_source",
    entityId: id,
    ...getRequestContext(req),
  });

  return NextResponse.json(detail, {
    headers: { "Cache-Control": "private, max-age=60" },
  });
}
