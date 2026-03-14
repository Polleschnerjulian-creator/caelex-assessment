"use client";

import { useState } from "react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import {
  Download,
  FileJson,
  Loader2,
  CheckCircle2,
  Shield,
} from "lucide-react";

export function DataExportCard() {
  const { t } = useLanguage();
  const [exporting, setExporting] = useState(false);
  const [done, setDone] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    setDone(false);
    try {
      const res = await fetch("/api/user/export");
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `caelex-data-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDone(true);
      setTimeout(() => setDone(false), 4000);
    } catch {
      // Silently fail
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* GDPR Info Notice */}
      <div>
        <p className="text-[13px] font-medium text-slate-500 dark:text-white/40 uppercase tracking-wider mb-3 px-1">
          Privacy
        </p>
        <div className="rounded-2xl bg-white/60 dark:bg-white/[0.035] border border-black/[0.04] dark:border-white/[0.06] overflow-hidden">
          <div className="flex items-start gap-3 px-5 py-3.5">
            <Shield className="w-[18px] h-[18px] text-slate-400 dark:text-white/30 mt-0.5 shrink-0" />
            <div>
              <p className="text-[15px] font-medium text-slate-800 dark:text-white mb-0.5">
                GDPR Data Portability (Article 20)
              </p>
              <p className="text-[13px] text-slate-500 dark:text-white/40 leading-relaxed">
                You have the right to receive your personal data in a
                structured, commonly used, and machine-readable format. This
                export includes your profile, assessments, compliance scores,
                documents metadata, organization membership, and settings.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Export Format */}
      <div>
        <p className="text-[13px] font-medium text-slate-500 dark:text-white/40 uppercase tracking-wider mb-3 px-1">
          Export Format
        </p>
        <div className="rounded-2xl bg-white/60 dark:bg-white/[0.035] border border-black/[0.04] dark:border-white/[0.06] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5">
            <div className="flex items-center gap-3">
              <FileJson className="w-[18px] h-[18px] text-slate-400 dark:text-white/30 shrink-0" />
              <div>
                <p className="text-[15px] text-slate-900 dark:text-white">
                  JSON Export
                </p>
                <p className="text-[13px] text-slate-500 dark:text-white/40">
                  Complete data in machine-readable format
                </p>
              </div>
            </div>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 dark:bg-white hover:bg-slate-700 dark:hover:bg-white/90 text-white dark:text-slate-900 text-[15px] font-medium transition-colors disabled:opacity-50"
            >
              {exporting ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Exporting...
                </>
              ) : done ? (
                <>
                  <CheckCircle2 size={15} />
                  Downloaded
                </>
              ) : (
                <>
                  <Download size={15} />
                  Export Data
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Included Data */}
      <div>
        <p className="text-[13px] font-medium text-slate-500 dark:text-white/40 uppercase tracking-wider mb-3 px-1">
          Included Data
        </p>
        <div className="rounded-2xl bg-white/60 dark:bg-white/[0.035] border border-black/[0.04] dark:border-white/[0.06] divide-y divide-black/[0.04] dark:divide-white/[0.06] overflow-hidden">
          {[
            "Profile & account info",
            "Assessment results",
            "Compliance scores",
            "Document metadata",
            "Organization membership",
            "Notification preferences",
            "Session history",
            "Audit log entries",
          ].map((item) => (
            <div
              key={item}
              className="flex items-center justify-between px-5 py-3.5"
            >
              <span className="text-[15px] text-slate-900 dark:text-white">
                {item}
              </span>
              <CheckCircle2 className="w-[16px] h-[16px] text-slate-400 dark:text-white/25" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
