import { redirect } from "next/navigation";

/**
 * /dashboard route entry — universal Today inbox.
 *
 * Sprint 1 of the Comply workflow redesign (see
 * docs/COMPLY-WORKFLOW-PLAN.md): both V1 and V2 users land on
 * /dashboard/today. The legacy V1 chart-heavy dashboard is reachable
 * via /dashboard/legacy for users who want it back.
 *
 * Previously V2 redirected to /dashboard/posture and V1 rendered the
 * chart dashboard inline. The new story: "What needs you today?" is
 * the only first-impression question — Posture and Missions are
 * one click away in the nav.
 *
 * V1 users still see V1 chrome around the Today page (resolver-driven
 * layout), V2 users see V2 chrome. The /today route works under both.
 */
export default async function DashboardPage() {
  redirect("/dashboard/today");
}
