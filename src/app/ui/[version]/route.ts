import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  COMPLY_UI_COOKIE_NAME,
  type ComplyUiVersion,
} from "@/lib/comply-ui-version.server";

export const runtime = "nodejs";

/**
 * GET /ui/v1 → switch to V1 + redirect to /dashboard
 * GET /ui/v2 → switch to V2 + redirect to /dashboard
 *
 * Sprint 10G — One-click UI-version toggle. Equivalent to clicking
 * the cards on /dashboard/settings/ui but bookmarkable: an operator
 * stuck in V1 can paste `https://app.caelex.com/ui/v2` into the
 * address bar to flip without hunting for the Settings page.
 *
 * # Resolution order, refresher
 *
 * `resolveComplyUiVersion()` checks URL param → cookie → User.field
 * → Org.field → super-admin → fallback. This route writes the User
 * field (durable across devices) AND the cookie (instant resolution
 * on the next request without DB round-trip), the same combo as
 * /dashboard/settings/ui's setComplyUiVersion server action.
 *
 * # Auth
 *
 * Anyone signed in can toggle their own UI. Anonymous request →
 * redirect to /login with `next=/ui/<version>` so a bookmark
 * survives a logged-out session: log in, the redirect fires the
 * toggle, dashboard loads in the requested chrome.
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
  _request: Request,
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
    redirect(`/login?next=/ui/${target}`);
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { complyUiVersion: target },
    });

    const cookieStore = await cookies();
    cookieStore.set(COMPLY_UI_COOKIE_NAME, target, {
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
  } catch (err) {
    // Catch + rethrow so the redirect doesn't fire on a stale cookie
    // when the DB write actually failed. Sentry / LogSnag will pick
    // up the structured logger output.
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

  // Redirect into the dashboard. V2 lands on /dashboard/posture
  // (the V2-native home); V1 lands on /dashboard which renders the
  // legacy client. The dashboard layout's resolver picks up the
  // cookie we just set so the next render is already on the new
  // chrome — no manual reload needed.
  redirect(target === "v2" ? "/dashboard/posture" : "/dashboard");
}
