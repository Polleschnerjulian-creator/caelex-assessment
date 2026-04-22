import Link from "next/link";
import { generateMetadata as genMeta } from "@/lib/seo";
import type { Metadata } from "next";
import { Archive, ExternalLink } from "lucide-react";

export const metadata: Metadata = {
  ...genMeta({
    title: "AGB-Archiv · Terms archive",
    description:
      "Archiv früherer Fassungen der Caelex-AGB. Jede Version wird mindestens zehn Jahre nach Außerkraftsetzung vorgehalten (AGB § 35).",
    path: "/legal/terms/archive",
    keywords: ["AGB Archiv", "Terms archive", "Caelex Versionsverlauf"],
  }),
  alternates: { canonical: "https://www.caelex.eu/legal/terms/archive" },
};

interface Version {
  version: string;
  title: string;
  effectiveFrom: string;
  effectiveTo: string;
  available: "current" | "archived" | "on_request";
  summary: string;
}

const VERSIONS: Version[] = [
  {
    version: "V3.0",
    title: "AGB V3.0 (aktuell gültig)",
    effectiveFrom: "18. April 2026",
    effectiveTo: "—",
    available: "current",
    summary:
      "Vollständige Überarbeitung auf 35 Paragraphen + 5 Produkt-Annexes. Neue Klauseln für KI, Export-Kontrolle, Vertraulichkeit, Anti-Korruption, Assignment, Versionsarchivierung. Harmonisiert mit DPA V1.0 und Sub-Processor-Register.",
  },
  {
    version: "V2.0",
    title: "AGB V2.0",
    effectiveFrom: "Februar 2026",
    effectiveTo: "17. April 2026",
    available: "on_request",
    summary:
      "Erweiterte Fassung mit Abschnitten zu Freistellung, Widerrufsrecht, Beta-Funktionen, API-Nutzung. Referenzhaltung: Vorgängerfassung von V3.0.",
  },
  {
    version: "V1.0",
    title: "AGB V1.0",
    effectiveFrom: "—",
    effectiveTo: "Februar 2026",
    available: "on_request",
    summary: "Initiale Fassung zum Plattform-Start.",
  },
];

export default function TermsArchivePage() {
  return (
    <main className="landing-light min-h-screen bg-[#F7F8FA] text-[#111827]">
      <div className="pt-32 pb-20 px-6 md:px-12">
        <div className="max-w-[820px] mx-auto">
          <div className="mb-3 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-700 bg-gray-100 border border-gray-200 rounded-md px-2 py-1">
            <Archive size={12} />
            Versionsarchiv · Version archive
          </div>
          <h1 className="text-display font-light tracking-[-0.02em] mb-2">
            AGB-Archiv
          </h1>
          <p className="text-body-lg text-[#4B5563] mb-3">
            Terms &amp; Conditions archive
          </p>
          <p className="text-body text-[#6B7280] mb-10">
            Jede Version der Caelex-AGB wird mindestens zehn Jahre nach
            Außerkraftsetzung vorgehalten (AGB § 35). Kunden erhalten bei
            Vertragsschluss eine E-Mail-Bestätigung mit der zu diesem Zeitpunkt
            geltenden Fassung; die hier aufgeführten Versionen können zusätzlich
            angefordert werden.
          </p>

          <div className="space-y-4">
            {VERSIONS.map((v) => (
              <article
                key={v.version}
                className="rounded-xl bg-white border border-[#E5E7EB] p-6"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-[#6B7280] mb-1">
                      {v.version}
                      {v.available === "current" && (
                        <span className="ml-2 text-emerald-600">
                          · aktuell gültig
                        </span>
                      )}
                    </div>
                    <h2 className="text-title font-semibold text-[#111827]">
                      {v.title}
                    </h2>
                    <p className="text-small text-[#6B7280] mt-1">
                      In Kraft: {v.effectiveFrom} → {v.effectiveTo}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    {v.available === "current" && (
                      <Link
                        href="/legal/terms"
                        className="inline-flex items-center gap-1 text-small text-emerald-700 hover:underline"
                      >
                        Öffnen <ExternalLink size={11} />
                      </Link>
                    )}
                    {v.available === "on_request" && (
                      <a
                        href={`mailto:legal@caelex.eu?subject=AGB-Anforderung%20${v.version}`}
                        className="inline-flex items-center gap-1 text-small text-[#4B5563] hover:text-[#111827]"
                      >
                        Auf Anfrage <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                </div>
                <p className="text-body text-[#4B5563] leading-relaxed">
                  {v.summary}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-12 pt-8 border-t border-[#E5E7EB]">
            <div className="flex gap-4 flex-wrap">
              <Link
                href="/legal/terms"
                className="text-small text-[#111827] hover:underline"
              >
                Aktuelle AGB →
              </Link>
              <Link
                href="/legal/dpa"
                className="text-small text-[#4B5563] hover:text-[#111827]"
              >
                DPA
              </Link>
              <Link
                href="/legal/privacy"
                className="text-small text-[#4B5563] hover:text-[#111827]"
              >
                Datenschutz
              </Link>
              <a
                href="mailto:legal@caelex.eu?subject=AGB-Versionsanforderung"
                className="text-small text-[#4B5563] hover:text-[#111827]"
              >
                Version anfordern
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
