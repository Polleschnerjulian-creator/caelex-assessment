import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { resolveTradeOrgId } from "@/lib/trade/resolve-org-id.server";
import { getApplicability } from "@/lib/trade/applicability/applicability-service.server";
import { ApplicabilityView } from "./_components/ApplicabilityView";

export const metadata = {
  title: "Caelex Trade — Geltungsbereich",
};

/**
 * /trade/applicability — the export-control applicability "front door".
 *
 * Server component: auth → resolve org → read the persisted applicability
 * result. If the org has already completed the triage, render the re-viewable
 * result (with a "neu einschätzen" restart); otherwise render the wizard.
 *
 * The wizard persists only on the final acknowledged submit (R6) via the
 * server action, then seeds the rest of the app — see
 * applicability-service.server.ts.
 */
export default async function TradeApplicabilityPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/trade-login?callbackUrl=%2Ftrade%2Fapplicability");
  }

  const orgId = await resolveTradeOrgId(session.user.id, session.user.email);
  const existing =
    orgId === "no-org" || orgId === "super-admin-no-org"
      ? null
      : await getApplicability(orgId);

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <ApplicabilityView initialResult={existing?.result ?? null} />
    </div>
  );
}
