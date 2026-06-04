"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Filter,
  Sparkles,
} from "lucide-react";

import {
  type AzGDecision,
  type BafaAzgCoverage,
  type BafaAzgEntry,
} from "@/data/trade/training-corpus/bafa-azg";
import {
  type CjOutcome,
  type DdtcCjCoverage,
  type DdtcCjEntry,
} from "@/data/trade/training-corpus/ddtc-cj";
import {
  rankSimilarCases,
  type CorpusEntry,
  type CorpusJurisdiction,
} from "@/data/trade/training-corpus";

interface Props {
  bafaEntries: BafaAzgEntry[];
  ddtcEntries: DdtcCjEntry[];
  bafaCoverage: BafaAzgCoverage;
  ddtcCoverage: DdtcCjCoverage;
  /** Optional deep-link hints set on the server. */
  initialEccn?: string;
  initialDestination?: string;
  initialJurisdiction?: string;
  initialDecision?: string;
}

type DecisionKey = AzGDecision | CjOutcome | "ALL";
type JurisdictionFilter = CorpusJurisdiction | "ALL";

const DECISION_LABEL: Record<DecisionKey, string> = {
  ALL: "All decisions",
  LICENSE_REQUIRED: "BAFA — License required",
  NO_LICENSE_REQUIRED: "BAFA — No license (Nullbescheid)",
  CATCH_ALL_TRIGGERED: "BAFA — Catch-all triggered",
  USML: "DDTC — USML retained",
  EAR: "DDTC — EAR transferred",
  SPLIT: "DDTC — Split jurisdiction",
};

const DECISION_TONE: Record<Exclude<DecisionKey, "ALL">, string> = {
  LICENSE_REQUIRED: "trade-chip-warn",
  NO_LICENSE_REQUIRED: "trade-chip-success",
  CATCH_ALL_TRIGGERED: "trade-chip-danger",
  USML: "trade-chip-warn",
  EAR: "trade-chip-success",
  SPLIT: "trade-chip-neutral",
};

function toCorpusEntries(
  bafa: BafaAzgEntry[],
  ddtc: DdtcCjEntry[],
): CorpusEntry[] {
  return [
    ...bafa.map<CorpusEntry>((entry) => ({
      jurisdiction: "BAFA" as const,
      entry,
    })),
    ...ddtc.map<CorpusEntry>((entry) => ({
      jurisdiction: "DDTC" as const,
      entry,
    })),
  ];
}

function isAzGDecision(value: string): value is AzGDecision {
  return (
    value === "LICENSE_REQUIRED" ||
    value === "NO_LICENSE_REQUIRED" ||
    value === "CATCH_ALL_TRIGGERED"
  );
}
function isCjOutcome(value: string): value is CjOutcome {
  return value === "USML" || value === "EAR" || value === "SPLIT";
}

