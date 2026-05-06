import SubscriptionGate from "./SubscriptionGate";
import DashboardShell from "./DashboardShell";
import V2Shell from "@/components/dashboard/v2/V2Shell";
import { resolveComplyUiVersion } from "@/lib/comply-ui-version.server";

/**
 * Force every /dashboard/* route to render dynamically (no SSG).
 *
 * This is implicit anyway — V2Shell + DashboardShell call `cookies()`
 * via `getDensity()` and `auth()`, which auto-marks the segment
 * dynamic in Next.js 15. But making it explicit prevents the build
 * from ever wasting time trying to prerender an auth-gated page
 * that would always be a useless empty shell. Saves ~30-60s of
 * build time and avoids the "Generating static pages..." silent
 * hang on the few dashboard routes that don't naturally trip the
 * dynamic-API auto-detection (e.g. layouts that delegate to client
 * components).
 *
 * Public marketing routes (/, /assessment, /blog, /docs, etc.) keep
 * their SSG — only this dashboard segment opts out.
 */
export const dynamic = "force-dynamic";

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
    // V2 = full chrome. V2Shell renders its own sidebar + topbar
    // and does NOT wrap the legacy DashboardShell — v2 users see
    // only V2 surfaces. Legacy DashboardShell stays in the repo
    // for v1 fallback + emergency rollback (see concept doc § 3).
    return (
      <SubscriptionGate>
        <V2Shell>{children}</V2Shell>
      </SubscriptionGate>
    );
  }

  // V1 — legacy chrome, byte-identical to pre-redesign behavior.
  return (
    <SubscriptionGate>
      <DashboardShell>{children}</DashboardShell>
    </SubscriptionGate>
  );
}
