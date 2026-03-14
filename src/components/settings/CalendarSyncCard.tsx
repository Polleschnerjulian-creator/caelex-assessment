"use client";

import { useState } from "react";
import { Calendar, Download, Copy, Check } from "lucide-react";

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
    <div className="space-y-8">
      {/* Download .ics */}
      <div>
        <p className="text-[13px] font-medium text-slate-500 dark:text-white/40 uppercase tracking-wider mb-3 px-1">
          Download
        </p>
        <div className="rounded-2xl bg-white/60 dark:bg-white/[0.035] border border-black/[0.04] dark:border-white/[0.06] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5">
            <div className="flex items-center gap-3">
              <Calendar
                size={16}
                className="text-slate-500 dark:text-white/40"
              />
              <div>
                <p className="text-[15px] text-slate-800 dark:text-white/90">
                  Calendar File
                </p>
                <p className="text-[13px] text-slate-500 dark:text-white/40">
                  Import .ics into your calendar app
                </p>
              </div>
            </div>
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="px-5 py-2.5 rounded-xl bg-slate-800 dark:bg-white hover:bg-slate-700 dark:hover:bg-white/90 text-white dark:text-slate-900 text-[15px] font-medium transition-colors disabled:opacity-50"
            >
              <span className="flex items-center gap-2">
                <Download size={15} />
                {downloading ? "Generating..." : "Download .ics"}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Subscription URL */}
      <div>
        <p className="text-[13px] font-medium text-slate-500 dark:text-white/40 uppercase tracking-wider mb-3 px-1">
          Subscription URL
        </p>
        <div className="rounded-2xl bg-white/60 dark:bg-white/[0.035] border border-black/[0.04] dark:border-white/[0.06] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5">
            <div className="min-w-0 flex-1 mr-4">
              <p className="text-[15px] text-slate-800 dark:text-white/90 mb-1">
                Live Calendar Feed
              </p>
              <p className="text-[13px] font-mono text-slate-500 dark:text-white/30 truncate">
                {feedUrl}
              </p>
            </div>
            <button
              onClick={handleCopy}
              className="px-5 py-2.5 rounded-xl bg-slate-800 dark:bg-white hover:bg-slate-700 dark:hover:bg-white/90 text-white dark:text-slate-900 text-[15px] font-medium transition-colors shrink-0"
            >
              <span className="flex items-center gap-2">
                {copied ? (
                  <>
                    <Check size={15} />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy size={15} />
                    Copy URL
                  </>
                )}
              </span>
            </button>
          </div>
          <div className="px-5 py-2.5 border-t border-black/[0.04] dark:border-white/[0.06]">
            <p className="text-[13px] text-slate-400 dark:text-white/30">
              Subscribe to this URL for live updates when deadlines change.
            </p>
          </div>
        </div>
      </div>

      {/* Included Events */}
      <div>
        <p className="text-[13px] font-medium text-slate-500 dark:text-white/40 uppercase tracking-wider mb-3 px-1">
          Included Events
        </p>
        <div className="rounded-2xl bg-white/60 dark:bg-white/[0.035] border border-black/[0.04] dark:border-white/[0.06] divide-y divide-black/[0.04] dark:divide-white/[0.06] overflow-hidden">
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
              className="flex items-center justify-between px-5 py-3.5"
            >
              <div>
                <p className="text-[15px] text-slate-800 dark:text-white/90">
                  {item.label}
                </p>
                <p className="text-[13px] text-slate-500 dark:text-white/40">
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
