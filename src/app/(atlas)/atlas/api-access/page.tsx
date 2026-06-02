import { Key } from "lucide-react";

/**
 * /atlas/api-access — honest coming-soon placeholder.
 *
 * The previous implementation rendered a fake hardcoded API key
 * (`atlas_pk_••••••••••••••••••••`) with non-functional eye/copy/generate
 * buttons and `—` stat placeholders, implying API-key management exists
 * when it does not. This replacement is truthful: it clearly communicates
 * the feature is not yet available and does not simulate functionality.
 *
 * Route kept alive (no 404) so sidebar links and bookmarks continue to work.
 */
export default function ApiAccessPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-screen bg-[var(--atlas-bg-page)] p-8 text-center">
      <div
        className="inline-flex items-center justify-center w-12 h-12 rounded-xl
                   bg-[var(--atlas-bg-surface)] border border-[var(--atlas-border)]
                   mb-5"
      >
        <Key
          className="h-5 w-5 text-[var(--atlas-text-muted)]"
          strokeWidth={1.5}
        />
      </div>

      <h1 className="text-[18px] font-semibold tracking-tight text-[var(--atlas-text-primary)] mb-2">
        API-Zugang
      </h1>

      <p className="text-[12.5px] text-[var(--atlas-text-muted)] max-w-sm leading-relaxed mb-1">
        In Kürze verfügbar.
      </p>
      <p className="text-[11.5px] text-[var(--atlas-text-faint)] max-w-sm leading-relaxed">
        Die Verwaltung von API-Schlüsseln für den programmatischen Zugriff auf
        Atlas wird in einer kommenden Version bereitgestellt.
      </p>
    </div>
  );
}
