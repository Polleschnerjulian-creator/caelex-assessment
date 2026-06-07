/**
 * ProvisionCard — the atomic provision unit for Caelex Scholar (concept §3e).
 *
 * Renders one key_provision (section + title + summary, always present) as a
 * deep-linkable, copy-citable reading card. complianceImplication renders as a
 * NEUTRAL monochrome callout (the old amber box is gone — concept §1d/§3e).
 * Verbatim paragraphText is a progressive-enhancement block shown only when the
 * corpus carries it (≈10 provisions corpus-wide, 600-char capped upstream).
 *
 * Server component: embeds the CopyCitation client island, no hooks/data here.
 *
 * STRICTLY MONOCHROME: black / white / gray-* only — zero other hues.
 * Type sizes come exclusively from the shared SCHOLAR_TYPE tokens (existing
 * tailwind.config.ts semantic scale) — never an ad-hoc text-[Npx].
 *
 * Accessibility (light canvas: #F7F8FA page / white cards):
 *   • <h3> provision title keeps the h1→h2→h3 hierarchy (WCAG 1.3.1 / 2.4.6).
 *   • Body gray-900 ≈ 17:1 · secondary gray-700 ≈ 9:1 on white (WCAG 1.4.3 AA).
 *   • The card is an anchor target (id) with scroll-mt-24; the global
 *     `[id] { scroll-margin-top }` rule also applies (WCAG 2.4.5 deep-link).
 *   • The external "full text" link carries a directional arrow (no icon-only),
 *     opens in a new tab with rel="noopener noreferrer", and shows a
 *     focus-visible ring (WCAG 2.4.7); py-1 keeps the target ≥24px (WCAG 2.5.8).
 *   • The embedded CopyCitation button supplies its own focus ring + live region.
 */

import { ExternalLink } from "lucide-react";

import { SCHOLAR_TYPE } from "./scholar-type";
import { CopyCitation } from "./CopyCitation";

interface ProvisionCardProps {
  /** Stable anchor id — the deep-link target; MUST match the TOC item id. */
  id: string;
  /** Section label (e.g. "Art. VI", "§ 12"). Drives the mono pill + copy label. */
  section?: string;
  /** Provision title — the only required content field. */
  title: string;
  /** Editorial summary (reading prose). */
  summary?: string;
  /** Compliance note → neutral callout (never amber). */
  complianceImplication?: string;
  /** Verbatim normative text (already truncated upstream when long). */
  paragraphText?: string;
  /** Whether paragraphText was truncated — gates the "full text" link. */
  paragraphTruncated?: boolean;
  /** Provision-level deep link to the official text (preferred over sourceUrl). */
  paragraphUrl?: string;
  /** Document-level official URL — fallback for the "full text" link. */
  sourceUrl?: string;
  /** Citation prefix (the document title) prepended to the copied pinpoint. */
  citationBase?: string;
}

export function ProvisionCard({
  id,
  section,
  title,
  summary,
  complianceImplication,
  paragraphText,
  paragraphTruncated,
  paragraphUrl,
  sourceUrl,
  citationBase,
}: ProvisionCardProps) {
  // Pinpoint citation: "<document title>, <section|title>" — falls back to the
  // provision title when the provision carries no section label.
  const citationText = `${citationBase ? citationBase + ", " : ""}${section ?? title}`;
  const fullTextHref = paragraphUrl ?? sourceUrl;

  return (
    <li
      id={id}
      className="scroll-mt-24 rounded-2xl border border-gray-200/70 bg-white p-6 shadow-sm space-y-3"
    >
      {/* Section label — mono pill (concept §3e). Only when a section exists. */}
      {section && (
        <span
          className={`inline-block rounded border border-gray-200 bg-gray-100 px-1.5 py-0.5 ${SCHOLAR_TYPE.mono}`}
        >
          {section}
        </span>
      )}

      {/* h3 provision title — keeps the document heading hierarchy. */}
      <h3 className={SCHOLAR_TYPE.sectionHeading}>{title}</h3>

      {/* Summary — reading prose, constrained measure. */}
      {summary && (
        <p className={`max-w-[68ch] ${SCHOLAR_TYPE.body}`}>{summary}</p>
      )}

      {/* Compliance-Hinweis — NEUTRAL callout (replaces the old amber box). */}
      {complianceImplication && (
        <div className="rounded border-l-2 border-gray-400 bg-gray-50 px-3 py-2.5">
          <p className="text-small text-gray-700">
            <span className="font-semibold text-gray-900">
              Compliance-Hinweis:{" "}
            </span>
            {complianceImplication}
          </p>
        </div>
      )}

      {/* Verbatim text — progressive enhancement; mono block + optional link. */}
      {paragraphText && (
        <div className="space-y-2 border-t border-gray-200 pt-3">
          <p className={`whitespace-pre-wrap ${SCHOLAR_TYPE.mono}`}>
            {paragraphText}
          </p>
          {paragraphTruncated && fullTextHref && (
            <a
              href={fullTextHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded py-1 text-small text-gray-700 hover:text-gray-900 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F8FA]"
            >
              <ExternalLink size={13} aria-hidden="true" />
              Vollständiger Text bei der amtlichen Quelle →
            </a>
          )}
        </div>
      )}

      {/* Copy pinpoint citation. The section is independently deep-linkable via #id. */}
      <div className="pt-1">
        <CopyCitation
          text={citationText}
          label={section ? `${section} kopieren` : "Zitat kopieren"}
        />
      </div>
    </li>
  );
}
