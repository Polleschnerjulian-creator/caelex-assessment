import Link from "next/link";
import { generateMetadata as genMeta } from "@/lib/seo";
import type { Metadata } from "next";
import { ExternalLink, Server, Info } from "lucide-react";
import { SUB_PROCESSORS } from "./_content/sub-processors-data";

export const metadata: Metadata = {
  ...genMeta({
    title: "Sub-Auftragsverarbeiter · Sub-processors",
    description:
      "Aktuelle Liste der von Caelex eingesetzten Sub-Auftragsverarbeiter gemäß Art. 28 Abs. 2 DSGVO und AGB V3.0 § 20. Transparente Auflistung mit Zweck, Datenarten und Transfermechanismus je Anbieter.",
    path: "/legal/sub-processors",
    keywords: [
      "Sub-processor",
      "Sub-Auftragsverarbeiter",
      "Art. 28 DSGVO",
      "Caelex",
    ],
  }),
  alternates: { canonical: "https://www.caelex.eu/legal/sub-processors" },
};

export default function SubProcessorsPage() {
  return (
    <main className="landing-light min-h-screen bg-[#F7F8FA] text-[#111827]">
      <div className="pt-32 pb-20 px-6 md:px-12">
        <div className="max-w-[980px] mx-auto">
          {/* Header */}
          <div className="mb-3 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-2 py-1">
            <Server size={12} />
            Transparenz-Register
          </div>
          <h1 className="text-display font-light tracking-[-0.02em] mb-2">
            Sub-Auftragsverarbeiter
          </h1>
          <p className="text-body-lg text-[#4B5563] mb-3">
            Sub-processors — List of Caelex sub-processors under Art. 28(2) GDPR
          </p>
          <p className="text-body text-[#6B7280] mb-10">
            Stand · Effective: 18. April 2026 · {SUB_PROCESSORS.length} aktive
            Unterauftragsverarbeiter · {SUB_PROCESSORS.length} active
            sub-processors
          </p>

          {/* Explanatory panel */}
          <div className="mb-10 p-5 rounded-xl bg-white border border-[#E5E7EB] flex gap-3">
            <Info size={18} className="flex-shrink-0 text-blue-600 mt-0.5" />
            <div className="text-body text-[#4B5563] leading-relaxed space-y-2">
              <p>
                Diese Seite führt alle Dienstleister auf, die Caelex im Rahmen
                der Plattform-Bereitstellung als Sub-Auftragsverarbeiter im
                Sinne von Art. 28 Abs. 2 DSGVO einsetzt. Jede Position gibt
                Zweck, Datenarten, Verarbeitungsort und Transfermechanismus
                transparent an.
              </p>
              <p className="text-[#6B7280]">
                This page lists all service providers engaged by Caelex as
                sub-processors within the meaning of Art. 28(2) GDPR. Each entry
                transparently discloses purpose, data types, processing location
                and transfer mechanism.
              </p>
              <p>
                Gemäß{" "}
                <Link href="/legal/dpa" className="underline">
                  DPA § 10
                </Link>{" "}
                informieren wir bestehende Kunden mindestens 30 Tage vor
                Aufnahme oder Austausch eines Sub-Auftragsverarbeiters.{" "}
                <a
                  href="mailto:privacy@caelex.eu?subject=Sub-processor%20change%20notifications"
                  className="underline"
                >
                  Hier für Benachrichtigungen anmelden
                </a>
                .
              </p>
            </div>
          </div>

          {/* Table */}
          <section>
            <div className="space-y-4">
              {SUB_PROCESSORS.map((sp) => (
                <article
                  key={sp.id}
                  id={sp.id}
                  className="rounded-xl bg-white border border-[#E5E7EB] p-6 scroll-mt-32"
                >
                  <header className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-[#6B7280] mb-1">
                        {sp.categoryLabel.de} · {sp.categoryLabel.en}
                      </div>
                      <h2 className="text-title font-semibold text-[#111827]">
                        {sp.name}
                      </h2>
                      <p className="text-small text-[#6B7280] mt-1">
                        {sp.entity}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <a
                        href={sp.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-small text-[#4B5563] hover:text-emerald-700"
                      >
                        Website <ExternalLink size={11} />
                      </a>
                      {sp.dpaUrl && (
                        <a
                          href={sp.dpaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-small text-[#4B5563] hover:text-emerald-700"
                        >
                          Provider DPA <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                  </header>

                  <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 mt-4">
                    <div>
                      <dt className="text-caption font-semibold uppercase tracking-wider text-[#6B7280] mb-1">
                        Zweck · Purpose
                      </dt>
                      <dd className="text-body text-[#4B5563] leading-relaxed">
                        {sp.purpose.de}
                      </dd>
                      <dd className="text-body text-[#6B7280] leading-relaxed mt-1">
                        {sp.purpose.en}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-caption font-semibold uppercase tracking-wider text-[#6B7280] mb-1">
                        Datenarten · Data types
                      </dt>
                      <dd className="text-body text-[#4B5563] leading-relaxed">
                        {sp.dataTypes.de}
                      </dd>
                      <dd className="text-body text-[#6B7280] leading-relaxed mt-1">
                        {sp.dataTypes.en}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-caption font-semibold uppercase tracking-wider text-[#6B7280] mb-1">
                        Verarbeitungsort · Location
                      </dt>
                      <dd className="text-body text-[#4B5563] leading-relaxed">
                        {sp.location}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-caption font-semibold uppercase tracking-wider text-[#6B7280] mb-1">
                        Transfer-Mechanismus · Transfer mechanism
                      </dt>
                      <dd className="text-body text-[#4B5563] leading-relaxed">
                        {sp.transferMechanism}
                      </dd>
                    </div>
                  </dl>

                  <footer className="mt-4 pt-3 border-t border-[#E5E7EB] text-small text-[#6B7280]">
                    In Einsatz seit · Added on: {sp.addedOn}
                  </footer>
                </article>
              ))}
            </div>
          </section>

          {/* Footer links */}
          <div className="mt-12 pt-8 border-t border-[#E5E7EB]">
            <div className="flex gap-4 flex-wrap">
              <Link
                href="/legal/dpa"
                className="text-small text-[#111827] hover:underline"
              >
                Auftragsverarbeitungsvertrag (DPA) →
              </Link>
              <Link
                href="/legal/privacy"
                className="text-small text-[#4B5563] hover:text-[#111827]"
              >
                Datenschutzerklärung
              </Link>
              <Link
                href="/legal/terms"
                className="text-small text-[#4B5563] hover:text-[#111827]"
              >
                AGB
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
