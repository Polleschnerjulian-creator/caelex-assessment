import V1DashboardClient from "../V1DashboardClient";

/**
 * /dashboard/legacy — escape hatch for the chart-heavy V1 dashboard.
 *
 * Sprint 1 of the Comply workflow redesign moved /dashboard to a
 * Today-inbox redirect (see docs/COMPLY-WORKFLOW-PLAN.md). The
 * previous V1 client dashboard (compliance-score widgets,
 * assessment-import, charts) is preserved here verbatim for users
 * who want the chart-overview view, and as the link target for the
 * "Skip to legacy charts" link in the Today page header.
 *
 * Renders the same V1DashboardClient component; no behaviour change
 * other than the URL.
 */
export const metadata = {
  title: "Legacy dashboard — Caelex Comply",
  description: "The classic chart-overview dashboard.",
};

export default function LegacyDashboardPage() {
  return <V1DashboardClient />;
}
