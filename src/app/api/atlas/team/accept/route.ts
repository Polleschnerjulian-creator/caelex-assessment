import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { getSafeErrorMessage } from "@/lib/validations";
import { logger } from "@/lib/logger";
import { acceptInvitation } from "@/lib/services/organization-service";

const Body = z.object({ token: z.string().min(1).max(500) });

// POST /api/atlas/team/accept — accept an invitation
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // M4: rate-limit invitation acceptance — it's a token-keyed endpoint,
  // so without a cap it's a token-guessing surface.
  const rl = await checkRateLimit(
    "api",
    getIdentifier(request, session.user.id),
  );
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  // M4: guard JSON parse (empty/malformed body threw → unhandled 500).
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  try {
    const member = await acceptInvitation(parsed.data.token, session.user.id);
    return NextResponse.json({
      success: true,
      organizationId: member.organizationId,
    });
  } catch (err) {
    logger.error("[atlas/team/accept] failed", {
      userId: session.user.id,
      error: err instanceof Error ? err.message : String(err),
    });
    // M4: don't echo the raw service/Prisma error (state oracle + internal
    // detail leak). getSafeErrorMessage stays generic in production.
    return NextResponse.json(
      { error: getSafeErrorMessage(err, "Failed to accept invitation") },
      { status: 400 },
    );
  }
}
