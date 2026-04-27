"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Library,
  Search,
  Filter,
  X,
  ArrowRight,
  Building2,
  Calendar,
} from "lucide-react";
import {
  ALL_SOURCES,
  getTranslatedSource,
  type LegalSource,
  type LegalSourceType,
  type ComplianceArea,
  type RelevanceLevel,
} from "@/data/legal-sources";
import { useLanguage } from "@/components/providers/LanguageProvider";

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * /atlas/sources — sources index. Browseable surface for the 937-
 * source statutory corpus.
 *
 * Filters:
 *   - Free-text search across title, citation, jurisdiction (locale-
 *     aware via getTranslatedSource fallback)
 *   - Source type (federal_law / federal_regulation / international_treaty / …)
 *   - Jurisdiction (multi-select)
 *   - Compliance area
 *   - Status (in_force / draft / superseded / …)
 *
 * Visual language matches /atlas/cases (the caselaw counterpart) but
 * uses emerald accents (the same hue as `[ATLAS-…]` citation pills) to
 * read as statutory-text sources rather than adjudication outcomes.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

const TYPE_LABEL: Record<LegalSourceType, { en: string; de: string }> = {
  international_treaty: { en: "Treaty", de: "Vertrag" },
  federal_law: { en: "Statute", de: "Gesetz" },
  federal_regulation: { en: "Regulation", de: "Verordnung" },
  technical_standard: { en: "Technical std.", de: "Standard" },
  eu_regulation: { en: "EU regulation", de: "EU-Verordnung" },
  eu_directive: { en: "EU directive", de: "EU-Richtlinie" },
  policy_document: { en: "Policy", de: "Richtlinie" },
  draft_legislation: { en: "Draft", de: "Entwurf" },
};

const RELEVANCE_TONE: Record<RelevanceLevel, string> = {
  fundamental:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300",
  critical: "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300",
  high: "bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-300",
  medium:
    "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300",
  low: "bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300",
};

const STATUS_LABEL: Record<string, { en: string; de: string; tone: string }> = {
  in_force: {
    en: "In force",
    de: "In Kraft",
    tone: "text-emerald-600 dark:text-emerald-400",
  },
  draft: {
    en: "Draft",
    de: "Entwurf",
    tone: "text-amber-600 dark:text-amber-400",
  },
  proposed: {
    en: "Proposed",
    de: "Vorschlag",
    tone: "text-amber-600 dark:text-amber-400",
  },
  superseded: {
    en: "Superseded",
    de: "Aufgehoben",
    tone: "text-slate-500",
  },
  planned: {
    en: "Planned",
    de: "Geplant",
    tone: "text-slate-500",
  },
  not_ratified: {
    en: "Not ratified",
    de: "Nicht ratifiziert",
    tone: "text-slate-500",
  },
  expired: {
    en: "Expired",
    de: "Abgelaufen",
    tone: "text-slate-500",
  },
};

const RELEVANCE_ORDER: Record<RelevanceLevel, number> = {
  fundamental: 0,
  critical: 1,
  high: 2,
  medium: 3,
  low: 4,
};

const COMPLIANCE_LABEL: Record<ComplianceArea, { en: string; de: string }> = {
  licensing: { en: "Licensing", de: "Genehmigung" },
  registration: { en: "Registration", de: "Registrierung" },
  liability: { en: "Liability", de: "Haftung" },
  insurance: { en: "Insurance", de: "Versicherung" },
  cybersecurity: { en: "Cybersecurity", de: "Cybersicherheit" },
  export_control: { en: "Export control", de: "Exportkontrolle" },
  data_security: { en: "Data security", de: "Datensicherheit" },
  frequency_spectrum: { en: "Spectrum", de: "Frequenzen" },
  environmental: { en: "Environmental", de: "Umwelt" },
  debris_mitigation: { en: "Debris mitigation", de: "Debris-Mitigation" },
  space_traffic_management: {
    en: "Space-traffic mgmt",
    de: "Verkehrsmanagement",
  },
  human_spaceflight: { en: "Human spaceflight", de: "Bemannte Raumfahrt" },
  military_dual_use: { en: "Military / dual-use", de: "Militär / Dual-Use" },
};

