import Link from "next/link";
import { generateMetadata as genMeta } from "@/lib/seo";
import type { Metadata } from "next";
import {
  FileText,
  Lock,
  Shield,
  Users,
  ScrollText,
  BookOpen,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { LEGAL_CATEGORIES, type LegalCategory } from "@/lib/legal/navigation";

const ICONS: Record<
  LegalCategory["icon"],
  React.ComponentType<{ size?: number; className?: string }>
> = {
  terms: FileText,
  privacy: Lock,
  security: Shield,
  consumer: Users,
  policy: ScrollText,
  reference: BookOpen,
};

export const metadata: Metadata = {
  ...genMeta({
    title: "Legal Hub · Caelex",
    description:
      "Zentrale Übersicht aller rechtlichen Dokumente von Caelex: AGB, DPA, Datenschutz, Cookie-Richtlinie, KI-Transparenz, Sicherheit, Accessibility, AUP, Sub-Processors, Impressum und Archiv.",
    path: "/legal",
    keywords: ["Legal Hub", "AGB", "DPA", "Datenschutz", "Impressum", "Caelex"],
  }),
  alternates: { canonical: "https://caelex.eu/legal" },
};

export default function LegalHubPage() {
  return (
    <main className="landing-light min-h-screen bg-[#F7F8FA] text-[#111827]">
      <div className="pt-32 pb-20 px-6 md:px-12">
        <div className="max-w-[1100px] mx-auto">
          {/* Header */}
          <div className="mb-3 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-2 py-1">
            <FileText size={12} />
            Legal &amp; Compliance
          </div>
          <h1 className="text-display font-light tracking-[-0.02em] mb-2">
            Legal Hub
          </h1>
          <p className="text-body-lg text-[#4B5563] mb-3 max-w-[700px]">
            Alle rechtlichen Dokumente zu Caelex an einem Ort. Strukturiert nach
            Kategorien, zweisprachig (Deutsch rechtlich verbindlich, Englisch
            als Convenience).
          </p>
          <p className="text-body text-[#6B7280] mb-10 max-w-[700px]">
            All legal documents for Caelex in one place. Structured by category,
            bilingual (German legally binding, English as convenience).
          </p>

          {/* Hero stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-12">
            {[
              { n: "18", label: "Dokumente · Documents" },
              { n: "2", label: "Sprachen · Languages" },
              { n: "7", label: "Sub-Processors" },
              { n: "10J", label: "Archivierung · Retention" },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl bg-white border border-[#E5E7EB] px-5 py-4"
              >
                <span className="text-display-sm font-semibold text-[#111827] block leading-none">
                  {s.n}
                </span>
                <span className="text-small text-[#6B7280] block mt-2">
                  {s.label}
                </span>
              </div>
            ))}
          </div>

          {/* Categories */}
          <div className="space-y-12">
            {LEGAL_CATEGORIES.map((category) => {
              const Icon = ICONS[category.icon];
              const items = category.items.filter((it) => !it.isTranslation);

              return (
                <section
                  key={category.id}
                  id={category.id}
                  className="scroll-mt-32"
                >
                  <div className="flex items-start gap-3 mb-5">
                    <div className="mt-1 flex items-center justify-center h-9 w-9 rounded-lg bg-emerald-50 border border-emerald-100">
                      <Icon size={16} className="text-emerald-600" />
                    </div>
                    <div>
                      <h2 className="text-heading font-medium text-[#111827]">
                        {category.label}
                      </h2>
                      <p className="text-small text-[#6B7280] mt-0.5">
                        {category.description}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {items.map((item) => {
                      const translation = category.items.find(
                        (t) =>
                          t.isTranslation &&
                          t.id.startsWith(item.id) &&
                          t.id.endsWith("-en"),
                      );
                      return (
                        <article
                          key={item.id}
                          className="group rounded-xl bg-white border border-[#E5E7EB] hover:border-[#9CA3AF] hover:shadow-sm transition p-5"
                        >
                          <Link href={item.href} className="block">
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <h3 className="text-title font-semibold text-[#111827] group-hover:text-emerald-700 transition-colors">
                                {item.label}
                              </h3>
                              <ArrowRight
                                size={14}
                                className="flex-shrink-0 mt-1 text-[#D1D5DB] group-hover:text-emerald-600 transition-colors"
                              />
                            </div>
                            {item.description && (
                              <p className="text-small text-[#4B5563] leading-relaxed">
                                {item.description}
                              </p>
                            )}
                            <div className="mt-3 flex items-center gap-3 text-[10px] text-[#6B7280]">
                              {item.critical && (
                                <span className="inline-flex items-center gap-1 text-emerald-700">
                                  <CheckCircle2 size={10} strokeWidth={2.5} />
                                  Pflichtdokument
                                </span>
                              )}
                              {translation && (
                                <Link
                                  href={translation.href}
                                  onClick={(e) => e.stopPropagation()}
                                  className="hover:text-[#111827]"
                                >
                                  EN →
                                </Link>
                              )}
                            </div>
                          </Link>
                        </article>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>

          {/* Kontakte */}
          <section className="mt-16 pt-10 border-t border-[#E5E7EB]">
            <h2 className="text-heading font-medium mb-5">
              Kontakte · Contacts
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                {
                  label: "Rechtliches · Legal",
                  email: "legal@caelex.eu",
                  desc: "Verträge, AGB, DPA, Lizenzfragen",
                },
                {
                  label: "Datenschutz · Privacy",
                  email: "privacy@caelex.eu",
                  desc: "DSGVO-Anfragen, Betroffenenrechte",
                },
                {
                  label: "Sicherheit · Security",
                  email: "security@caelex.eu",
                  desc: "Vulnerability Disclosure, Vorfälle",
                },
                {
                  label: "Missbrauch · Abuse",
                  email: "abuse@caelex.eu",
                  desc: "DSA Notice-and-Action",
                },
                {
                  label: "Barrierefreiheit · Accessibility",
                  email: "accessibility@caelex.eu",
                  desc: "Barriere-Feedback, alternative Formate",
                },
                {
                  label: "Allgemein · General",
                  email: "cs@caelex.eu",
                  desc: "Support und allgemeine Anfragen",
                },
              ].map((c) => (
                <div
                  key={c.email}
                  className="rounded-xl bg-white border border-[#E5E7EB] p-4"
                >
                  <div className="text-caption font-semibold uppercase tracking-wider text-[#6B7280] mb-1">
                    {c.label}
                  </div>
                  <a
                    href={`mailto:${c.email}`}
                    className="text-body font-medium text-[#111827] hover:underline"
                  >
                    {c.email}
                  </a>
                  <p className="text-small text-[#6B7280] mt-1">{c.desc}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
