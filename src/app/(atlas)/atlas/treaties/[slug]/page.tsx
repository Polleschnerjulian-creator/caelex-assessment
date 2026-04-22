import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ScrollText,
  Calendar,
  Scale,
  Globe2,
  ArrowLeft,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import {
  TREATY_SLUGS,
  resolveTreatyBySlug,
  slugForTreatyId,
  type TreatySlug,
} from "@/data/treaties";
import {
  getLegalSourceById,
  type LegalSource,
  type KeyProvision,
} from "@/data/legal-sources";
import { SPACE_LAW_COUNTRY_CODES } from "@/lib/space-law-types";
import { JURISDICTION_DATA } from "@/data/national-space-laws";
import { BookmarkButton } from "../../_components/BookmarkButton";

/**
 * /atlas/treaties/[slug] — per-treaty deep-dive.
 *
 * Static generation: one page per entry in TREATY_SLUGS. Any unknown
 * slug returns notFound(). Data is sourced from intl.ts via
 * resolveTreatyBySlug — a single source of truth shared with the hub.
 */

export function generateStaticParams() {
  return Object.keys(TREATY_SLUGS).map((slug) => ({ slug }));
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const treaty = resolveTreatyBySlug(slug);
  if (!treaty) {
    return { title: "Treaty not found — Atlas" };
  }
  return {
    title: `${treaty.title_en} — Atlas`,
    description:
      treaty.scope_description ??
      treaty.key_provisions[0]?.summary ??
      "International space law instrument.",
  };
}

// ─── Helpers ────────────────────────────────────────────────────────

function formatYear(date?: string): string {
  if (!date) return "";
  return date.slice(0, 4);
}

function formatDate(date?: string): string {
  if (!date) return "—";
  try {
    return new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return date;
  }
}

interface RatificationBuckets {
  parties: string[];
  signatories: string[];
  nonParties: string[];
}

function buildRatificationBuckets(treaty: LegalSource): RatificationBuckets {
  const parties = treaty.applies_to_jurisdictions ?? [];
  const signatories = treaty.signed_by_jurisdictions ?? [];
  const tracked = SPACE_LAW_COUNTRY_CODES as readonly string[];
  const partySet = new Set(parties);
  const sigSet = new Set(signatories);
  const nonParties = tracked.filter(
    (code) => !partySet.has(code) && !sigSet.has(code),
  );
  return { parties, signatories, nonParties };
}

function countryName(code: string): string {
  const data = JURISDICTION_DATA.get(
    code as Parameters<typeof JURISDICTION_DATA.get>[0],
  );
  return data?.countryName ?? code;
}

function flagFor(code: string): string {
  const data = JURISDICTION_DATA.get(
    code as Parameters<typeof JURISDICTION_DATA.get>[0],
  );
  return data?.flagEmoji ?? "";
}

// ─── Sub-components ─────────────────────────────────────────────────

