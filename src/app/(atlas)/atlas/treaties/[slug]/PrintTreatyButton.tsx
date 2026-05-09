"use client";

/**
 * Atlas Lawyer-UX Audit F-TREATY-1 Quick-Fix:
 * Print-button on treaty-detail pages so Marie can produce a clean
 * memo-attachment of the treaty without copy-pasting into Word. Uses
 * the existing global print-CSS framework (globals.css §@media print)
 * which already hides .fixed Atlas-shell elements and applies serif-
 * less typography + A4 page margins + Caelex header/footer.
 *
 * Full PDF export (server-side puppeteer/jsPDF rendering with custom
 * formatting + signed-URL hosting) is deferred to F-TREATY-1 Stage-2.
 * Browser-native window.print() covers the 80%-case (export to PDF
 * via "Save as PDF" in the system print dialog) at zero engineering
 * cost.
 */

import { Printer } from "lucide-react";

export function PrintTreatyButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      title="Treaty drucken oder als PDF speichern"
      aria-label="Treaty drucken oder als PDF speichern"
      className="inline-flex items-center gap-1.5 rounded-md border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] px-2.5 py-1.5 text-[11.5px] font-medium text-[var(--atlas-text-secondary)] transition hover:border-[var(--atlas-border-strong)] hover:text-[var(--atlas-text-primary)] print:hidden"
    >
      <Printer className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
      Drucken / PDF
    </button>
  );
}
