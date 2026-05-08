"use client";

/**
 * Sprint UF14 — "As-of" date picker for auditor time-travel.
 *
 * Audit finding P1-4: an external auditor must be able to ask
 * "what was the compliance state as of December 31, 2025?" — the
 * UI only knows "now". This picker is the entry point: it lets
 * the auditor pick a historical date and deep-links to the audit
 * log filtered to events ≤ that date.
 *
 * # Why deep-link to audit-log instead of mutating the current page
 *
 * Truly historical Posture / Tracker / Audit-Center views require:
 *   - Posture: snapshot data exists (V2PostureSnapshot daily-cron) →
 *     would be tractable but UI work is non-trivial
 *   - Tracker: NO historical snapshots of article statuses → would
 *     need per-article history table + a multi-week migration
 *   - Audit Center: aggregates derived from current state → same
 *     blocker as Tracker
 *
 * The audit-log is the single surface where historical filtering
 * works TODAY (it already accepts ?from / ?to query params via the
 * Sprint E2 implementation). Linking auditors there from any audit
 * surface is the highest-value bridge until full historical-view
 * snapshots ship.
 *
 * # Why not just hide the picker until full historical works
 *
 * Even the deep-link is valuable: "show me everything up to Dec 31"
 * IS a useful auditor primitive. And the picker's presence sets
 * expectations — auditors learn that Caelex understands as-of, even
 * if today it's audit-log-only. The next sprint adds Posture
 * historical view.
 *
 * # Component contract
 *
 *   <AsOfPicker />
 *
 * Renders a compact pill that says "Audit context: live · pick date".
 * Clicking opens an inline native date input + "View audit log →"
 * button. Submitting navigates to /dashboard/audit-log?to=YYYY-MM-DD.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { Calendar, ArrowRight, Clock } from "lucide-react";

export function AsOfPicker({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  // Default to yesterday — auditors typically check end-of-period
  // states, not "right now" (which is what the live view already shows).
  const yesterday = React.useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  }, []);
  const [date, setDate] = React.useState<string>(yesterday);
  const wrapperRef = React.useRef<HTMLDivElement>(null);

  // Click-outside dismiss.
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  function handleApply() {
    if (!date) return;
    setOpen(false);
    // Audit-log accepts `to` (upper bound), implementing "as of date X
    // = events up to that date inclusive". From-date is intentionally
    // unset so the auditor sees the full history up to the cutoff.
    router.push(`/dashboard/audit-log?to=${encodeURIComponent(date)}`);
  }

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="inline-flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-[12px] font-medium text-slate-300 transition hover:border-white/[0.12] hover:bg-white/[0.06]"
      >
        <Clock className="h-3 w-3 text-emerald-300" strokeWidth={2} />
        <span>
          Audit context: <span className="font-semibold text-white">live</span>
        </span>
        <span className="text-[10.5px] text-slate-500">· time travel</span>
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Pick audit cutoff date"
          className="absolute right-0 top-10 z-50 w-80 overflow-hidden rounded-xl border border-white/[0.08] bg-[#13131A] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)]"
        >
          <h3 className="mb-1 flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-emerald-300">
            <Calendar className="h-3 w-3" />
            Time travel
          </h3>
          <p className="mb-3 text-[11.5px] leading-relaxed text-slate-400">
            Pick a date — Caelex shows the audit-log filtered to all events on
            or before that day, so you can review what the organization had in
            place at that point.
          </p>

          <label className="mb-3 block">
            <span className="mb-1 block text-[10.5px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              As of date
            </span>
            <input
              type="date"
              value={date}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setDate(e.target.value)}
              className="block w-full rounded-md border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-[12.5px] text-slate-100 focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              style={{ colorScheme: "dark" }}
            />
          </label>

          <div className="mb-4 rounded-md bg-white/[0.02] p-2.5 text-[10.5px] leading-relaxed text-slate-500">
            Note: today only the audit-log supports historical filtering.
            Posture and Tracker views will gain full as-of snapshots in a
            follow-up release.
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md px-2.5 py-1.5 text-[11.5px] font-medium text-slate-400 transition hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={!date}
              className="inline-flex items-center gap-1 rounded-md bg-emerald-500/90 px-3 py-1.5 text-[11.5px] font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:opacity-40"
            >
              View audit log
              <ArrowRight className="h-3 w-3" strokeWidth={2.4} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
