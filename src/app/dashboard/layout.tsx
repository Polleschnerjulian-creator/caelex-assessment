import SubscriptionGate from "./SubscriptionGate";
import DashboardShell from "./DashboardShell";
import V2Shell from "@/components/dashboard/v2/V2Shell";
import { resolveComplyUiVersion } from "@/lib/comply-ui-version.server";

/**
 * Dashboard Layout (Server Component)
 *
 * Wraps the client-side DashboardShell with a server-side SubscriptionGate
 * that verifies the user has an active, paid subscription before allowing
 * access to any /dashboard/* page.
 *
 * Users on the FREE plan or without an organization are redirected to
 * /get-started?reason=no-subscription.
 *
 * V1 / V2 Switch
 * --------------
 * `resolveComplyUiVersion()` checks (cookie → user override → org default →
 * super-admin shortcut → fallback "v1") and we render either the legacy
 * `DashboardShell` (V1, byte-identical to before this change) or the new
 * `V2Shell` placeholder (Phase 0 = banner-only, V1 children still render
 * unwrapped underneath while we build).
 *
 * This switch ONLY affects /dashboard/* routes. Atlas, Pharos, and Assure
 * never call this layout and never see the version flag.
 *
 * See docs/CAELEX-COMPLY-CONCEPT.md § 2 Scope and § 3 Rollback-Strategie.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const uiVersion = await resolveComplyUiVersion();

  if (uiVersion === "v2") {
    return (
      <SubscriptionGate>
        <V2Shell>
          <DashboardShell>{children}</DashboardShell>
        </V2Shell>
      </SubscriptionGate>
    );
  }

  return (
    <SubscriptionGate>
      <DashboardShell>{children}</DashboardShell>
    </SubscriptionGate>
  );
}
