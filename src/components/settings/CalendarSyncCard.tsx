"use client";

import { useState } from "react";
import {
  Calendar,
  Download,
  Copy,
  Check,
  ExternalLink,
  Clock,
} from "lucide-react";

export function CalendarSyncCard() {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const feedUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/calendar/feed`
      : "";

  const handleCopy = () => {
    navigator.clipboard.writeText(feedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await fetch("/api/calendar/feed");
      if (!res.ok) throw new Error("Failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "caelex-deadlines.ics";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // Silently fail
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Explanation */}
      <div className="p-4 rounded-xl bg-white/40 dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06]">
        <div className="flex items-start gap-3">
          <Calendar className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-[13px] font-medium text-slate-800 dark:text-white mb-1">
              Sync Compliance Deadlines
            </p>
            <p className="text-[12px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Export your compliance deadlines, mission milestones, and
              regulatory due dates to Google Calendar, Apple Calendar, Outlook,
              or any iCal-compatible calendar app.
            </p>
          </div>
        </div>
      </div>

      {/* Download .ics */}
      <div>
        <h3 className="text-sm font-semibold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
          <Download className="w-4 h-4 text-slate-400" />
          Download Calendar File
        </h3>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-800 dark:bg-white hover:bg-slate-700 dark:hover:bg-white/90 text-white dark:text-slate-900 text-[13px] font-medium transition-colors disabled:opacity-50"
        >
          <Calendar size={15} />
          {downloading ? "Generating..." : "Download .ics File"}
        </button>
        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2">
          Import this file into your calendar app to add all deadlines at once.
        </p>
      </div>

      {/* Calendar URL */}
      <div>
        <h3 className="text-sm font-semibold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
          <ExternalLink className="w-4 h-4 text-slate-400" />
          Calendar Subscription URL
        </h3>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-white/60 dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08] rounded-xl px-4 py-2.5 text-[12px] font-mono text-slate-600 dark:text-slate-400 truncate">
            {feedUrl}
          </div>
          <button
            onClick={handleCopy}
            className="p-2.5 rounded-xl bg-white/60 dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] hover:bg-white/80 dark:hover:bg-white/[0.1] transition-colors shrink-0"
          >
            {copied ? (
              <Check size={15} className="text-emerald-500" />
            ) : (
              <Copy size={15} className="text-slate-500 dark:text-slate-400" />
            )}
          </button>
        </div>
        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2">
          Subscribe to this URL in your calendar app for live updates when
          deadlines change.
        </p>
      </div>

      {/* What's included */}
      <div>
        <h3 className="text-sm font-semibold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-400" />
          Included Events
        </h3>
        <div className="space-y-1.5">
          {[
            {
              label: "Compliance Deadlines",
              desc: "Regulatory filing and reporting dates",
            },
            {
              label: "Mission Milestones",
              desc: "Launch windows, orbital maneuvers",
            },
            {
              label: "Document Expirations",
              desc: "License and certificate renewal dates",
            },
            {
              label: "Scheduled Reports",
              desc: "Auto-generated report due dates",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/30 dark:bg-white/[0.02] border border-black/[0.03] dark:border-white/[0.04]"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
              <div>
                <p className="text-[12px] font-medium text-slate-700 dark:text-slate-300">
                  {item.label}
                </p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
