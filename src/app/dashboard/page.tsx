import { redirect } from "next/navigation";
import { resolveComplyUiVersion } from "@/lib/comply-ui-version.server";
import V1DashboardClient from "./V1DashboardClient";

/**
 * /dashboard route entry — V2-aware.
 *
 * V2 users (default since the cutover): redirect to /dashboard/posture
 * — the executive overview is the V2-native home. V1's old dashboard
 * (charts + assessment-import + compliance-score widgets) is kept in
 * V1DashboardClient.tsx for emergency rollback per the concept doc.
 *
 * V1 users (anyone who explicitly opted back via /dashboard/settings/ui):
 * see the legacy client-side dashboard, byte-identical to before.
 *
 * Why a thin server wrapper instead of the prior all-client page:
 * the V2-redirect needs to happen on the server BEFORE any HTML
 * streams down, otherwise V2 users would briefly see the V1
 * dashboard layout before client-side navigation kicks in.
 */
export default async function DashboardPage() {
  const ui = await resolveComplyUiVersion();
  if (ui === "v2") {
    redirect("/dashboard/posture");
  }
  return <V1DashboardClient />;
}
