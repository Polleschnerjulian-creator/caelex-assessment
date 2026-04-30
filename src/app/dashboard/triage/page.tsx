import { redirect } from "next/navigation";
import Link from "next/link";
import { Inbox, ListChecks, ArrowRight } from "lucide-react";
import { auth } from "@/lib/auth";
import { resolveComplyUiVersion } from "@/lib/comply-ui-version.server";
import { getTriageItemsForUser } from "@/lib/comply-v2/triage-service.server";
import { Button } from "@/components/ui/v2/button";
import { TriageList } from "@/components/dashboard/v2/TriageList";

export const metadata = {
  title: "Triage — Caelex Comply",
  description:
    "One inbox for compliance signals. Notifications, regulatory updates, and satellite alerts in a single keyboard-driven queue.",
};

// Refresh after acknowledge / dismiss server-action revalidates.
export const dynamic = "force-dynamic";

/**
 * Triage page — Linear-pattern inbox for incoming compliance signals.
 *
 * Three sources unified into one TriageItem queue (Notification +
 * RegulatoryUpdate + SatelliteAlert). User keyboard-navigates with
 * J/K, dispositions with A/D. The disposition routes back to the
 * source-specific "resolved" flag so legacy /dashboard/notifications
 * etc. stay in sync.
 *
 * V2-only — V1 users redirect to legacy /dashboard.
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
    <div className="mx-auto max-w-screen-xl px-6 py-8">
      <header className="mb-8 flex items-end justify-between gap-6">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            <ListChecks className="h-3.5 w-3.5" />
            Triage
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            One inbox for everything incoming
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            {items.length === 0 ? (
              "No new signals."
            ) : (
              <>
                {items.length} signal{items.length === 1 ? "" : "s"} from
                notifications, regulator publications, and satellite alerts. Use
                the keyboard — it&apos;s faster.
              </>
            )}
          </p>
        </div>
        <Button variant="outline" asChild size="sm">
          <Link href="/dashboard/today">
            <Inbox />
            Open Today
            <ArrowRight />
          </Link>
        </Button>
      </header>

      <TriageList items={serialized} />
    </div>
  );
}
