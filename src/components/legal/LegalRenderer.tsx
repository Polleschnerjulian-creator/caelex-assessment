import Link from "next/link";
import { AlertTriangle, Info } from "lucide-react";
import type {
  LegalDocument,
  LegalBlock,
  LegalSection,
} from "@/lib/legal/types";

function Block({ block }: { block: LegalBlock }) {
  switch (block.type) {
    case "p":
      return (
        <p className="text-body-lg text-[#4B5563] leading-relaxed mt-3 first:mt-0">
          {block.text}
        </p>
      );
    case "ul":
      return (
        <ul className="list-disc list-inside text-body-lg text-[#4B5563] mt-3 space-y-1.5">
          {block.items.map((it, i) => (
            <li key={i}>{it}</li>
          ))}
        </ul>
      );
    case "num":
      return (
        <ol className="list-decimal list-inside text-body-lg text-[#4B5563] mt-3 space-y-1.5">
          {block.items.map((it, i) => (
            <li key={i}>{it}</li>
          ))}
        </ol>
      );
    case "callout":
      return (
        <div
          className={`mt-4 rounded-lg border px-4 py-3 flex gap-3 text-body text-[#4B5563] ${
            block.variant === "warn"
              ? "bg-amber-50 border-amber-200"
              : "bg-blue-50 border-blue-200"
          }`}
        >
          {block.variant === "warn" ? (
            <AlertTriangle
              size={16}
              className="flex-shrink-0 text-amber-600 mt-0.5"
            />
          ) : (
            <Info size={16} className="flex-shrink-0 text-blue-600 mt-0.5" />
          )}
          <span>{block.text}</span>
        </div>
      );
    case "definition":
      return (
        <p className="text-body-lg text-[#4B5563] leading-relaxed mt-2">
          <strong className="text-[#111827]">„{block.term}"</strong> —{" "}
          {block.text}
        </p>
      );
  }
}

function Section({ section }: { section: LegalSection }) {
  return (
    <section id={section.id} className="scroll-mt-32">
      <h2 className="text-heading font-medium text-[#111827] mb-3 mt-8 first:mt-0">
        {section.number} {section.title}
      </h2>
      {section.blocks.map((b, i) => (
        <Block key={i} block={b} />
      ))}
    </section>
  );
}

export function LegalRenderer({ doc }: { doc: LegalDocument }) {
  return (
    <main className="landing-light min-h-screen bg-[#F7F8FA] text-[#111827]">
      <div className="pt-32 pb-20 px-6 md:px-12">
        <div className="max-w-[820px] mx-auto">
          {/* Language toggle */}
          <div className="flex justify-end mb-6">
            <Link
              href={doc.lang === "de" ? "/legal/terms-en" : "/legal/terms"}
              className="text-small text-[#4B5563] hover:text-[#111827] transition-colors border border-[#E5E7EB] rounded-full px-3 py-1"
            >
              {doc.lang === "de" ? "English Version" : "Deutsche Version"}
            </Link>
          </div>

          {/* Header */}
          <h1 className="text-display font-light tracking-[-0.02em] mb-2">
            {doc.title}
          </h1>
          <p className="text-body-lg text-[#4B5563] mb-3">{doc.subtitle}</p>
          <p className="text-body text-[#6B7280] mb-10">
            {doc.lang === "de" ? "Stand" : "Effective"}: {doc.effectiveDate} ·{" "}
            {doc.legalEntity} · {doc.version}
          </p>

          {/* Preamble */}
          {doc.preamble && doc.preamble.length > 0 && (
            <div className="mb-10 p-5 rounded-xl bg-white border border-[#E5E7EB]">
              {doc.preamble.map((p, i) => (
                <p
                  key={i}
                  className="text-body text-[#4B5563] leading-relaxed mt-2 first:mt-0"
                >
                  {p}
                </p>
              ))}
            </div>
          )}

          {/* TOC */}
          <nav
            aria-label="Inhaltsverzeichnis"
            className="mb-12 p-5 rounded-xl bg-white border border-[#E5E7EB]"
          >
            <div className="text-caption font-semibold uppercase tracking-wider text-[#6B7280] mb-3">
              {doc.lang === "de" ? "Inhaltsverzeichnis" : "Table of Contents"}
            </div>
            <ol className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-body">
              {doc.sections.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="text-[#4B5563] hover:text-[#111827]"
                  >
                    {s.number} {s.title}
                  </a>
                </li>
              ))}
              {doc.annexes.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="text-[#4B5563] hover:text-[#111827] italic"
                  >
                    {s.number} {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          {/* Sections */}
          <div className="space-y-2">
            {doc.sections.map((s) => (
              <Section key={s.id} section={s} />
            ))}
          </div>

          {/* Annexes */}
          {doc.annexes.length > 0 && (
            <>
              <div className="mt-16 mb-4 pt-8 border-t border-[#E5E7EB]">
                <h2 className="text-display-sm font-light tracking-tight text-[#111827]">
                  {doc.lang === "de"
                    ? "Produktspezifische Anhänge"
                    : "Product-Specific Annexes"}
                </h2>
                <p className="text-body text-[#6B7280] mt-2">
                  {doc.lang === "de"
                    ? "Die folgenden Anhänge ergänzen die Hauptklauseln dieser AGB für die jeweils genannten Produkte. Bei Widerspruch gehen die Anhänge den Hauptklauseln vor, soweit der Anhang es ausdrücklich bestimmt."
                    : "The following annexes supplement the main terms for the respective products. In case of conflict, annexes prevail over the main terms where the annex expressly so provides."}
                </p>
              </div>
              <div className="space-y-2">
                {doc.annexes.map((s) => (
                  <Section key={s.id} section={s} />
                ))}
              </div>
            </>
          )}

          {/* Contact */}
          <section
            id="contact"
            className="mt-16 pt-8 border-t border-[#E5E7EB]"
          >
            <h2 className="text-heading font-medium text-[#111827] mb-3">
              {doc.lang === "de" ? "Kontakt" : "Contact"}
            </h2>
            <address className="not-italic text-body-lg text-[#4B5563] leading-relaxed">
              {doc.contactLines.map((l, i) =>
                l.startsWith("mailto:") ? (
                  <a
                    key={i}
                    href={l}
                    className="block text-[#111827] hover:underline"
                  >
                    {l.replace("mailto:", "")}
                  </a>
                ) : (
                  <span key={i} className="block">
                    {l}
                  </span>
                ),
              )}
            </address>
          </section>

          {/* Footer */}
          <div className="mt-12 pt-8 border-t border-[#E5E7EB]">
            <p className="text-small text-[#9CA3AF]">
              {doc.version} · {doc.effectiveDate}
            </p>
            <div className="flex gap-4 mt-4 flex-wrap">
              {doc.links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="text-small text-[#4B5563] hover:text-[#111827]"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
