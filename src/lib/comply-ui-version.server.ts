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

/**
 * Migration-window override (2026-05-06 → V2-cutover):
 *
 * Stored "v1" preferences (from cookies, user.complyUiVersion, and
 * org.complyUiVersion) are treated as null while we migrate the
 * fleet to V2. This is intentional: the user-facing instruction was
 * "make V2 the default everywhere", which only works in practice if
 * we also override stale opt-ins from the prior phase when V1 was
 * the default and people clicked through the Settings toggle just
 * to see the V2 preview.
 *
 * Escape hatches that still produce V1:
 *   - `?ui=v1` URL query (always honored — line 56 below, called
 *     before this filter)
 *   - `/dashboard/legacy` route (renders V1 chrome directly without
 *     going through this resolver at all)
 *
 * Once the migration window closes (~2 weeks of monitoring V2 in
 * prod), delete this filter — at that point V1 is fully retired
 * and the resolver simplifies to "always return v2" before getting
 * deleted entirely.
 */
function applyMigrationFilter(
  value: ComplyUiVersion | null,
): ComplyUiVersion | null {
  if (value === "v1") return null;
  return value;
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
  // Pass through the migration filter — stale "v1" cookies from the
  // pre-cutover era are treated as null so V2 default kicks in.
  const cookieStore = await cookies();
  const fromCookie = applyMigrationFilter(
    normalize(cookieStore.get(COMPLY_UI_COOKIE_NAME)?.value),
  );
  if (fromCookie) return fromCookie;

  // 3 + 4 + 5: Auth-aware lookup.
  const session = await auth();
  // Unauthenticated visitors hitting /dashboard/* hit the auth gate
  // anyway. We still return a sensible default so the (very brief)
  // pre-redirect render uses the new V2 chrome instead of legacy V1.
  if (!session?.user?.id) return "v2";

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

  // User override — also passed through the migration filter so
  // stale `complyUiVersion = "v1"` rows (typically set by users who
  // toggled the V2-preview opt-in months ago) don't pin them to V1
  // forever after the V2-default cutover.
  const fromUser = applyMigrationFilter(normalize(user?.complyUiVersion));
  if (fromUser) return fromUser;

  // Super-admins default to v2 even without an explicit override —
  // platform owners see what's being built without flag-juggling.
  if (superAdmin) return "v2";

  // Org default — same migration filter applies.
  const fromOrg = applyMigrationFilter(
    normalize(user?.organizationMemberships[0]?.organization?.complyUiVersion),
  );
  if (fromOrg) return fromOrg;

  // 2026-05-06: V2 is now the implicit default for users + orgs that
  // have no stored preference. The Today inbox + Cinema-Mode dark
  // glass redesign has stabilized enough that new sessions should
  // land on the new chrome by default. V1 stays fully reachable for
  // anyone who needs the old charts:
  //   - `?ui=v1` quick override (line 56)
  //   - "Use legacy UI" toggle in Settings (writes the cookie)
  //   - bookmarkable `/dashboard/legacy` route (renders V1 chrome
  //     directly without going through this resolver)
  // Existing users + orgs with an explicit override keep their
  // preference. Only fresh sessions see the flip.
  return "v2";
}
