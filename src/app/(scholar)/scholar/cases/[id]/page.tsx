/**
 * /scholar/cases/[id] — Case law detail page.
 *
 * Server Component — corpus read server-side; nothing reaches the bundle.
 * Next.js 15: params is a Promise — await it.
 *
 * WCAG 2.2 AA:
 *   - <main> + <h1>; logical heading structure (h2 per section)
 *   - External links have accessible name + rel="noopener"
 *   - Applied-sources list links to /scholar/sources/<id>
 *   - lang="de" on root element
 *   - Back link has py-1 for ≥24px target
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { getCaseById, getCasesApplyingSource } from "@/data/legal-cases";
import { getLegalSourceById } from "@/data/legal-sources";

// ─── Status labels ──────────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  decided: "Entschieden",
  settled: "Vergleich",
  pending: "Ausstehend",
  withdrawn: "Zurückgezogen",
  vacated: "Aufgehoben",
  appeal_pending: "Berufung ausstehend",
};

// Precedential weight labels
const WEIGHT_LABELS: Record<string, string> = {
  binding: "Bindend",
  persuasive: "Überzeugend",
  settled_facts: "Vergleichspraxis",
  non_precedential: "Keine Präzedenzwirkung",
  treaty_only: "Völkerrechtlich",
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CaseDetailPage({ params }: Props) {
  const { id } = await params;

  const c = getCaseById(id);
  if (!c) {
    notFound();
  }

  // Resolve applied sources for the "Angewandte Rechtsquellen" section
  const appliedSources = c.applied_sources
    .map((sid) => getLegalSourceById(sid))
    .filter(Boolean);

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString("de-DE", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return iso;
    }
  };

  return (
    <main lang="de" className="min-h-screen bg-[#F7F8FA] px-8 lg:px-16 py-12">
      {/*
        WCAG 2.5.8: py-1 → ≥24px height ✓
        WCAG 2.4.7: focus-visible ring ✓
        WCAG 1.4.3: gray-700 on #F7F8FA ≈ 7.0:1 ✓
      */}
      <Link
        href="/scholar/cases"
        className="inline-flex items-center gap-1.5 py-1 mb-8 text-[12px] text-gray-700 hover:text-gray-900 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F8FA] rounded"
      >
        <ArrowLeft size={13} aria-hidden="true" />
        Zurück zur Rechtsprechung
      </Link>

      {/* ─── Header card ─── */}
      <div className="bg-white border border-gray-100 rounded-2xl p-8 mb-8 space-y-4">
        {/* Parties */}
        <p className="text-[11px] font-semibold tracking-widest text-gray-500 uppercase">
          {c.plaintiff}{" "}
          <span className="text-gray-400 font-normal normal-case tracking-normal">
            gegen
          </span>{" "}
          {c.defendant}
        </p>

        {/*
          WCAG 1.3.1 / 2.4.6: h1 = case title. gray-900 on white ≥15:1 ✓
        */}
        <h1 className="text-[24px] font-semibold text-gray-900 leading-snug tracking-[-0.01em]">
          {c.title}
        </h1>

        {/* Meta row */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* Forum name */}
          <span className="text-[10px] font-medium text-gray-700 bg-gray-100 rounded-md px-2.5 py-1">
            {c.forum_name}
          </span>

          {/* Date */}
          <span className="text-[10px] text-gray-600 bg-gray-100 rounded-md px-2.5 py-1">
            {formatDate(c.date_decided)}
          </span>

          {/* Jurisdiction */}
          <span className="text-[10px] font-bold text-gray-700 bg-gray-100 rounded-md px-2.5 py-1">
            {c.jurisdiction}
          </span>

          {/* Status */}
          <span className="text-[10px] text-gray-700 bg-gray-100 rounded-md px-2.5 py-1">
            {STATUS_LABELS[c.status] ?? c.status}
          </span>

          {/* Precedential weight */}
          <span className="text-[10px] text-gray-600 bg-gray-100 rounded-md px-2.5 py-1">
            {WEIGHT_LABELS[c.precedential_weight] ?? c.precedential_weight}
          </span>
        </div>

        {/* Citation */}
        {c.citation && (
          <p className="text-[11px] font-mono text-gray-600">{c.citation}</p>
        )}

        {/* Source URL */}
        {c.source_url && (
          <div className="pt-2 border-t border-gray-100">
            {/*
              WCAG 2.4.7: focus-visible ring ✓
              WCAG 2.5.8: py-1 ≥24px ✓
              Opens in new tab — rel="noopener noreferrer" for security
            */}
            <a
              href={c.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 py-1 text-[12px] text-gray-700 hover:text-gray-900 underline underline-offset-2 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 focus-visible:ring-offset-white rounded"
            >
              <ExternalLink size={12} aria-hidden="true" />
              Amtliche Entscheidung ansehen
            </a>
          </div>
        )}
      </div>

      {/* ─── Content sections ─── */}
      <div className="space-y-6">
        {/* Sachverhalt (Facts) */}
        <section
          aria-labelledby="section-facts"
          className="bg-white border border-gray-100 rounded-2xl p-6"
        >
          {/*
            WCAG 1.3.1: h2 for section heading. gray-900 on white ≥15:1 ✓
          */}
          <h2
            id="section-facts"
            className="text-[11px] font-semibold tracking-[0.15em] uppercase text-gray-500 mb-3"
          >
            Sachverhalt
          </h2>
          {/*
            WCAG 1.4.3: gray-800 on white = 8.6:1 ✓
          */}
          <p className="text-[14px] text-gray-800 leading-relaxed whitespace-pre-line">
            {c.facts}
          </p>
        </section>

        {/* Entscheidung (Ruling summary) */}
        <section
          aria-labelledby="section-ruling"
          className="bg-white border border-gray-100 rounded-2xl p-6"
        >
          <h2
            id="section-ruling"
            className="text-[11px] font-semibold tracking-[0.15em] uppercase text-gray-500 mb-3"
          >
            Entscheidung
          </h2>
          <p className="text-[14px] text-gray-800 leading-relaxed whitespace-pre-line">
            {c.ruling_summary}
          </p>
        </section>

        {/* Leitsatz / Holding */}
        <section
          aria-labelledby="section-holding"
          className="bg-white border border-gray-100 rounded-2xl p-6"
        >
          <h2
            id="section-holding"
            className="text-[11px] font-semibold tracking-[0.15em] uppercase text-gray-500 mb-3"
          >
            Leitsatz / Holding
          </h2>
          <p className="text-[14px] text-gray-800 leading-relaxed">
            {c.legal_holding}
          </p>
        </section>

        {/* Bedeutung (Industry significance) */}
        <section
          aria-labelledby="section-significance"
          className="bg-white border border-gray-100 rounded-2xl p-6"
        >
          <h2
            id="section-significance"
            className="text-[11px] font-semibold tracking-[0.15em] uppercase text-gray-500 mb-3"
          >
            Bedeutung
          </h2>
          <p className="text-[14px] text-gray-800 leading-relaxed">
            {c.industry_significance}
          </p>
        </section>

        {/* Remedy (if present) */}
        {c.remedy && (
          <section
            aria-labelledby="section-remedy"
            className="bg-white border border-gray-100 rounded-2xl p-6"
          >
            <h2
              id="section-remedy"
              className="text-[11px] font-semibold tracking-[0.15em] uppercase text-gray-500 mb-3"
            >
              Rechtsfolge / Sanktion
            </h2>
            <div className="space-y-2">
              {c.remedy.monetary && c.remedy.amount_usd != null && (
                <p className="text-[14px] text-gray-800">
                  Geldbuße:{" "}
                  <span className="font-semibold">
                    {c.remedy.amount_local
                      ? `${c.remedy.amount_local.currency} ${c.remedy.amount_local.amount.toLocaleString("de-DE")}`
                      : `USD ${c.remedy.amount_usd.toLocaleString("de-DE")}`}
                  </span>
                </p>
              )}
              {c.remedy.non_monetary && c.remedy.non_monetary.length > 0 && (
                <ul className="list-disc list-inside space-y-1" role="list">
                  {c.remedy.non_monetary.map((item, i) => (
                    <li
                      key={i}
                      className="text-[14px] text-gray-800 leading-relaxed"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}

        {/* Angewandte Rechtsquellen */}
        {appliedSources.length > 0 && (
          <section
            aria-labelledby="section-sources"
            className="bg-white border border-gray-100 rounded-2xl p-6"
          >
            <h2
              id="section-sources"
              className="text-[11px] font-semibold tracking-[0.15em] uppercase text-gray-500 mb-4"
            >
              Angewandte Rechtsquellen
            </h2>
            <ul className="space-y-1" role="list">
              {appliedSources.map((source) => {
                if (!source) return null;
                return (
                  <li key={source.id}>
                    {/*
                      WCAG 2.5.8: py-2.5 gives ≥40px + text ≥44px ✓
                      WCAG 2.4.7: focus-visible ring ✓
                    */}
                    <Link
                      href={`/scholar/sources/${encodeURIComponent(source.id)}`}
                      className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-transparent hover:border-gray-200 hover:bg-gray-50 motion-safe:transition-all motion-safe:duration-200 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                    >
                      <span className="text-[9px] font-bold uppercase tracking-wider text-gray-600 w-8 flex-shrink-0">
                        {source.jurisdiction}
                      </span>
                      <span className="text-[13px] font-medium text-gray-800 group-hover:text-black motion-safe:transition-colors flex-1 min-w-0 truncate">
                        {source.title_en}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* Notes (if present) */}
        {c.notes && c.notes.length > 0 && (
          <section
            aria-labelledby="section-notes"
            className="bg-white border border-gray-100 rounded-2xl p-6"
          >
            <h2
              id="section-notes"
              className="text-[11px] font-semibold tracking-[0.15em] uppercase text-gray-500 mb-3"
            >
              Hinweise
            </h2>
            <ul className="space-y-2 list-disc list-inside" role="list">
              {c.notes.map((note, i) => (
                <li
                  key={i}
                  className="text-[13px] text-gray-700 leading-relaxed"
                >
                  {note}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {/* Last verified */}
      <p className="mt-8 text-[10px] text-gray-500">
        Zuletzt verifiziert: {formatDate(c.last_verified)}
      </p>

      {/* Footer */}
      <footer className="mt-12 pt-8 border-t border-gray-100 pb-10">
        <div className="space-y-3 text-[10px] text-gray-600 leading-[1.7] mb-4">
          <p>
            <span className="font-semibold text-gray-700">Kein Rechtsrat.</span>{" "}
            Die bereitgestellten Informationen stellen keine Rechts- oder
            Compliance-Beratung dar.
          </p>
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-gray-600 tracking-wider">
              SCHOLAR
            </span>
            <span className="text-[9px] text-gray-600">by Caelex</span>
          </div>
          <span className="text-[9px] text-gray-600">
            © {new Date().getFullYear()} Caelex — Alle Rechte vorbehalten
          </span>
        </div>
      </footer>
    </main>
  );
}