function RatificationBucket({
  label,
  codes,
  tone,
}: {
  label: string;
  codes: string[];
  tone: "emerald" | "amber" | "muted";
}) {
  const toneClasses = {
    emerald: {
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      dot: "bg-emerald-500",
      text: "text-emerald-800",
    },
    amber: {
      bg: "bg-amber-50",
      border: "border-amber-200",
      dot: "bg-amber-500",
      text: "text-amber-800",
    },
    muted: {
      bg: "bg-[var(--atlas-bg-surface-muted)]",
      border: "border-[var(--atlas-border)]",
      dot: "bg-gray-400",
      text: "text-[var(--atlas-text-secondary)]",
    },
  }[tone];

  return (
    <div
      className={`rounded-xl border ${toneClasses.border} ${toneClasses.bg} p-4`}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-2 h-2 rounded-full ${toneClasses.dot}`} />
        <span
          className={`text-[10px] font-semibold tracking-wider uppercase ${toneClasses.text}`}
        >
          {label}
        </span>
        <span className="ml-auto text-[11px] font-mono text-[var(--atlas-text-muted)]">
          {codes.length}
        </span>
      </div>
      {codes.length === 0 ? (
        <p className="text-[11px] text-[var(--atlas-text-faint)] italic">
          No tracked jurisdictions in this bucket.
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {codes.map((code) => (
            <Link
              key={code}
              href={`/atlas/jurisdictions/${code.toLowerCase()}`}
              className="inline-flex items-center gap-1 rounded bg-[var(--atlas-bg-surface)] border border-[var(--atlas-border)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--atlas-text-secondary)] hover:border-emerald-500 hover:text-emerald-800 transition-colors"
              title={countryName(code)}
            >
              <span aria-hidden="true">{flagFor(code)}</span>
              <span className="font-mono">{code}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function ProvisionCard({
  provision,
  index,
}: {
  provision: KeyProvision;
  index: number;
}) {
  const num = String(index + 1).padStart(2, "0");
  return (
    <div className="rounded-xl border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] p-4 shadow-sm hover:border-emerald-500 hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-emerald-600 tracking-wider">
            {num}
          </span>
          <span className="text-[11px] font-mono font-semibold text-[var(--atlas-text-secondary)]">
            {provision.section}
          </span>
        </div>
      </div>
      <h3 className="text-[13px] font-semibold text-[var(--atlas-text-primary)] leading-snug mb-2">
        {provision.title}
      </h3>
      <p className="text-[11px] text-[var(--atlas-text-secondary)] leading-relaxed mb-3">
        {provision.summary}
      </p>
      {provision.complianceImplication ? (
        <div className="mt-3 pt-3 border-t border-[var(--atlas-border-subtle)]">
          <div className="text-[9px] font-semibold tracking-wider uppercase text-emerald-700 mb-1">
            Compliance implication
          </div>
          <p className="text-[10.5px] text-[var(--atlas-text-secondary)] leading-relaxed">
            {provision.complianceImplication}
          </p>
        </div>
      ) : null}
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────

export default async function TreatyDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const treaty = resolveTreatyBySlug(slug);
  if (!treaty) {
    notFound();
  }

  const typedSlug = slug as TreatySlug;
  const buckets = buildRatificationBuckets(treaty);
  const yearEnacted = formatYear(treaty.date_enacted);
  const yearInForce = formatYear(treaty.date_in_force);
  const related = treaty.related_sources
    .map((id) => {
      const source = getLegalSourceById(id);
      if (!source) return null;
      const relatedSlug = slugForTreatyId(id);
      if (!relatedSlug) return null;
      return { source, slug: relatedSlug };
    })
    .filter((x): x is { source: LegalSource; slug: TreatySlug } => x !== null);

  const isTreaty = treaty.type === "international_treaty";
  const statusLabel =
    treaty.status === "in_force"
      ? "In Force"
      : treaty.status.replace(/_/g, " ").toUpperCase();

  return (
    <div className="flex flex-col h-full min-h-screen bg-[var(--atlas-bg-page)] p-4 gap-3">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[11px] text-[var(--atlas-text-muted)]">
        <Link
          href="/atlas/treaties"
          className="inline-flex items-center gap-1 hover:text-emerald-700 transition-colors"
        >
          <ArrowLeft className="h-3 w-3" strokeWidth={2} />
          All treaties
        </Link>
        <span className="text-[var(--atlas-text-faint)]">/</span>
        <span className="font-mono text-[var(--atlas-text-faint)]">
          {typedSlug}
        </span>
      </div>

      {/* Hero */}
      <div className="rounded-xl border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] shadow-sm p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="rounded-md bg-emerald-50 p-2">
              <ScrollText
                className="h-5 w-5 text-emerald-600"
                strokeWidth={1.5}
              />
            </div>
            <div>
              <div className="text-[10px] font-semibold tracking-wider uppercase text-emerald-700">
                {isTreaty ? "UN Space Treaty" : "International Instrument"}
              </div>
              <div className="text-[10px] text-[var(--atlas-text-faint)] font-mono">
                {treaty.id}
                {treaty.un_reference ? ` · ${treaty.un_reference}` : ""}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded px-2 py-1 text-[9px] font-medium tracking-wider uppercase border bg-emerald-50 border-emerald-200 text-emerald-700">
              {statusLabel}
            </span>
            <BookmarkButton
              item={{
                id: `treaty:${treaty.id}`,
                type: "source",
                title: treaty.title_en,
                subtitle: treaty.un_reference
                  ? `${treaty.id} · ${treaty.un_reference}`
                  : treaty.id,
                href: `/atlas/treaties/${slug}`,
              }}
            />
          </div>
        </div>
        <h1 className="text-[22px] font-semibold tracking-tight text-[var(--atlas-text-primary)] leading-snug mb-3 max-w-4xl">
          {treaty.title_en}
        </h1>
        {treaty.scope_description ? (
          <p className="text-[12px] text-[var(--atlas-text-secondary)] leading-relaxed max-w-3xl">
            {treaty.scope_description}
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap items-center gap-4 pt-4 border-t border-[var(--atlas-border-subtle)]">
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--atlas-text-secondary)]">
            <Calendar
              className="h-3 w-3 text-[var(--atlas-text-faint)]"
              strokeWidth={1.5}
            />
            <span className="font-medium">Adopted:</span>
            <span>{formatDate(treaty.date_enacted)}</span>
          </div>
          {treaty.date_in_force ? (
            <div className="flex items-center gap-1.5 text-[11px] text-[var(--atlas-text-secondary)]">
              <Calendar
                className="h-3 w-3 text-[var(--atlas-text-faint)]"
                strokeWidth={1.5}
              />
              <span className="font-medium">Entry into force:</span>
              <span>{formatDate(treaty.date_in_force)}</span>
            </div>
          ) : null}
          {treaty.source_url ? (
            <a
              href={treaty.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 hover:text-emerald-800"
            >
              Primary source (UNOOSA)
              <ExternalLink className="h-3 w-3" strokeWidth={2} />
            </a>
          ) : null}
        </div>
      </div>

      {/* Ratification buckets */}
      {isTreaty ? (
        <div className="rounded-xl border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <Globe2
              className="h-3.5 w-3.5 text-emerald-600"
              strokeWidth={1.5}
            />
            <span className="text-[11px] font-semibold tracking-wider uppercase text-[var(--atlas-text-muted)]">
              Ratification status
            </span>
            <span className="ml-auto text-[10px] text-[var(--atlas-text-faint)]">
              across {SPACE_LAW_COUNTRY_CODES.length} Atlas-tracked European
              jurisdictions
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <RatificationBucket
              label="State Parties"
              codes={buckets.parties}
              tone="emerald"
            />
            <RatificationBucket
              label="Signatories only"
              codes={buckets.signatories}
              tone="amber"
            />
            <RatificationBucket
              label="Not Parties"
              codes={buckets.nonParties}
              tone="muted"
            />
          </div>
          <p className="mt-3 text-[10px] text-[var(--atlas-text-faint)] leading-relaxed">
            Buckets reflect Atlas&apos;s indexed European jurisdictions only.
            Global ratification numbers (e.g. 114 Parties to the OST) include
            jurisdictions outside Atlas&apos;s European scope.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <Scale className="h-3.5 w-3.5 text-emerald-600" strokeWidth={1.5} />
            <span className="text-[11px] font-semibold tracking-wider uppercase text-[var(--atlas-text-muted)]">
              Applies to
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {buckets.parties.map((code) => (
              <Link
                key={code}
                href={`/atlas/jurisdictions/${code.toLowerCase()}`}
                className="inline-flex items-center gap-1 rounded bg-[var(--atlas-bg-surface-muted)] border border-[var(--atlas-border)] px-2 py-0.5 text-[10px] font-medium text-[var(--atlas-text-secondary)] hover:border-emerald-500 hover:text-emerald-800 transition-colors"
              >
                <span aria-hidden="true">{flagFor(code)}</span>
                <span className="font-mono">{code}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Provisions grid */}
      {treaty.key_provisions.length > 0 ? (
        <section>
          <div className="mb-3 mt-2">
            <div className="text-[10px] font-semibold tracking-wider uppercase text-[var(--atlas-text-muted)] mb-1">
              Key Provisions
            </div>
            <h2 className="text-[15px] font-semibold tracking-tight text-[var(--atlas-text-primary)]">
              Article-level breakdown
            </h2>
            <p className="text-[11px] text-[var(--atlas-text-muted)] mt-1 max-w-3xl">
              Editorial summaries of the provisions most relevant to
              authorization, registration, and liability under{" "}
              {yearEnacted || "this instrument"}. Compliance implications show
              how each article affects national operators today.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {treaty.key_provisions.map((p, i) => (
              <ProvisionCard key={i} provision={p} index={i} />
            ))}
          </div>
        </section>
      ) : null}

      {/* Related treaties */}
      {related.length > 0 ? (
        <section className="rounded-xl border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles
              className="h-3.5 w-3.5 text-emerald-600"
              strokeWidth={1.5}
            />
            <span className="text-[11px] font-semibold tracking-wider uppercase text-[var(--atlas-text-muted)]">
              Related instruments
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {related.map(({ source, slug: relatedSlug }) => (
              <Link
                key={source.id}
                href={`/atlas/treaties/${relatedSlug}`}
                className="flex items-start gap-3 rounded-lg border border-[var(--atlas-border-subtle)] hover:border-emerald-500 hover:bg-emerald-50/40 p-3 transition-colors"
              >
                <ScrollText
                  className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0 mt-0.5"
                  strokeWidth={1.5}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-semibold text-[var(--atlas-text-primary)] line-clamp-2 leading-snug">
                    {source.title_en}
                  </div>
                  <div className="text-[10px] text-[var(--atlas-text-muted)] font-mono mt-0.5">
                    {yearInForce || formatYear(source.date_enacted)}
                    {source.un_reference ? ` · ${source.un_reference}` : ""}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* Footer */}
      <div className="rounded-xl border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] shadow-sm p-4 mt-2">
        <p className="text-[10px] text-[var(--atlas-text-muted)] leading-relaxed max-w-3xl">
          <span className="font-semibold text-[var(--atlas-text-secondary)]">
            Not legal advice.
          </span>{" "}
          Editorial summaries on this page are non-authoritative and intended
          for regulatory-intelligence purposes only. Refer to the UNOOSA
          depositary (linked above) for the authoritative text, signatures, and
          ratification dates. Last verified {formatDate(treaty.last_verified)}.
        </p>
      </div>
    </div>
  );
}
