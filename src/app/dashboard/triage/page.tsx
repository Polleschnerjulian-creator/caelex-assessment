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
    <div className="mx-auto max-w-screen-2xl px-6 py-6">
      <header className="mb-6 flex items-end justify-between gap-6 border-b border-white/[0.06] pb-4">
        <div>
          <div className="mb-1.5 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-400">
            <ListChecks className="h-3 w-3" />
            TRIAGE · QUEUE
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-100">
            One inbox for everything incoming
          </h1>
          <p className="mt-1 max-w-2xl text-xs text-slate-500">
            {items.length === 0
              ? "No new signals. The keyboard is fastest — J/K to navigate, A to acknowledge, D to dismiss."
              : `${items.length} signal${items.length === 1 ? "" : "s"} from notifications, regulator publications, and satellite alerts. J/K to navigate, A to acknowledge, D to dismiss.`}
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
