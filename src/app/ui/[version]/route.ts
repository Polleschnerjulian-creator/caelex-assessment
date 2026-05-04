import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  COMPLY_UI_COOKIE_NAME,
  type ComplyUiVersion,
} from "@/lib/comply-ui-version.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /ui/v1 → switch to V1 + redirect to /dashboard
 * GET /ui/v2 → switch to V2 + redirect to /dashboard/posture
 *
 * Sprint 10G — One-click UI-version toggle. Equivalent to clicking
 * the cards on /dashboard/settings/ui but bookmarkable: an operator
 * stuck in V1 can paste `https://app.caelex.com/ui/v2` into the
 * address bar to flip without hunting for the Settings page.
 *
 * # Why NextResponse, not next/navigation's redirect helper
 *
 * The original implementation set the cookie via the `next/headers`
 * helper and then called the `next/navigation` redirect helper.
 * Empirically that combination dropped the Set-Cookie header on the
 * redirect response in some Next.js 15 versions — the browser kept
 * its old cookie, the next layout render read the stale value, and
 * the user saw V1 chrome wrapping a V2 page (mismatched render).
 *
 * The fix: build a `NextResponse.redirect(...)` and set the cookie
 * DIRECTLY on the response object's cookie jar. The Set-Cookie
 * header is then guaranteed to land in the redirect response. Plus
 * we call `revalidatePath("/dashboard", "layout")` so any cached
 * layout tree is invalidated before the next render reads the new
 * cookie.
 *
 * # Why GET (not POST)
 *
 * GET makes the URL bookmarkable. The cookie is per-user and
 * non-sensitive (V1 vs V2 chrome — both render the same data, just
 * differently); CSRF on toggling your own preference has zero
 * security impact. Trade-off worth taking for the UX win.
 */

const VALID_VERSIONS: ReadonlySet<ComplyUiVersion> = new Set(["v1", "v2"]);

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ version: string }> },
): Promise<Response> {
  const { version } = await context.params;
  const normalized = version?.toLowerCase().trim();
  if (!VALID_VERSIONS.has(normalized as ComplyUiVersion)) {
    return NextResponse.json(
      { error: "Invalid version. Use /ui/v1 or /ui/v2." },
      { status: 400 },
    );
  }
  const target = normalized as ComplyUiVersion;

  const session = await auth();
  if (!session?.user?.id) {
    logger.info("[ui-toggle] anonymous toggle attempt → /login", { target });
    return NextResponse.redirect(
      new URL(`/login?next=/ui/${target}`, request.url),
    );
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { complyUiVersion: target },
    });
  } catch (err) {
    logger.error("[ui-toggle] persist failed", {
      userId: session.user.id,
      target,
      error: (err as Error).message ?? String(err),
    });
    return NextResponse.json(
      {
        error:
          "Could not save UI preference. Try again or use /dashboard/settings/ui.",
      },
      { status: 500 },
    );
  }

  // Invalidate any cached layout/page trees under /dashboard so the
  // next render reads the fresh cookie + DB state. Without this,
  // Next.js's RSC cache could serve a layout rendered against the
  // old `complyUiVersion`, producing the V1-chrome-wrapping-V2-page
  // mismatch the original implementation hit.
  revalidatePath("/dashboard", "layout");

  // Build the redirect response and attach the cookie DIRECTLY to
  // its cookies API. This guarantees the Set-Cookie header is on
  // the redirect response — which the `next/headers` cookie-set +
  // `next/navigation` redirect combo didn't reliably do across
  // Next.js 15.x.
  const destination = target === "v2" ? "/dashboard/posture" : "/dashboard";
  const response = NextResponse.redirect(new URL(destination, request.url));
  response.cookies.set(COMPLY_UI_COOKIE_NAME, target, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });

  logger.info("[ui-toggle] switched", {
    userId: session.user.id,
    target,
  });

  return response;
}