export default function SourcesIndexPage() {
  const { language } = useLanguage();
  const [query, setQuery] = useState("");
  const [type, setType] = useState<LegalSourceType | "all">("all");
  const [jurisdiction, setJurisdiction] = useState<string>("all");
  const [area, setArea] = useState<ComplianceArea | "all">("all");

  const allJurisdictions = useMemo(() => {
    const set = new Set(ALL_SOURCES.map((s) => s.jurisdiction));
    return Array.from(set).sort();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const arr = ALL_SOURCES.filter((s) => {
      if (s.status === "superseded" || s.status === "expired") return false;
      if (type !== "all" && s.type !== type) return false;
      if (jurisdiction !== "all" && s.jurisdiction !== jurisdiction)
        return false;
      if (area !== "all" && !s.compliance_areas.includes(area)) return false;
      if (!q) return true;
      const tr = getTranslatedSource(s, language);
      const haystack = [
        tr.title,
        s.title_en,
        s.title_local ?? "",
        s.id,
        s.jurisdiction,
        s.official_reference ?? "",
        s.parliamentary_reference ?? "",
        s.un_reference ?? "",
        s.issuing_body,
        ...s.compliance_areas,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
    return arr.sort((a, b) => {
      const ra = RELEVANCE_ORDER[a.relevance_level] ?? 9;
      const rb = RELEVANCE_ORDER[b.relevance_level] ?? 9;
      if (ra !== rb) return ra - rb;
      return a.jurisdiction.localeCompare(b.jurisdiction);
    });
  }, [query, type, jurisdiction, area, language]);

  // Cap render to first 200 rows when there's no filter, otherwise show all
  // matches. Browsing the full 900+ corpus on a single page would render
  // 900 cards on initial paint and tank LCP — the cap stays invisible the
  // moment a user types anything.
  const VIEW_CAP = 200;
  const filtersActive =
    !!query.trim() ||
    type !== "all" ||
    jurisdiction !== "all" ||
    area !== "all";
  const displayed = filtersActive ? filtered : filtered.slice(0, VIEW_CAP);
  const truncated = !filtersActive && filtered.length > VIEW_CAP;

  const isDe = language === "de";

  return (
    <div className="flex flex-col h-full min-h-screen bg-[var(--atlas-bg-page)] p-4 gap-3">
      {/* Header */}
      <header className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Library className="h-5 w-5 text-emerald-600" strokeWidth={1.5} />
          <h1 className="text-[18px] font-semibold tracking-tight text-[var(--atlas-text-primary)]">
            {isDe ? "Rechtsquellen" : "Legal Sources"}
          </h1>
          <span className="text-[11px] text-[var(--atlas-text-faint)]">
            {ALL_SOURCES.length}{" "}
            {isDe
              ? "Statuten, Verordnungen, Verträge und technische Standards"
              : "statutes, regulations, treaties, and technical standards"}
          </span>
        </div>
      </header>

      {/* Intro */}
      <div className="rounded-xl border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] shadow-sm p-4">
        <p className="text-[12px] text-[var(--atlas-text-secondary)] leading-relaxed max-w-3xl">
          {isDe ? (
            <>
              Der vollständige statutarische Korpus, den Atlas indexiert — von
              UN-Verträgen über EU-Verordnungen und nationale Raumfahrtgesetze
              bis zu ITU-Spectrum-Allocations und ISO/CCSDS-Standards. Jede
              Quelle führt zur Detail-Seite mit übersetzten Provisionen und
              Cross-Links zur einschlägigen Rechtsprechung. Frei durchsuchbar
              oder über{" "}
              <Link
                href="/atlas/jurisdictions"
                className="text-emerald-700 dark:text-emerald-400 underline underline-offset-2 hover:text-emerald-800"
              >
                Jurisdiktionen
              </Link>{" "}
              gruppiert browsbar.
            </>
          ) : (
            <>
              The complete statutory corpus Atlas indexes — UN treaties, EU
              regulations, national space acts, ITU spectrum allocations, and
              ISO/CCSDS standards. Each entry links to a detail page with
              translated provisions and cross-references to relevant caselaw.
              Browseable here, or grouped by{" "}
              <Link
                href="/atlas/jurisdictions"
                className="text-emerald-700 dark:text-emerald-400 underline underline-offset-2 hover:text-emerald-800"
              >
                jurisdiction
              </Link>
              .
            </>
          )}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-md bg-[var(--atlas-bg-surface)] border border-[var(--atlas-border)] px-2.5 py-1.5 shadow-sm flex-1 min-w-[240px] max-w-md">
          <Search
            className="h-3.5 w-3.5 text-[var(--atlas-text-faint)] flex-shrink-0"
            strokeWidth={1.5}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              isDe
                ? "Nach Titel, Aktenzeichen, Behörde suchen…"
                : "Search title, citation, body…"
            }
            className="bg-transparent text-[12px] text-[var(--atlas-text-primary)] flex-1 outline-none placeholder:text-[var(--atlas-text-faint)]"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="text-[var(--atlas-text-faint)] hover:text-[var(--atlas-text-primary)]"
            >
              <X className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
          )}
        </div>

        <select
          value={type}
          onChange={(e) => setType(e.target.value as LegalSourceType | "all")}
          className="rounded-md bg-[var(--atlas-bg-surface)] border border-[var(--atlas-border)] px-2.5 py-1.5 text-[12px] text-[var(--atlas-text-primary)] shadow-sm outline-none cursor-pointer"
        >
          <option value="all">{isDe ? "Alle Typen" : "All types"}</option>
          {(Object.keys(TYPE_LABEL) as LegalSourceType[]).map((tk) => (
            <option key={tk} value={tk}>
              {isDe ? TYPE_LABEL[tk].de : TYPE_LABEL[tk].en}
            </option>
          ))}
        </select>

        <select
          value={jurisdiction}
          onChange={(e) => setJurisdiction(e.target.value)}
          className="rounded-md bg-[var(--atlas-bg-surface)] border border-[var(--atlas-border)] px-2.5 py-1.5 text-[12px] text-[var(--atlas-text-primary)] shadow-sm outline-none cursor-pointer"
        >
          <option value="all">
            {isDe ? "Alle Jurisdiktionen" : "All jurisdictions"}
          </option>
          {allJurisdictions.map((j) => (
            <option key={j} value={j}>
              {j}
            </option>
          ))}
        </select>

        <select
          value={area}
          onChange={(e) => setArea(e.target.value as ComplianceArea | "all")}
          className="rounded-md bg-[var(--atlas-bg-surface)] border border-[var(--atlas-border)] px-2.5 py-1.5 text-[12px] text-[var(--atlas-text-primary)] shadow-sm outline-none cursor-pointer"
        >
          <option value="all">
            {isDe ? "Alle Bereiche" : "All compliance areas"}
          </option>
          {(Object.keys(COMPLIANCE_LABEL) as ComplianceArea[]).map((ck) => (
            <option key={ck} value={ck}>
              {isDe ? COMPLIANCE_LABEL[ck].de : COMPLIANCE_LABEL[ck].en}
            </option>
          ))}
        </select>

        {filtersActive && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setType("all");
              setJurisdiction("all");
              setArea("all");
            }}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-[12px] text-[var(--atlas-text-muted)] hover:text-[var(--atlas-text-primary)]"
          >
            <Filter className="h-3 w-3" strokeWidth={1.5} />
            {isDe ? "Filter zurücksetzen" : "Reset filters"}
          </button>
        )}

        <span className="ml-auto text-[11px] text-[var(--atlas-text-faint)]">
          {filtered.length} {isDe ? "Treffer" : "results"}
          {truncated &&
            ` · ${isDe ? `oberste ${VIEW_CAP} angezeigt` : `top ${VIEW_CAP} shown`}`}
        </span>
      </div>

      {/* Result list */}
      {displayed.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] p-8 text-center">
          <p className="text-[12px] text-[var(--atlas-text-muted)]">
            {isDe
              ? "Keine Quellen für diese Filter."
              : "No sources match the current filters."}
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {displayed.map((s) => {
            const tr = getTranslatedSource(s, language);
            const status = STATUS_LABEL[s.status];
            const typeLabel = TYPE_LABEL[s.type];
            return (
              <li
                key={s.id}
                className="group rounded-xl border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] hover:bg-[var(--atlas-bg-surface-muted)] shadow-sm hover:shadow transition-all"
              >
                <Link
                  href={`/atlas/sources/${encodeURIComponent(s.id)}`}
                  className="block p-4"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider font-mono text-[var(--atlas-text-muted)]">
                      <span>{s.jurisdiction}</span>
                      <span>·</span>
                      <span>{isDe ? typeLabel.de : typeLabel.en}</span>
                      {s.date_in_force && (
                        <>
                          <span>·</span>
                          <span>{s.date_in_force.slice(0, 4)}</span>
                        </>
                      )}
                    </div>
                    <span
                      className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${RELEVANCE_TONE[s.relevance_level]}`}
                    >
                      {s.relevance_level}
                    </span>
                  </div>

                  <h3 className="text-[14px] font-semibold text-[var(--atlas-text-primary)] mb-1 leading-snug line-clamp-2">
                    {tr.title}
                  </h3>

                  {s.title_local && s.title_local !== tr.title && (
                    <p className="text-[11px] text-[var(--atlas-text-muted)] italic mb-2 line-clamp-1">
                      {s.title_local}
                    </p>
                  )}

                  {tr.scopeDescription && (
                    <p className="text-[11px] text-[var(--atlas-text-secondary)] line-clamp-2 mb-3">
                      {tr.scopeDescription}
                    </p>
                  )}

                  <div className="flex items-center justify-between gap-2 flex-wrap pt-2 border-t border-[var(--atlas-border-subtle)]">
                    <span className="inline-flex items-center gap-1 text-[10px] text-[var(--atlas-text-muted)] truncate max-w-[180px]">
                      <Building2
                        className="h-3 w-3 flex-shrink-0"
                        strokeWidth={1.5}
                      />
                      <span className="truncate">{s.issuing_body}</span>
                    </span>
                    {status && (
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-medium ${status.tone}`}
                      >
                        <Calendar className="h-3 w-3" strokeWidth={1.5} />
                        {isDe ? status.de : status.en}
                      </span>
                    )}
                    <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 ml-auto truncate max-w-[140px]">
                      {s.id}
                    </span>
                    <ArrowRight
                      className="h-3 w-3 text-[var(--atlas-text-faint)] group-hover:text-emerald-600 transition-colors"
                      strokeWidth={1.5}
                    />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {truncated && (
        <div className="text-[11px] text-[var(--atlas-text-muted)] text-center py-4">
          {isDe ? (
            <>
              Es gibt {filtered.length} relevante Quellen. Suche oder filtere um
              den vollen Katalog zu durchsuchen.
            </>
          ) : (
            <>
              {filtered.length} relevant sources total. Use search or filters to
              explore the full catalogue.
            </>
          )}
        </div>
      )}
    </div>
  );
}
