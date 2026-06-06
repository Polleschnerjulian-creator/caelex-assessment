"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  AlertCircle,
  ExternalLink,
  Loader2,
  FileText,
  ChevronRight,
} from "lucide-react";

/**
 * Caelex Scholar — source detail page (Task 3.4).
 *
 * Client component: fetches GET /api/scholar/sources/:id on mount.
 * No server-module or corpus-data imports — zero bundle bloat.
 */

interface KeyProvision {
  section: string;
  title: string;
  summary: string;
  complianceImplication?: string | null;
  paragraphText?: string | null;
  paragraphTextTruncated: boolean;
  paragraphUrl?: string | null;
}

interface SourceDetail {
  id: string;
  jurisdiction: string;
  type: string;
  status: string;
  title: string;
  titleLocal?: string | null;
  sourceUrl?: string | null;
  issuingBody?: string | null;
  scopeDescription?: string | null;
  keyProvisions: KeyProvision[];
}

type PageState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "notfound" }
  | { kind: "ok"; source: SourceDetail };

export default function ScholarSourceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [state, setState] = useState<PageState>({ kind: "loading" });

  useEffect(() => {
    if (!id) return;

    let cancelled = false;
    setState({ kind: "loading" });

    fetch(`/api/scholar/sources/${encodeURIComponent(id)}`)
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 404) {
          setState({ kind: "notfound" });
          return;
        }
        if (res.status === 403) {
          setState({
            kind: "error",
            message:
              "Zugriff verweigert. Bitte prüfe deine Zugangsberechtigung.",
          });
          return;
        }
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setState({
            kind: "error",
            message:
              (data as { error?: string }).error ??
              "Die Quelle konnte nicht geladen werden.",
          });
          return;
        }
        const source: SourceDetail = await res.json();
        if (!cancelled) setState({ kind: "ok", source });
      })
      .catch(() => {
        if (!cancelled) {
          setState({
            kind: "error",
            message:
              "Netzwerkfehler. Bitte prüfe deine Verbindung und versuche es erneut.",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    // lang="de": WCAG 3.1.1 — content is German; root layout uses lang="en".
    <div lang="de" className="space-y-6">
      {/*
        WCAG 2.4.7: back link needs visible focus indicator.
        WCAG 2.5.8: inline-flex with py-1 gives ≥24px height target.
        The link is also the first focusable element so it receives focus
        naturally when the page loads via keyboard nav.
      */}
      <Link
        href="/scholar"
        className="inline-flex items-center gap-1.5 py-1 text-small text-slate-400 hover:text-emerald-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 rounded"
      >
        <ArrowLeft size={13} aria-hidden="true" />
        Zurück zur Suche
      </Link>

      {/*
        WCAG 4.1.3: loading state announced via role="status".
        Screen readers announce "Lade Rechtsquelle…" when the spinner appears.
      */}
      {state.kind === "loading" && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center justify-center gap-3 py-24 text-slate-400 text-body"
        >
          <Loader2
            size={20}
            className="animate-spin text-emerald-500"
            aria-hidden="true"
          />
          <span>Lade Rechtsquelle…</span>
        </div>
      )}

      {/*
        WCAG 4.1.3 / 1.3.1: error announced via role="alert" (assertive live region).
      */}
      {state.kind === "error" && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3"
        >
          <AlertCircle
            size={16}
            className="text-red-400 mt-0.5 shrink-0"
            aria-hidden="true"
          />
          <p className="text-small text-red-300">{state.message}</p>
        </div>
      )}

      {/* Not found */}
      {state.kind === "notfound" && (
        <div className="text-center py-24 space-y-3">
          <FileText
            size={36}
            className="text-slate-600 mx-auto"
            aria-hidden="true"
          />
          <p className="text-title font-medium text-slate-300">
            Quelle nicht gefunden
          </p>
          <p className="text-small text-slate-500">
            Die gesuchte Rechtsquelle existiert nicht oder wurde entfernt.
          </p>
          <Link
            href="/scholar"
            className="inline-flex items-center gap-1.5 py-1 text-small text-emerald-400 hover:text-emerald-300 transition-colors mt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 rounded"
          >
            <ArrowLeft size={13} aria-hidden="true" />
            Zurück zur Suche
          </Link>
        </div>
      )}

      {/* Loaded */}
      {state.kind === "ok" && <SourceView source={state.source} />}
    </div>
  );
}

function SourceView({ source }: { source: SourceDetail }) {
  return (
    <div className="space-y-8">
      {/* Header card */}
      <div className="rounded-lg border border-navy-700 bg-navy-900 p-6 space-y-4">
        <div className="space-y-1">
          {/*
            WCAG 1.3.1 / 2.4.6: <h1> provides the document title for this
            source. The visually-hidden page-level h1 is in the shell; this
            is the first visible heading on the content area.
          */}
          <h1 className="text-display-sm font-semibold text-white leading-snug">
            {source.title}
          </h1>
          {source.titleLocal && source.titleLocal !== source.title && (
            <p className="text-body text-slate-400 italic">
              {source.titleLocal}
            </p>
          )}
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap gap-2 text-caption">
          <span className="bg-navy-800 border border-navy-700 text-slate-300 rounded-md px-2.5 py-1">
            {source.jurisdiction}
          </span>
          <span className="bg-navy-800 border border-navy-700 text-slate-300 rounded-md px-2.5 py-1">
            {source.type}
          </span>
          <span className="bg-navy-800 border border-navy-700 text-slate-300 rounded-md px-2.5 py-1">
            {source.status}
          </span>
          {source.issuingBody && (
            <span className="bg-navy-800 border border-navy-700 text-slate-400 rounded-md px-2.5 py-1">
              {source.issuingBody}
            </span>
          )}
        </div>

        {source.scopeDescription && (
          <p className="text-body text-slate-300 leading-relaxed border-t border-navy-700 pt-4">
            {source.scopeDescription}
          </p>
        )}

        {source.sourceUrl && (
          <div className="border-t border-navy-700 pt-4">
            {/*
              WCAG 2.4.7: focus-visible ring on external link.
              WCAG 2.5.8: py-1 gives ≥24px height target.
            */}
            <a
              href={source.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 py-1 text-small text-emerald-400 hover:text-emerald-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 rounded"
            >
              <ExternalLink size={13} aria-hidden="true" />
              Amtliche Quelle ansehen →
            </a>
          </div>
        )}
      </div>

      {/* Key provisions */}
      {source.keyProvisions.length > 0 && (
        <section aria-labelledby="provisions-heading" className="space-y-4">
          <h2
            id="provisions-heading"
            className="text-heading font-semibold text-white"
          >
            Schlüsselbestimmungen
          </h2>
          <ul className="space-y-4" role="list">
            {source.keyProvisions.map((provision, i) => (
              <ProvisionCard
                key={`${provision.section}-${i}`}
                provision={provision}
                sourceUrl={source.sourceUrl}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function ProvisionCard({
  provision,
  sourceUrl,
}: {
  provision: KeyProvision;
  sourceUrl?: string | null;
}) {
  return (
    <li className="rounded-lg border border-navy-700 bg-navy-900 p-5 space-y-3">
      {/* Section + title */}
      <div className="flex items-start gap-3">
        <span className="text-caption text-emerald-400 font-mono bg-emerald-400/10 border border-emerald-400/20 rounded px-1.5 py-0.5 shrink-0 mt-0.5">
          {provision.section}
        </span>
        <h3 className="text-title font-medium text-white leading-snug">
          {provision.title}
        </h3>
      </div>

      {/* Summary */}
      <p className="text-body text-slate-300 leading-relaxed">
        {provision.summary}
      </p>

      {/* Compliance implication */}
      {provision.complianceImplication && (
        <div className="flex items-start gap-2 bg-amber-400/5 border border-amber-400/20 rounded-md px-3 py-2.5">
          <ChevronRight
            size={13}
            className="text-amber-400 mt-0.5 shrink-0"
            aria-hidden="true"
          />
          <p className="text-small text-amber-200/80 leading-relaxed">
            <span className="font-medium text-amber-300">
              Compliance-Hinweis:{" "}
            </span>
            {provision.complianceImplication}
          </p>
        </div>
      )}

      {/* Paragraph text */}
      {provision.paragraphText && (
        <div className="border-t border-navy-700 pt-3 space-y-2">
          <p className="text-small text-slate-400 leading-relaxed font-mono whitespace-pre-wrap">
            {provision.paragraphText}
          </p>
          {provision.paragraphTextTruncated &&
            (provision.paragraphUrl ?? sourceUrl) && (
              <a
                href={(provision.paragraphUrl ?? sourceUrl)!}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 py-1 text-small text-emerald-400 hover:text-emerald-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 rounded"
              >
                <ExternalLink size={12} aria-hidden="true" />
                Vollständiger Text bei der amtlichen Quelle →
              </a>
            )}
        </div>
      )}
    </li>
  );
}
