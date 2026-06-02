import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/super-admin";
import { hasProductAccess } from "@/lib/products";
import {
  getSidebarBadgeCounts,
  EMPTY_BADGE_COUNTS,
} from "@/lib/trade/sidebar-badge-counts.server";
import { TradeShell } from "./_components/TradeShell";
import { TradeThemeProvider } from "./_components/TradeThemeProvider";

/**
 * Caelex Trade — Route-group layout (Sprint T2).
 *
 * Auth-gated at three layers:
 *   1. Session — unauthenticated visitors go to /login with callback.
 *      Sprint T7 swaps this for a dedicated /trade-login flow.
 *   2. Membership — authenticated users without any org land on
 *      /trade-no-access?reason=no-org so the message is honest about
 *      what's missing.
 *   3. Product access — orgs without an ACTIVE/TRIAL OrganizationProductAccess
 *      row for `TRADE` land on /trade-no-access?reason=no-subscription.
 *      This is the FIRST production consumer of the T1 ledger.
 *
 * Super-admin bypass (mirrors Atlas / Pharos): platform owners enter Trade
 * regardless of org membership or subscription so they can debug customer
 * flows. The fallback uses the first active org we can find for shell
 * context so the sidebar's org-name slot isn't blank.
 *
 * Pre-hydration flash-guard script reads `data-trade-preload` from a
 * localStorage value so the dark-mode token palette is in effect before
 * React mounts TradeShell — same approach as AtlasThemeProvider.
 *
 * MED-2 SAFETY CONTRACT — DO NOT INTERPOLATE VARIABLES INTO THIS STRING.
 *   The script is injected via dangerouslySetInnerHTML; the current
 *   implementation is a static literal and is therefore XSS-safe. Any
 *   future dynamic data MUST be passed via a server-rendered data-*
 *   attribute, never via string concatenation.
 */

const flashGuardScript = `(function(){try{var t=localStorage.getItem('trade-theme');var r=t==='dark'?'dark':'light';document.documentElement.setAttribute('data-trade-preload',r);document.documentElement.setAttribute('data-trade-theme',r);}catch(e){}})();`;

export const metadata = {
  title: "Caelex Passage",
  description:
    "Caelex Passage — Klassifizieren. Lizenzieren. Liefern. Export-Compliance für Operatoren im Weltraumsektor.",
};

export default async function TradeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/trade-login?callbackUrl=%2Ftrade");
  }

  // Super-admin shortcut — platform owners reach Trade regardless of
  // org membership or subscription. Falls back to the first active org
  // we can find so the shell has a non-empty org-name slot. If no orgs
  // exist at all (fresh deploy), render with a synthetic placeholder.
  if (isSuperAdmin(session.user.email)) {
    const anyOrg = await prisma.organization.findFirst({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { createdAt: "asc" },
    });
    const org = anyOrg ?? {
      id: "super-admin-no-org",
      name: "Super-Admin (no org yet)",
    };
    // Super-admin viewing real org → fetch real counts. Stub org → zeros.
    const badgeCounts = anyOrg
      ? await getSidebarBadgeCounts(org.id)
      : EMPTY_BADGE_COUNTS;
    return (
      <TradeThemeProvider>
        <script dangerouslySetInnerHTML={{ __html: flashGuardScript }} />
        <TradeShell org={org} badgeCounts={badgeCounts}>
          {children}
        </TradeShell>
      </TradeThemeProvider>
    );
  }

  // Primary-org resolution — same `findFirst` + `joinedAt asc` pattern
  // Atlas/Pharos use. Multi-org switcher arrives in a later sprint.
  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId: session.user.id,
      organization: { isActive: true },
    },
    select: {
      organization: { select: { id: true, name: true } },
    },
    orderBy: { joinedAt: "asc" },
  });

  if (!membership) {
    redirect("/trade-no-access?reason=no-org");
  }

  // T1 integration point — the OrganizationProductAccess ledger gate.
  // Returns true only for ACTIVE or non-expired TRIAL rows; SUSPENDED /
  // EXPIRED rows fall through to the sales/upgrade page.
  const access = await hasProductAccess(membership.organization.id, "TRADE");
  if (!access) {
    redirect("/trade-no-access?reason=no-subscription");
  }

  const badgeCounts = await getSidebarBadgeCounts(membership.organization.id);

  return (
    <TradeThemeProvider>
      <script dangerouslySetInnerHTML={{ __html: flashGuardScript }} />
      <TradeShell org={membership.organization} badgeCounts={badgeCounts}>
        {children}
      </TradeShell>
    </TradeThemeProvider>
  );
}
