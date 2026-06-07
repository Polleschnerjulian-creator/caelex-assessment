/**
 * Caelex Scholar — source detail page (Task 3.4).
 *
 * Server Component: reads corpus data directly via getScholarSourceDetail.
 * No client fetch, no spinner — renders instantly server-side.
 * notFound() replaces client-side 404/error states.
 *
 * WCAG 2.2 AA:
 *   - lang="de" on ScholarPage (WCAG 3.1.1 — content is German)
 *   - All interactive elements have visible focus-visible rings (WCAG 2.4.7)
 *   - Touch targets ≥ 24px via py-1 on links (WCAG 2.5.8)
 *   - <h1> / <h2> / <h3> heading hierarchy (WCAG 1.3.1 / 2.4.6)
 *   - External link text includes direction arrows (no icon-only labels)
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, ChevronRight } from "lucide-react";
import { auth } from "@/lib/auth";
import { getScholarSourceDetail } from "@/lib/scholar/source-detail.server";
import { getScholarPreferences } from "@/lib/scholar/preferences.server";
import { ScholarPage } from "../../_components/ScholarPage";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ScholarSourceDetailPage({ params }: PageProps) {
  const { id } = await params;

  // Read user's sourceLanguage preference server-side; default "original" when
  // unauthenticated (layout redirects anyway, but be safe).
  const session = await auth();
  const prefs = session?.user?.id
    ? await getScholarPreferences(session.user.id)
    : null;
  const sourceLanguage = prefs?.sourceLanguage ?? "original";

  const source = getScholarSourceDetail(id, sourceLanguage);
  if (!source) notFound();

  return (
    <ScholarPage>
      {/*
        WCAG 2.4.7: back link needs visible focus indicator.
        WCAG 2.5.8: inline-flex with py-1 gives ≥24px height target.
        The link is also the first focusable element so it receives focus
        naturally when the page loads via keyboard nav.
      */}
      <Link
        href="/scholar"
        className="inline-flex items-center gap-1.5 py-1 mb-6 text-[12px] text-gray-700 hover:text-gray-900 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F8FA] rounded"
      >
        <ArrowLeft size={13} aria-hidden="true" />
        Zurück zur Suche
      </Link>

      <div className="space-y-8">
        {/* Header card */}
        <div className="rounded-2xl border border-gray-200/70 bg-white p-6 space-y-4 shadow-sm">
          <div className="space-y-1">
            {/*
              WCAG 1.3.1 / 2.4.6: <h1> provides the document title for this
              source. The visually-hidden page-level h1 is in the shell; this
              is the first visible heading on the content area.
            */}
            <h1 className="text-[24px] font-semibold text-gray-900 leading-snug">
              {source.title}
            </h1>
            {source.titleLocal && source.titleLocal !== source.title && (
              <p className="text-[13px] text-gray-500 italic">
                {source.titleLocal}
              </p>
            )}
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap gap-2 text-[11px]">
            <span className="bg-gray-100 border border-gray-200 text-gray-700 rounded-md px-2.5 py-1">
              {source.jurisdiction}
            </span>
            <span className="bg-gray-100 border border-gray-200 text-gray-700 rounded-md px-2.5 py-1">
              {source.type}
            </span>
            <span className="bg-gray-100 border border-gray-200 text-gray-700 rounded-md px-2.5 py-1">
              {source.status}
            </span>
            {source.issuingBody && (
              <span className="bg-gray-100 border border-gray-200 text-gray-500 rounded-md px-2.5 py-1">
                {source.issuingBody}
              </span>
            )}
          </div>

          {source.scopeDescription && (
            <p className="text-[13px] text-gray-700 leading-relaxed border-t border-gray-100 pt-4">
              {source.scopeDescription}
            </p>
          )}

          {source.sourceUrl && (
            <div className="border-t border-gray-100 pt-4">
              {/*
                WCAG 2.4.7: focus-visible ring on external link.
                WCAG 2.5.8: py-1 gives ≥24px height target.
              */}
              <a
                href={source.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 py-1 text-[12px] text-gray-700 hover:text-gray-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 rounded"
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
              className="text-[18px] font-semibold text-gray-900"
            >
              Schlüsselbestimmungen
            </h2>
            <ul className="space-y-4" role="list">
              {source.keyProvisions.map((provision, i) => (
                <li
                  key={`${provision.section}-${i}`}
                  className="rounded-2xl border border-gray-200/70 bg-white p-6 space-y-3 shadow-sm"
                >
                  {/* Section + title */}
                  <div className="flex items-start gap-3">
                    <span className="text-[11px] text-gray-600 font-mono bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5 shrink-0 mt-0.5">
                      {provision.section}
                    </span>
                    <h3 className="text-[16px] font-medium text-gray-900 leading-snug">
                      {provision.title}
                    </h3>
                  </div>

                  {/* Summary */}
                  <p className="text-[13px] text-gray-700 leading-relaxed">
                    {provision.summary}
                  </p>

                  {/* Compliance implication */}
                  {provision.complianceImplication && (
                    <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-md px-3 py-2.5">
                      <ChevronRight
                        size={13}
                        className="text-amber-600 mt-0.5 shrink-0"
                        aria-hidden="true"
                      />
                      <p className="text-[12px] text-amber-800 leading-relaxed">
                        <span className="font-medium text-amber-900">
                          Compliance-Hinweis:{" "}
                        </span>
                        {provision.complianceImplication}
                      </p>
                    </div>
                  )}

                  {/* Paragraph text */}
                  {provision.paragraphText && (
                    <div className="border-t border-gray-100 pt-3 space-y-2">
                      <p className="text-[12px] text-gray-600 leading-relaxed font-mono whitespace-pre-wrap">
                        {provision.paragraphText}
                      </p>
                      {provision.paragraphTextTruncated &&
                        (provision.paragraphUrl ?? source.sourceUrl) && (
                          <a
                            href={(provision.paragraphUrl ?? source.sourceUrl)!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 py-1 text-[12px] text-gray-700 hover:text-gray-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 rounded"
                          >
                            <ExternalLink size={12} aria-hidden="true" />
                            Vollständiger Text bei der amtlichen Quelle →
                          </a>
                        )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </ScholarPage>
  );
}
