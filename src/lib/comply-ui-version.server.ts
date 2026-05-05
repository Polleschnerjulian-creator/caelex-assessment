import "server-only";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/super-admin";

/**
 * Comply UI Version Resolver
 *
 * Determines whether the current request to /dashboard/* should render
 * the V1 (legacy) or V2 (redesign) shell. ATLAS, PHAROS, and ASSURE
 * routes never call this — they ignore the flag entirely.
 *
 * Resolution order (first match wins):
 *   1. URL search param `?ui=v1` or `?ui=v2`  — quick test, ephemeral
 *   2. Cookie `caelex-comply-ui`               — set by Settings toggle
 *   3. User.complyUiVersion                    — per-user override
 *   4. Organization.complyUiVersion            — org-wide default
 *   5. Super-admin shortcut                    — defaults to "v2"
 *      (so Julian/Niklas see what's being built without setting flags)
 *   6. Fallback                                — "v1"
 *
 * Once Phase 3 stabilizes, the default-fallback flips from "v1" to "v2"
 * (one-line change in this file). All existing user/org overrides keep
 * working — only fresh users + orgs without a setting see the new
 * default. Cleanup of legacy code happens in a separate PR after that.
 *
 * See docs/CAELEX-COMPLY-CONCEPT.md § 3 Rollback-Strategie.
 */

export type ComplyUiVersion = "v1" | "v2";

export const COMPLY_UI_COOKIE_NAME = "caelex-comply-ui";

const VALID_VERSIONS: ReadonlySet<string> = new Set(["v1", "v2"]);

function normalize(value: string | null | undefined): ComplyUiVersion | null {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase();
  if (!VALID_VERSIONS.has(trimmed)) return null;
  return trimmed as ComplyUiVersion;
}

interface ResolveOptions {
  /**
   * The `?ui=` search param if present. Pass through from the page's
   * `searchParams` prop so the resolver stays pure server-only.
   */
  searchParam?: string | null;
}

export async function resolveComplyUiVersion(
  opts: ResolveOptions = {},
): Promise<ComplyUiVersion> {
  // 1. URL search param override.
  const fromUrl = normalize(opts.searchParam);
  if (fromUrl) return fromUrl;

  // 2. Cookie set by the Settings toggle.
  const cookieStore = await cookies();
  const fromCookie = normalize(cookieStore.get(COMPLY_UI_COOKIE_NAME)?.value);
  if (fromCookie) return fromCookie;

  // 3 + 4 + 5: Auth-aware lookup.
  const session = await auth();
  if (!session?.user?.id) return "v1";

  const superAdmin = isSuperAdmin(session.user.email);

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      complyUiVersion: true,
      organizationMemberships: {
        take: 1,
        orderBy: { joinedAt: "asc" },
        select: {
          organization: { select: { complyUiVersion: true } },
        },
      },
    },
  });

  // User override wins over org-default.
  const fromUser = normalize(user?.complyUiVersion);
  if (fromUser) return fromUser;

  // Super-admins default to v2 even without an explicit override —
  // platform owners see what's being built without flag-juggling.
  if (superAdmin) return "v2";

  const fromOrg = normalize(
    user?.organizationMemberships[0]?.organization?.complyUiVersion,
  );
  if (fromOrg) return fromOrg;

  // 2026-05-05 reset: V1 is the default again while we redesign the
  // workflow story. V2 stays fully reachable via Settings → UI, the
  // Cmd-K palette, and the bookmarkable `/ui/v2` route — only the
  // implicit default for unset users + orgs flips back to V1.
  // Super-admins still see V2 above (line 90).
  return "v1";
}
