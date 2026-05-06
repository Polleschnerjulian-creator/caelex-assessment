import { redirect } from "next/navigation";
import Link from "next/link";
import { Inbox, ArrowRight } from "lucide-react";
import { auth } from "@/lib/auth";
import { resolveComplyUiVersion } from "@/lib/comply-ui-version.server";
import { getTriageItemsForUser } from "@/lib/comply-v2/triage-service.server";
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

  const sansFont =
    'var(--font-inter), -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif';
  const displayFont =
    'var(--font-inter), -apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif';

  return (
    <div
      className="mx-auto max-w-screen-2xl px-8 py-8"
      style={{ fontFamily: sansFont, letterSpacing: "-0.005em" }}
    >
      <header
        className="mb-7 flex items-end justify-between gap-6 pb-5"
        style={{ borderBottom: "0.5px solid rgba(255, 255, 255, 0.08)" }}
      >
        <div className="min-w-0">
          <h1
            className="text-[28px] font-semibold text-white"
            style={{
              fontFamily: displayFont,
              letterSpacing: "-0.022em",
              lineHeight: 1.15,
            }}
          >
            Triage
          </h1>
          <p
            className="mt-1.5 max-w-2xl text-[14px]"
            style={{ color: "rgba(255, 255, 255, 0.55)" }}
          >
            {items.length === 0
              ? "No new signals. The keyboard is fastest — J/K to navigate, A to acknowledge, D to dismiss."
              : `${items.length} signal${items.length === 1 ? "" : "s"} from notifications, regulator publications, and satellite alerts. Use J/K to navigate, A to acknowledge, D to dismiss.`}
          </p>
        </div>
        <Link
          href="/dashboard/today"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors"
          style={{
            background: "rgba(255, 255, 255, 0.06)",
            color: "rgba(255, 255, 255, 0.85)",
          }}
        >
          <Inbox className="h-3.5 w-3.5" strokeWidth={2} />
          Open Today
          <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.2} />
        </Link>
      </header>

      <TriageList items={serialized} />
    </div>
  );
}