export function TrainingCorpusClient({
  bafaEntries,
  ddtcEntries,
  bafaCoverage,
  ddtcCoverage,
  initialEccn = "",
  initialDestination = "",
  initialJurisdiction,
  initialDecision,
}: Props) {
  // ─── Filter state ───────────────────────────────────────────────
  const [jurisdiction, setJurisdiction] = useState<JurisdictionFilter>(
    initialJurisdiction === "BAFA" || initialJurisdiction === "DDTC"
      ? (initialJurisdiction as CorpusJurisdiction)
      : "ALL",
  );
  const [decision, setDecision] = useState<DecisionKey>(
    initialDecision &&
      (isAzGDecision(initialDecision) || isCjOutcome(initialDecision))
      ? (initialDecision as DecisionKey)
      : "ALL",
  );
  const [eccnPrefix, setEccnPrefix] = useState<string>("");
  const [expanded, setExpanded] = useState<string | null>(null);

  // ─── Similarity state ──────────────────────────────────────────
  const [simEccn, setSimEccn] = useState<string>(initialEccn);
  const [simDestination, setSimDestination] =
    useState<string>(initialDestination);

  // ─── Derived: combined corpus + filtered list ──────────────────
  const allEntries = useMemo(
    () => toCorpusEntries(bafaEntries, ddtcEntries),
    [bafaEntries, ddtcEntries],
  );

  const filtered = useMemo(() => {
    return allEntries.filter((c) => {
      if (jurisdiction !== "ALL" && c.jurisdiction !== jurisdiction) {
        return false;
      }
      if (decision !== "ALL" && c.entry.decision !== decision) {
        return false;
      }
      if (eccnPrefix.trim().length > 0) {
        const code = c.entry.eccnOrUsmlGuess;
        if (code === null || !code.startsWith(eccnPrefix.trim())) {
          return false;
        }
      }
      return true;
    });
  }, [allEntries, jurisdiction, decision, eccnPrefix]);

  const ranked = useMemo(() => {
    if (simEccn.trim().length === 0 || simDestination.trim().length === 0) {
      return [];
    }
    return rankSimilarCases(
      {
        eccnOrUsml: simEccn.trim(),
        destination: simDestination.trim().toUpperCase(),
        jurisdiction:
          jurisdiction === "ALL" ? null : (jurisdiction as CorpusJurisdiction),
      },
      5,
    );
  }, [simEccn, simDestination, jurisdiction]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
      {/* ─── Left column: filters + list ─────────────────────────── */}
      <section className="space-y-4">
        <CoverageBanner
          bafaCount={bafaCoverage.entryCount}
          ddtcCount={ddtcCoverage.entryCount}
          asOf={bafaCoverage.asOfDate}
          disclaimer={bafaCoverage.disclaimer}
        />

        <FilterBar
          jurisdiction={jurisdiction}
          onJurisdictionChange={setJurisdiction}
          decision={decision}
          onDecisionChange={setDecision}
          eccnPrefix={eccnPrefix}
          onEccnPrefixChange={setEccnPrefix}
          resultCount={filtered.length}
        />

        <ul className="space-y-2.5">
          {filtered.length === 0 ? (
            <li className="rounded-lg border border-dashed border-trade-border-subtle bg-trade-bg-elevated px-5 py-8 text-center text-[13px] italic text-trade-text-muted">
              No cases match the current filters.
            </li>
          ) : (
            filtered.map((c) => (
              <CaseCard
                key={`${c.jurisdiction}-${c.entry.id}`}
                corpusEntry={c}
                expanded={expanded === c.entry.id}
                onToggle={() =>
                  setExpanded((current) =>
                    current === c.entry.id ? null : c.entry.id,
                  )
                }
              />
            ))
          )}
        </ul>
      </section>

      {/* ─── Right column: similarity ranking ────────────────────── */}
      <aside className="space-y-4">
        <SimilarityPanel
          eccn={simEccn}
          onEccnChange={setSimEccn}
          destination={simDestination}
          onDestinationChange={setSimDestination}
          ranked={ranked}
          jurisdiction={jurisdiction}
        />
      </aside>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────

function CoverageBanner({
  bafaCount,
  ddtcCount,
  asOf,
  disclaimer,
}: {
  bafaCount: number;
  ddtcCount: number;
  asOf: string;
  disclaimer: string;
}) {
  return (
    <div className="rounded-lg border border-trade-border-subtle bg-trade-bg-elevated px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-[12px]">
        <span className="font-medium text-trade-text-primary">
          {bafaCount + ddtcCount} cases
        </span>
        <span className="text-trade-text-secondary">
          BAFA AzG: {bafaCount} &middot; DDTC CJ: {ddtcCount}
        </span>
        <span className="text-trade-text-muted">As of {asOf}</span>
      </div>
      <p className="mt-1 text-[11.5px] italic text-trade-text-muted">
        {disclaimer}
      </p>
    </div>
  );
}

function FilterBar({
  jurisdiction,
  onJurisdictionChange,
  decision,
  onDecisionChange,
  eccnPrefix,
  onEccnPrefixChange,
  resultCount,
}: {
  jurisdiction: JurisdictionFilter;
  onJurisdictionChange: (v: JurisdictionFilter) => void;
  decision: DecisionKey;
  onDecisionChange: (v: DecisionKey) => void;
  eccnPrefix: string;
  onEccnPrefixChange: (v: string) => void;
  resultCount: number;
}) {
  return (
    <div className="rounded-lg border border-trade-border-subtle bg-trade-bg-elevated px-4 py-3">
      <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-trade-text-muted">
        <Filter size={12} />
        Filters &middot; {resultCount} match{resultCount === 1 ? "" : "es"}
      </div>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-[12px] text-trade-text-secondary">
          Jurisdiction
          <select
            value={jurisdiction}
            onChange={(e) =>
              onJurisdictionChange(e.target.value as JurisdictionFilter)
            }
            className="rounded-md border border-trade-border-subtle bg-trade-bg-elevated px-2 py-1.5 text-[13px] text-trade-text-primary focus:border-trade-accent focus:outline-none"
          >
            <option value="ALL">All</option>
            <option value="BAFA">BAFA AzG (Germany)</option>
            <option value="DDTC">DDTC CJ (United States)</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[12px] text-trade-text-secondary">
          Decision
          <select
            value={decision}
            onChange={(e) => onDecisionChange(e.target.value as DecisionKey)}
            className="rounded-md border border-trade-border-subtle bg-trade-bg-elevated px-2 py-1.5 text-[13px] text-trade-text-primary focus:border-trade-accent focus:outline-none"
          >
            <option value="ALL">All</option>
            <option value="LICENSE_REQUIRED">
              BAFA &middot; License required
            </option>
            <option value="NO_LICENSE_REQUIRED">
              BAFA &middot; Nullbescheid
            </option>
            <option value="CATCH_ALL_TRIGGERED">BAFA &middot; Catch-all</option>
            <option value="USML">DDTC &middot; USML retained</option>
            <option value="EAR">DDTC &middot; EAR transferred</option>
            <option value="SPLIT">DDTC &middot; Split</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[12px] text-trade-text-secondary">
          ECCN / USML prefix
          <input
            type="text"
            value={eccnPrefix}
            placeholder="e.g. 9A or XV(e)"
            onChange={(e) => onEccnPrefixChange(e.target.value)}
            className="rounded-md border border-trade-border-subtle bg-trade-bg-elevated px-2 py-1.5 text-[13px] text-trade-text-primary focus:border-trade-accent focus:outline-none"
          />
        </label>
      </div>
    </div>
  );
}

function CaseCard({
  corpusEntry,
  expanded,
  onToggle,
}: {
  corpusEntry: CorpusEntry;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { entry, jurisdiction } = corpusEntry;
  const decisionKey = entry.decision as Exclude<DecisionKey, "ALL">;
  const tone = DECISION_TONE[decisionKey];

  return (
    <li className="rounded-lg border border-trade-border-subtle bg-trade-bg-elevated">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-trade-hover focus:outline-none focus-visible:bg-trade-hover"
        aria-expanded={expanded}
      >
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-sm px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${tone}`}
            >
              {DECISION_LABEL[decisionKey]}
            </span>
            <span className="rounded-sm bg-trade-bg-subtle px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-trade-text-muted">
              {jurisdiction}
            </span>
            <span className="rounded-sm bg-trade-bg-subtle px-1.5 py-0.5 text-[10px] font-medium text-trade-text-muted">
              {entry.decisionDate}
            </span>
            <span className="rounded-sm bg-trade-bg-subtle px-1.5 py-0.5 text-[10px] font-medium text-trade-text-muted">
              Destination {entry.destination}
            </span>
            {entry.eccnOrUsmlGuess !== null ? (
              <span className="rounded-sm bg-trade-bg-subtle px-1.5 py-0.5 text-[10px] font-semibold text-trade-text-primary">
                {entry.eccnOrUsmlGuess}
              </span>
            ) : (
              <span className="rounded-sm bg-trade-bg-subtle px-1.5 py-0.5 text-[10px] italic text-trade-text-muted">
                no classification
              </span>
            )}
          </div>
          <p className="mt-2 text-[13px] text-trade-text-primary">
            {entry.itemDescription}
          </p>
        </div>
        <div className="mt-1 text-trade-text-muted">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>
      {expanded ? (
        <div className="border-t border-trade-border-subtle px-4 py-3 text-[13px]">
          <div className="mb-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-trade-text-muted">
              Rationale
            </p>
            <p className="mt-1 text-trade-text-secondary">{entry.rationale}</p>
          </div>
          <div className="mb-2 flex flex-wrap gap-1">
            {entry.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-sm bg-trade-bg-subtle px-1.5 py-0.5 text-[10px] text-trade-text-muted"
              >
                {tag}
              </span>
            ))}
          </div>
          <p className="flex items-center gap-1 text-[11.5px] italic text-trade-text-muted">
            <ExternalLink size={12} aria-hidden /> {entry.citation}
          </p>
        </div>
      ) : null}
    </li>
  );
}

function SimilarityPanel({
  eccn,
  onEccnChange,
  destination,
  onDestinationChange,
  ranked,
  jurisdiction,
}: {
  eccn: string;
  onEccnChange: (v: string) => void;
  destination: string;
  onDestinationChange: (v: string) => void;
  ranked: ReturnType<typeof rankSimilarCases>;
  jurisdiction: JurisdictionFilter;
}) {
  return (
    <div className="rounded-lg border border-trade-border-subtle bg-trade-bg-elevated px-4 py-4">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles size={14} className="text-trade-accent-strong" />
        <h2 className="text-[14px] font-semibold text-trade-text-primary">
          Similar to my item
        </h2>
      </div>
      <p className="mb-3 text-[12px] text-trade-text-secondary">
        Drop the ECCN or USML reference you&rsquo;re researching and the
        intended destination. We rank cases by ECCN + destination match and
        surface up to five closest precedents.
      </p>
      <div className="space-y-2">
        <label className="flex flex-col gap-1 text-[12px] text-trade-text-secondary">
          ECCN or USML
          <input
            type="text"
            value={eccn}
            placeholder="e.g. 9A515.b or XV(e)(13)"
            onChange={(e) => onEccnChange(e.target.value)}
            className="rounded-md border border-trade-border-subtle bg-trade-bg-elevated px-2 py-1.5 text-[13px] text-trade-text-primary focus:border-trade-accent focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-[12px] text-trade-text-secondary">
          Destination (alpha-2)
          <input
            type="text"
            value={destination}
            placeholder="e.g. JP, RU, CN"
            maxLength={2}
            onChange={(e) => onDestinationChange(e.target.value.toUpperCase())}
            className="rounded-md border border-trade-border-subtle bg-trade-bg-elevated px-2 py-1.5 text-[13px] uppercase text-trade-text-primary focus:border-trade-accent focus:outline-none"
          />
        </label>
      </div>
      <div className="mt-3 border-t border-trade-border-subtle pt-3">
        {ranked.length === 0 ? (
          <p className="text-[12px] italic text-trade-text-muted">
            Enter both an ECCN/USML and a destination to see suggestions.
          </p>
        ) : (
          <ol className="space-y-2 text-[12px]">
            {ranked.map((r, idx) => (
              <li
                key={`${r.entry.jurisdiction}-${r.entry.entry.id}`}
                className="rounded-md border border-trade-border-subtle bg-trade-bg-elevated px-3 py-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-trade-text-primary">
                    #{idx + 1} &middot; {r.entry.jurisdiction}
                  </span>
                  <span className="text-[10.5px] font-medium uppercase tracking-wider text-trade-text-muted">
                    score {r.score.toFixed(2)}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-trade-text-secondary">
                  {r.entry.entry.itemDescription}
                </p>
                <p className="mt-1 text-[10.5px] text-trade-text-muted">
                  {r.entry.entry.eccnOrUsmlGuess ?? "no classification"}{" "}
                  &middot; {r.entry.entry.destination} &middot;{" "}
                  {r.entry.entry.decision}
                </p>
              </li>
            ))}
          </ol>
        )}
        {jurisdiction !== "ALL" ? (
          <p className="mt-2 text-[11px] italic text-trade-text-muted">
            Suggestions are limited to {jurisdiction} because the jurisdiction
            filter is active.
          </p>
        ) : null}
      </div>
    </div>
  );
}
