"use client";

/**
 * DownloadButton — download a string as a client-side file (blob). Generic; the
 * label is passed in already-localised by the caller, so no i18n dependency.
 */

import { Download } from "lucide-react";

export function DownloadButton({
  content,
  filename,
  label,
  mime = "text/plain;charset=utf-8",
}: {
  content: string;
  filename: string;
  label: string;
  mime?: string;
}) {
  const onClick = () => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-small text-gray-800 hover:border-gray-400 hover:bg-gray-50 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F8FA] scholar-noprint"
    >
      <Download size={14} />
      {label}
    </button>
  );
}
