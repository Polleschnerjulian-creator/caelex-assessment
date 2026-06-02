import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/super-admin";
import { ensureProfile } from "@/lib/trade/settings/org-profile-service";
import { ensurePreferences } from "@/lib/trade/settings/notification-preferences-service";
import { listApiKeys } from "@/lib/trade/settings/api-keys-service";
import { getEffectiveScreeningConfig } from "@/lib/trade/settings/screening-config-service";
import { SettingsSubNav, type TabKey } from "./_components/SettingsSubNav";
import { OrgProfileTab } from "./_components/OrgProfileTab";
import { ScreeningTab } from "./_components/ScreeningTab";
import { NotificationsTab } from "./_components/NotificationsTab";
import { ApiKeysTab } from "./_components/ApiKeysTab";
import { AuditTab } from "./_components/AuditTab";
import { DensityToggle } from "../_components/DensityToggle";

export const metadata = {
  title: "Settings — Passage",
};

const VALID_TABS = [
  "profile",
  "screening",
  "notifications",
  "api-keys",
  "audit",
  "appearance",
] as const;

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
  const [profile, prefs, apiKeys, screeningConfig] = await Promise.all([
    ensureProfile(orgId),
    ensurePreferences(orgId),
    listApiKeys(orgId),
    getEffectiveScreeningConfig(orgId),
  ]);

  return (
    <div className="px-8 py-10">
      <header className="mb-7">
        <h1 className="text-[28px] font-bold tracking-tight text-trade-text-primary">
          Einstellungen
        </h1>
        <p className="mt-1.5 max-w-2xl text-[13px] text-trade-text-secondary">
          Org-weite Passage-Konfiguration — Stammdaten, Benachrichtigungen,
          API-Zugang und mehr. Sichtbar für OWNER und ADMIN.
        </p>
      </header>

      <div className="flex flex-col gap-8 lg:flex-row">
        <SettingsSubNav active={activeTab} />

        <div className="min-w-0 max-w-3xl flex-1">
          {activeTab === "profile" && <OrgProfileTab profile={profile} />}
          {activeTab === "screening" && (
            <ScreeningTab config={screeningConfig} />
          )}
          {activeTab === "notifications" && (
            <NotificationsTab preferences={prefs} />
          )}
          {activeTab === "api-keys" && <ApiKeysTab apiKeys={apiKeys} />}
          {activeTab === "audit" && <AuditTab preferences={prefs} />}
          {activeTab === "appearance" && (
            <section className="rounded-xl border border-trade-border bg-trade-bg-panel px-6 py-5 shadow-[var(--trade-shadow-card)]">
              <h2 className="mb-1 text-[15px] font-semibold text-trade-text-primary">
                Darstellung
              </h2>
              <p className="mb-4 max-w-2xl text-[12px] text-trade-text-muted">
                Pro-Gerät-Einstellung. Kompaktmodus zeigt ~15&nbsp;% mehr Zeilen
                auf einmal — ideal auf Laptop-Displays.
              </p>
              <DensityToggle />
            </section>
          )}
        </div>
      </div>
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
