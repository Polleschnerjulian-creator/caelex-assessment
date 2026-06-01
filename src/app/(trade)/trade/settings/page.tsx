import { redirect } from "next/navigation";
import { Building2, Bell, KeyRound, ShieldAlert } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/super-admin";
import { ensureProfile } from "@/lib/trade/settings/org-profile-service";
import { ensurePreferences } from "@/lib/trade/settings/notification-preferences-service";
import { listApiKeys } from "@/lib/trade/settings/api-keys-service";
import { SettingsTabs, type TabKey } from "./_components/SettingsTabs";
import { OrgProfileTab } from "./_components/OrgProfileTab";
import { NotificationsTab } from "./_components/NotificationsTab";
import { ApiKeysTab } from "./_components/ApiKeysTab";
import { AuditTab } from "./_components/AuditTab";
import { DensityToggle } from "../_components/DensityToggle";

export const metadata = {
  title: "Settings — Passage",
};

const VALID_TABS = ["profile", "notifications", "api-keys", "audit"] as const;

/**
 * /trade/settings — Trade-specific organisation settings.
 *
 * Four tabs, server-rendered. Selected tab is encoded in `?tab=` so
 * the URL is shareable / bookmarkable; no client-side router state
 * required. The shell component handles tab navigation via Next's
 * `<Link>` so back/forward and reload behave correctly.
 *
 * Auth model:
 *   - the route-group layout already enforced session + product access
 *   - this page additionally requires OWNER or ADMIN role; lower-role
 *     members get redirected to /trade with a query flag the dashboard
 *     can surface as a soft toast in a future sprint
 *
 * Lazy-creates the TradeOrgProfile and TradeNotificationPreferences
 * rows on first visit so neither tab ever shows a "no data" stub.
 */
export default async function TradeSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/trade-login?callbackUrl=%2Ftrade%2Fsettings");
  }

  const { orgId, role } = await resolveSessionContext(
    session.user.id,
    session.user.email,
  );

  // Settings is OWNER/ADMIN only. Sending lower roles to the welcome
  // dashboard avoids leaking a 403 page; future sprints can show a
  // "you need to be an admin" toast.
  if (!["OWNER", "ADMIN"].includes(role)) {
    redirect("/trade?settings=forbidden");
  }

  const params = await searchParams;
  const requested = params.tab ?? "profile";
  const activeTab: TabKey = (VALID_TABS as readonly string[]).includes(
    requested,
  )
    ? (requested as TabKey)
    : "profile";

  // Fetch the data each tab needs in parallel. The non-active tabs
  // are pre-rendered too so client-side tab switches don't show
  // empty cards while data streams in.
  const [profile, prefs, apiKeys] = await Promise.all([
    ensureProfile(orgId),
    ensurePreferences(orgId),
    listApiKeys(orgId),
  ]);

  return (
    <div className="space-y-5 px-8 py-10">
      <header className="mb-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-trade-accent">
          Passage — Org Admin
        </p>
        <h1 className="mt-2 text-[28px] font-bold tracking-tight text-trade-text-primary">
          Settings
        </h1>
        <p className="mt-1 max-w-2xl text-[13px] text-trade-text-secondary">
          Org-level settings specific to Passage — primary BAFA contact, customs
          identifiers, notification preferences, and API access. Visible to
          OWNER and ADMIN members only.
        </p>
      </header>

      <SettingsTabs
        active={activeTab}
        tabs={[
          { key: "profile", label: "Organization Profile", icon: Building2 },
          { key: "notifications", label: "Notifications", icon: Bell },
          { key: "api-keys", label: "API Keys", icon: KeyRound },
          { key: "audit", label: "Audit Trail", icon: ShieldAlert },
        ]}
      />

      <div className="pt-2">
        {activeTab === "profile" && <OrgProfileTab profile={profile} />}
        {activeTab === "notifications" && (
          <NotificationsTab preferences={prefs} />
        )}
        {activeTab === "api-keys" && <ApiKeysTab apiKeys={apiKeys} />}
        {activeTab === "audit" && <AuditTab preferences={prefs} />}
      </div>

      {/* Appearance — user-level UI preferences (per-device, not per-
          org). Lives outside the tab system because it's a single
          control and doesn't need its own tab. Density choice is
          persisted in localStorage by useTradeDensity. */}
      <section className="mt-6 rounded-xl border border-trade-border-subtle bg-trade-bg-elevated px-6 py-5">
        <h2 className="mb-1 text-[15px] font-semibold text-trade-text-primary">
          Appearance
        </h2>
        <p className="mb-4 max-w-2xl text-[12px] text-trade-text-muted">
          Per-device preference. Compact mode fits ~15&nbsp;% more rows on
          screen — preferred on laptop displays.
        </p>
        <DensityToggle />
      </section>
    </div>
  );
}

async function resolveSessionContext(
  userId: string,
  email: string | null | undefined,
): Promise<{ orgId: string; role: string }> {
  if (isSuperAdmin(email)) {
    const anyOrg = await prisma.organization.findFirst({
      where: { isActive: true },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });
    return { orgId: anyOrg?.id ?? "super-admin-no-org", role: "OWNER" };
  }
  const membership = await prisma.organizationMember.findFirst({
    where: { userId, organization: { isActive: true } },
    select: { organizationId: true, role: true },
    orderBy: { joinedAt: "asc" },
  });
  return {
    orgId: membership?.organizationId ?? "no-org",
    role: membership?.role ?? "VIEWER",
  };
}
