import Link from "next/link";
import { ScrollText, Globe2, ArrowRight, Search } from "lucide-react";
import {
  TREATY_GROUPS,
  resolveTreatyBySlug,
  type TreatySlug,
} from "@/data/treaties";
import type { LegalSource } from "@/data/legal-sources";

/**
 * /atlas/treaties — hub for international space-treaty deep-dives.
 *
 * Three-tier curation (see src/data/treaties.ts#TREATY_GROUPS):
 *
 *   1. Core UN Space Treaties  — OST, Rescue, Liability, Registration, Moon
 *   2. COPUOS & UN Guidelines  — debris, LTS, remote sensing, broadcasting, NPS
 *   3. Related Instruments     — PTBT, ITU Constitution
 *
 * Each card links to /atlas/treaties/[slug] for the full deep-dive.
 * This hub is the curated companion to /atlas/international, which is
 * the exhaustive chronological list of every indexed instrument.
 */

export const metadata = {
  title: "International Treaties — Atlas",
  description:
    "UN space treaties, COPUOS guidelines, and related instruments governing the peaceful use of outer space.",
};

interface CardEntry {
  slug: TreatySlug;
  source: LegalSource;
}

function resolveGroupCards(slugs: readonly TreatySlug[]): CardEntry[] {
  return slugs
    .map((slug) => {
      const source = resolveTreatyBySlug(slug);
      return source ? { slug, source } : null;
    })
    .filter((x): x is CardEntry => x !== null);
}

function formatYear(date?: string): string {
  if (!date) return "";
  return date.slice(0, 4);
}

function partiesCount(source: LegalSource): number {
  return source.applies_to_jurisdictions?.length ?? 0;
}

export default function TreatiesHubPage() {
  return (
    <div className="flex flex-col h-full min-h-screen bg-[var(--atlas-bg-page)] p-4 gap-3">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Globe2 className="h-5 w-5 text-emerald-600" strokeWidth={1.5} />
          <h1 className="text-[18px] font-semibold tracking-tight text-gray-900">
            International Treaties
          </h1>
          <span className="text-[11px] text-gray-400">
            UN cornerstone treaties · COPUOS guidelines · related instruments
          </span>
        </div>
        <div className="flex items-center gap-1.5 rounded-md bg-white border border-gray-200 px-2.5 py-1.5 shadow-sm">
          <Search className="h-3 w-3 text-gray-400" strokeWidth={1.5} />
          <span className="text-[11px] text-gray-400">Search treaties…</span>
        </div>
      </header>

      {/* Intro */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
        <p className="text-[12px] text-gray-600 leading-relaxed max-w-3xl">
          International space law is anchored by five UN treaties from 1967–1979
          and surrounded by COPUOS soft-law instruments that fill in the
          technical gaps (debris, sustainability, remote sensing). Every
          national space law traces its authorization logic, liability regime,
          and registration duties back to this corpus. The hub below gives each
          instrument its own deep-dive page; the exhaustive chronological list
          lives at{" "}
          <Link
            href="/atlas/international"
            className="text-emerald-700 underline underline-offset-2 hover:text-emerald-800"
          >
            /atlas/international
          </Link>
          .
        </p>
      </div>

      {/* Groups */}
      {TREATY_GROUPS.map((group) => {
        const cards = resolveGroupCards(group.slugs);
        if (cards.length === 0) return null;
        return (
          <section key={group.key} className="mt-3">
            <div className="mb-3 flex items-baseline justify-between">
              <div>
                <div className="text-[10px] font-semibold tracking-wider uppercase text-gray-500 mb-1">
                  {group.kicker}
                </div>
                <h2 className="text-[15px] font-semibold tracking-tight text-gray-900">
                  {group.title}
                </h2>
              </div>
              <span className="text-[11px] text-gray-400">
                {cards.length} instrument{cards.length === 1 ? "" : "s"}
              </span>
            </div>
            <p className="text-[11px] text-gray-500 leading-relaxed max-w-3xl mb-4">
              {group.lede}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {cards.map(({ slug, source }) => {
                const year = formatYear(source.date_enacted);
                const parties = partiesCount(source);
                const isTreaty = source.type === "international_treaty";
                const statusTone =
                  source.status === "in_force"
                    ? {
                        bg: "bg-emerald-50",
                        border: "border-emerald-200",
                        text: "text-emerald-700",
                        label: "In force",
                      }
                    : {
                        bg: "bg-amber-50",
                        border: "border-amber-200",
                        text: "text-amber-700",
                        label: source.status.replace(/_/g, " "),
                      };

                return (
                  <Link
                    key={slug}
                    href={`/atlas/treaties/${slug}`}
                    className="
                      group relative flex flex-col justify-between overflow-hidden
                      rounded-xl border border-gray-200 bg-white p-5 shadow-sm
                      hover:border-emerald-300 hover:shadow-md
                      transition-all duration-200
                      min-h-[180px]
                    "
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2">
                          <ScrollText
                            className="h-3.5 w-3.5 text-emerald-600"
                            strokeWidth={1.5}
                          />
                          <span className="text-[10px] font-semibold tracking-wider uppercase text-emerald-700">
                            {year}
                          </span>
                        </div>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[9px] font-medium tracking-wider uppercase border ${statusTone.bg} ${statusTone.border} ${statusTone.text}`}
                        >
                          {statusTone.label}
                        </span>
                      </div>

                      <h3 className="text-[13px] font-semibold text-gray-900 leading-snug mb-2 line-clamp-3">
                        {source.title_en}
                      </h3>

                      {source.un_reference ? (
                        <p className="text-[10px] text-gray-400 font-mono mb-3">
                          {source.un_reference}
                        </p>
                      ) : null}

                      {source.key_provisions[0]?.summary ? (
                        <p className="text-[11px] text-gray-600 leading-relaxed line-clamp-3">
                          {source.key_provisions[0].summary}
                        </p>
                      ) : null}
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-[10px] text-gray-500">
                        {isTreaty
                          ? `${parties} State Part${parties === 1 ? "y" : "ies"} indexed`
                          : `Applies to ${parties} jurisdictions`}
                      </span>
                      <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-700 group-hover:text-emerald-800 transition-colors">
                        <span>Open</span>
                        <ArrowRight
                          className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-1"
                          strokeWidth={2}
                        />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}

      {/* Footer reference */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 mt-3">
        <h3 className="text-[11px] font-semibold tracking-wider uppercase text-gray-500 mb-2">
          Primary depositary
        </h3>
        <p className="text-[11px] text-gray-600 leading-relaxed max-w-2xl">
          The UN Office for Outer Space Affairs (UNOOSA) is the depositary for
          the five core UN space treaties and publishes the authoritative list
          of States Parties. Atlas cross-references UNOOSA ratification data
          with national gazette publications and flags any discrepancy in each
          jurisdiction&apos;s detail view.{" "}
          <a
            href="https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-700 underline underline-offset-2 hover:text-emerald-800"
          >
            UNOOSA treaty depositary →
          </a>
        </p>
      </div>
    </div>
  );
}
