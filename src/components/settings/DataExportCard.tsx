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
    <div className="space-y-6">
      {/* Info */}
      <div className="p-4 rounded-xl bg-white/40 dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06]">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-[13px] font-medium text-slate-800 dark:text-white mb-1">
              GDPR Data Portability (Article 20)
            </p>
            <p className="text-[12px] text-slate-500 dark:text-slate-400 leading-relaxed">
              You have the right to receive your personal data in a structured,
              commonly used, and machine-readable format. This export includes
              your profile, assessments, compliance scores, documents metadata,
              organization membership, and settings.
            </p>
          </div>
        </div>
      </div>

      {/* Export options */}
      <div>
        <h3 className="text-sm font-semibold text-slate-800 dark:text-white mb-3">
          Export Format
        </h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-4 rounded-xl bg-white/50 dark:bg-white/[0.04] border border-emerald-400/30 dark:border-emerald-500/20 shadow-sm">
            <div className="flex items-center gap-3">
              <FileJson className="w-5 h-5 text-emerald-500" />
              <div>
                <p className="text-[13px] font-medium text-slate-800 dark:text-white">
                  JSON Export
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  Complete data in machine-readable format
                </p>
              </div>
            </div>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 dark:bg-white hover:bg-slate-700 dark:hover:bg-white/90 text-white dark:text-slate-900 text-[13px] font-medium transition-colors disabled:opacity-50"
            >
              {exporting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Exporting...
                </>
              ) : done ? (
                <>
                  <CheckCircle2 size={14} />
                  Downloaded
                </>
              ) : (
                <>
                  <Download size={14} />
                  Export Data
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* What's included */}
      <div>
        <h3 className="text-sm font-semibold text-slate-800 dark:text-white mb-3">
          Included Data
        </h3>
        <div className="grid grid-cols-2 gap-2">
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
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/30 dark:bg-white/[0.02] border border-black/[0.03] dark:border-white/[0.04]"
            >
              <div className="w-1 h-1 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-[12px] text-slate-600 dark:text-slate-400">
                {item}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
