import { redirect } from "next/navigation";
import { Inbox, ArrowRight } from "lucide-react";
import { auth } from "@/lib/auth";
import { resolveComplyUiVersion } from "@/lib/comply-ui-version.server";
import { getTriageItemsForUser } from "@/lib/comply-v2/triage-service.server";
import { TriageList } from "@/components/dashboard/v2/TriageList";
import {
  PageContainer,
  PageHeader,
  SecondaryActionLink,
  CountBadge,
} from "@/components/dashboard/v2/ui/PageChrome";

export const metadata = {
  title: "Triage — Caelex Comply",
  description:
    "One inbox for compliance signals. Notifications, regulatory updates, and satellite alerts in a single keyboard-driven queue.",
};

export const dynamic = "force-dynamic";

/**
 * Triage page — Linear-pattern inbox for incoming compliance signals.
 *
 * Three sources unified into one TriageItem queue (Notification +
 * RegulatoryUpdate + SatelliteAlert). User keyboard-navigates with
 * J/K, dispositions with A/D. The disposition routes back to the
 * source-specific "resolved" flag so legacy /dashboard/notifications
 * etc. stay in sync.
 */
export default async function TriagePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?next=/dashboard/triage");
  }
  const ui = await resolveComplyUiVersion();
  if (ui === "v1") {
    redirect("/dashboard");
  }

  const items = await getTriageItemsForUser(session.user.id);

  // Date → ISO string for client-side serialization.
  const serialized = items.map((it) => ({
    ...it,
    receivedAt: it.receivedAt.toISOString(),
  }));

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Triage"
        eyebrowIcon={Inbox}
        title="Triage"
        description={
          items.length === 0
            ? "No new signals. The keyboard is fastest — J/K to navigate, A to acknowledge, D to dismiss."
            : `${items.length} signal${items.length === 1 ? "" : "s"} from notifications, regulator publications, and satellite alerts. Use J/K to navigate, A to acknowledge, D to dismiss.`
        }
        actions={
          <>
            {items.length > 0 ? <CountBadge count={items.length} /> : null}
            <SecondaryActionLink href="/dashboard/today" icon={ArrowRight}>
              Open Today
            </SecondaryActionLink>
          </>
        }
      />

      <TriageList items={serialized} />
    </PageContainer>
  );
}
