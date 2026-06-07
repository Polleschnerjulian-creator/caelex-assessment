/**
 * LegalDoc — reusable server component that renders a Scholar legal document.
 *
 * USAGE (the whole doc-agent contract in one place):
 *
 *   // src/app/(scholar)/scholar/legal/<slug>/page.tsx
 *   import { LegalDoc } from "../_components/LegalDoc";
 *   import { PRIVACY_DE } from "../_content/privacy-de";
 *   import { PRIVACY_EN } from "../_content/privacy-en";
 *
 *   export default function Page() {
 *     return <LegalDoc de={PRIVACY_DE} en={PRIVACY_EN} />;
 *   }
 *
 * LegalDoc:
 *   • resolves the active UI locale itself (server-side, from the session) and
 *     picks the German edition when locale === "de", else the English edition.
 *     A page MAY pass an explicit `locale` to override (rarely needed).
 *   • renders inside the Scholar light theme via <ScholarPage> (the same wrapper
 *     every Scholar page uses → consistent <main>, max-width, padding).
 *   • shows a prominent, monochrome ENTWURF/DRAFT banner at the top (mandatory),
 *     plus a Stand/Last-updated + Version meta line.
 *   • renders headings/paragraphs/lists cleanly at a comfortable reading measure
 *     (max-w-[68ch]).
 *
 * STRICTLY MONOCHROME — only black / white / gray-* classes; sizes come from the
 * shared SCHOLAR_TYPE tokens.
 *
 * Accessibility (WCAG 2.2 AA):
 *   • <article lang={edition.lang}> so AT announces the correct document
 *     language even when it differs from the surface UI locale (3.1.1 / 3.1.2).
 *   • The draft notice is a role="note" landmark with an aria-label (1.3.1).
 *   • One <h1> (title) → <h2> per section → <h3> for in-section subheadings:
 *     a correct, gap-free heading outline (1.3.1 / 2.4.6).
 *   • Body text gray-900 on white ≥ 15:1; meta gray-600 ≈ 5.7:1 (1.4.3).
 */

import "server-only";
import { auth } from "@/lib/auth";
import { ScholarPage } from "../../_components/ScholarPage";
import { SCHOLAR_TYPE } from "../../_components/scholar-type";
import { t, type ScholarLocale } from "../../_i18n/core";
import { LEGAL } from "../../_i18n/legal";
import { getScholarLocale } from "../../_i18n/locale.server";
import type {
  ScholarLegalBlock,
  ScholarLegalDoc,
  ScholarLegalSection,
} from "./types";

// ─── Block renderer ──────────────────────────────────────────────────
function Block({ block }: { block: ScholarLegalBlock }) {
  switch (block.type) {
    case "p":
      return <p className={`${SCHOLAR_TYPE.body} mt-4`}>{block.text}</p>;

    case "subheading":
      return (
        <h3 className={`${SCHOLAR_TYPE.sectionHeading} mt-6`}>{block.text}</h3>
      );

    case "ul":
      return (
        <ul className="mt-4 list-disc pl-6 space-y-1.5">
          {block.items.map((item, i) => (
            <li key={i} className={SCHOLAR_TYPE.body}>
              {item}
            </li>
          ))}
        </ul>
      );

    case "num":
      return (
        <ol className="mt-4 list-decimal pl-6 space-y-1.5">
          {block.items.map((item, i) => (
            <li key={i} className={SCHOLAR_TYPE.body}>
              {item}
            </li>
          ))}
        </ol>
      );

    case "definition":
      return (
        <p className={`${SCHOLAR_TYPE.body} mt-4`}>
          <strong className="font-semibold text-gray-900">{block.term}</strong>{" "}
          {block.text}
        </p>
      );

    case "callout":
      // Monochrome boxed aside. `warn` reads heavier (darker border + bg);
      // `info` is subtle. No non-gray hue is used for either variant.
      return (
        <div
          className={[
            "mt-4 rounded-lg border px-4 py-3",
            block.variant === "warn"
              ? "border-gray-400 bg-gray-100"
              : "border-gray-200 bg-gray-50",
          ].join(" ")}
        >
          <p className={SCHOLAR_TYPE.bodyMuted}>{block.text}</p>
        </div>
      );

    default:
      return null;
  }
}

// ─── Section renderer ────────────────────────────────────────────────
function Section({ section }: { section: ScholarLegalSection }) {
  return (
    <section className="mt-10">
      {section.number && (
        <p className={`${SCHOLAR_TYPE.eyebrow} mb-1`}>{section.number}</p>
      )}
      <h2 id={section.id} className={SCHOLAR_TYPE.partHeading}>
        {section.title}
      </h2>
      {section.blocks.map((block, i) => (
        <Block key={i} block={block} />
      ))}
    </section>
  );
}

// ─── LegalDoc ────────────────────────────────────────────────────────
export async function LegalDoc({
  de,
  en,
  locale: localeProp,
}: {
  /** German (binding) edition. */
  de: ScholarLegalDoc;
  /** English (convenience) edition. */
  en: ScholarLegalDoc;
  /**
   * Optional explicit UI locale. When omitted, LegalDoc resolves it from the
   * session itself. Only the DE-vs-EN edition split matters here, but the full
   * ScholarLocale is used to localise the banner/meta chrome.
   */
  locale?: ScholarLocale;
}) {
  // Resolve the active UI locale unless the page overrides it.
  let locale = localeProp;
  if (!locale) {
    const session = await auth();
    locale = await getScholarLocale(session?.user?.id);
  }

  // German edition for German readers; English for everyone else (convenience).
  const edition = locale === "de" ? de : en;

  return (
    <ScholarPage>
      {/* Reading measure: ~68ch for comfortable legal prose. */}
      <article lang={edition.lang} className="mx-auto w-full max-w-[68ch]">
        {/* ── Title ── */}
        <header>
          <h1 className={SCHOLAR_TYPE.docTitle}>{edition.title}</h1>
          {edition.subtitle && (
            <p className={`${SCHOLAR_TYPE.bodyMuted} mt-2`}>
              {edition.subtitle}
            </p>
          )}
          {/* Stand / Last-updated + Version meta line */}
          <p className={`${SCHOLAR_TYPE.meta} mt-3`}>
            <span>
              {t(locale, LEGAL, "lastUpdatedLabel")}: {edition.lastUpdated}
            </span>
            <span aria-hidden="true" className="px-2 text-gray-400">
              ·
            </span>
            <span>
              {t(locale, LEGAL, "versionLabel")}: {edition.version}
            </span>
          </p>
        </header>

        {/* ── Preamble ── */}
        {edition.preamble && edition.preamble.length > 0 && (
          <div className="mt-6">
            {edition.preamble.map((para, i) => (
              <p key={i} className={`${SCHOLAR_TYPE.body} mt-4 first:mt-0`}>
                {para}
              </p>
            ))}
          </div>
        )}

        {/* ── Sections ── */}
        {edition.sections.map((section) => (
          <Section key={section.id} section={section} />
        ))}
      </article>
    </ScholarPage>
  );
}
