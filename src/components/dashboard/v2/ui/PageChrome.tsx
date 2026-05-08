/**
 * Sprint B — V2 page chrome primitives.
 *
 * Shared design-language building blocks for V2 pages: page header,
 * card containers, section headers, status pills, breadcrumb, empty
 * state. Extracted from the missions detail/list refactor (Sprint
 * M3.5) so every page gets the same surface depth, typography, and
 * spacing without copy-paste drift.
 *
 * Pattern principles (cf. Sprint M3.5 commit message):
 *   - Cards = layered surfaces (border + gradient + inset highlight),
 *     not flat outlined boxes.
 *   - Labels = small-caps tracking-[0.12em] semibold text-slate-400.
 *   - Headers = 28px display + chip badge + plain prose description.
 *   - Status = colored dot + tinted ring + subtle background, never
 *     a fully-tinted pill.
 *
 * All components are server-safe (no client-only React APIs). Use
 * directly in page.tsx files; no "use client" needed unless the
 * caller adds it.
 */

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  HelpCircle as HelpCircleIcon,
} from "lucide-react";
import { HelpTooltip } from "./HelpTooltip";

// ─── Page header ─────────────────────────────────────────────────────────

const SANS_FONT =
  'var(--font-inter), -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif';
const DISPLAY_FONT =
  'var(--font-inter), -apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif';

export interface BreadcrumbCrumb {
  label: string;
  href?: string;
}

export function PageBreadcrumb({ crumbs }: { crumbs: BreadcrumbCrumb[] }) {
  return (
    <nav className="mb-5 flex items-center gap-2 text-[11px] font-medium tracking-wide text-slate-500">
      {crumbs.map((c, i) => (
        <React.Fragment key={`${c.label}-${i}`}>
          {i > 0 ? (
            <span aria-hidden className="text-slate-600">
              /
            </span>
          ) : null}
          {c.href && i < crumbs.length - 1 ? (
            <Link
              href={c.href}
              className={`inline-flex items-center gap-1.5 transition hover:text-slate-200 ${
                i === 0 ? "text-slate-400" : "text-slate-400"
              }`}
            >
              {i === 0 ? <ArrowLeft className="h-3 w-3" /> : null}
              {c.label}
            </Link>
          ) : (
            <span className="truncate text-slate-300">{c.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

export interface PageHeaderProps {
  /** The small uppercase eyebrow above the title (e.g. "Mission portfolio"). */
  eyebrow?: string;
  /** Optional icon for the eyebrow chip. */
  eyebrowIcon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  /** Tone of the eyebrow chip. Defaults to emerald. */
  eyebrowTone?: "emerald" | "cyan" | "amber" | "slate" | "violet";
  /** The main page title. */
  title: string;
  /** Sprint UF1 — optional glossary term key. When set, a (?) icon
   *  appears next to the title with a hover-card definition. Lookup
   *  is via the central GLOSSARY in HelpTooltip.tsx — see entries
   *  there. */
  helpTerm?: string;
  /** Optional subtitle / description below the title. */
  description?: React.ReactNode;
  /** Right-aligned actions (CTAs, stats, etc). */
  actions?: React.ReactNode;
}

export function PageHeader({
  eyebrow,
  eyebrowIcon: EyebrowIcon,
  eyebrowTone = "emerald",
  title,
  helpTerm,
  description,
  actions,
}: PageHeaderProps) {
  const eyebrowTones = {
    emerald: "bg-emerald-500/[0.08] text-emerald-300 ring-emerald-500/20",
    cyan: "bg-cyan-500/[0.08] text-cyan-300 ring-cyan-500/20",
    amber: "bg-amber-500/[0.08] text-amber-300 ring-amber-500/20",
    slate: "bg-white/[0.04] text-slate-300 ring-white/[0.06]",
    violet: "bg-violet-500/[0.08] text-violet-300 ring-violet-500/20",
  } as const;
  return (
    <header className="mb-8 flex flex-col gap-4 border-b border-white/[0.06] pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <div
            className={`mb-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] ring-1 ring-inset ${eyebrowTones[eyebrowTone]}`}
          >
            {EyebrowIcon ? <EyebrowIcon className="h-3 w-3" /> : null}
            {eyebrow}
          </div>
        ) : null}
        <h1
          className="flex items-center gap-2 truncate text-[28px] font-semibold text-slate-50"
          style={{
            fontFamily: DISPLAY_FONT,
            letterSpacing: "-0.022em",
            lineHeight: 1.15,
          }}
        >
          {helpTerm ? (
            <HelpTooltip term={helpTerm} showIcon={false}>
              <span>{title}</span>
            </HelpTooltip>
          ) : (
            title
          )}
          {helpTerm ? (
            <HelpTooltip term={helpTerm} showIcon={false}>
              <button
                type="button"
                aria-label={`What is ${title}?`}
                className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/[0.04] text-slate-500 transition hover:bg-white/[0.08] hover:text-slate-300"
              >
                <HelpCircleIcon className="h-3 w-3" />
              </button>
            </HelpTooltip>
          ) : null}
        </h1>
        {description ? (
          <div className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-slate-400">
            {description}
          </div>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-3">{actions}</div>
      ) : null}
    </header>
  );
}

// ─── Page container ──────────────────────────────────────────────────────

export function PageContainer({
  children,
  size = "wide",
}: {
  children: React.ReactNode;
  size?: "narrow" | "wide" | "full";
}) {
  const max =
    size === "narrow"
      ? "max-w-3xl"
      : size === "wide"
        ? "max-w-7xl"
        : "max-w-screen-2xl";
  return (
    <div
      className={`mx-auto ${max} px-6 py-8 sm:px-8`}
      style={{ fontFamily: SANS_FONT }}
    >
      {children}
    </div>
  );
}

// ─── Card ────────────────────────────────────────────────────────────────

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  /** Render a header strip on top of the card body. */
  header?: CardHeaderProps;
}

export interface CardHeaderProps {
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  trailing?: React.ReactNode;
}

export function Card({ children, className, header }: CardProps) {
  return (
    <section
      className={`overflow-hidden rounded-xl border border-white/[0.06] bg-gradient-to-b from-white/[0.025] to-white/[0.012] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ${className ?? ""}`}
    >
      {header ? <CardHeader {...header} /> : null}
      {children}
    </section>
  );
}

export function CardHeader({
  icon: Icon,
  title,
  subtitle,
  trailing,
}: CardHeaderProps) {
  return (
    <header className="flex items-start justify-between gap-3 border-b border-white/[0.05] bg-white/[0.012] px-5 py-3">
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
          {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-0.5 text-[12px] text-slate-400">{subtitle}</p>
        ) : null}
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </header>
  );
}

export function CardBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`px-5 py-5 ${className ?? ""}`}>{children}</div>;
}

// ─── Status pill ─────────────────────────────────────────────────────────

export type PillTone =
  | "emerald"
  | "amber"
  | "orange"
  | "rose"
  | "cyan"
  | "violet"
  | "slate";

const PILL_TONES: Record<
  PillTone,
  { bg: string; text: string; ring: string; dot: string }
> = {
  emerald: {
    bg: "bg-emerald-500/[0.08]",
    text: "text-emerald-300",
    ring: "ring-emerald-500/25",
    dot: "bg-emerald-400",
  },
  amber: {
    bg: "bg-amber-500/[0.08]",
    text: "text-amber-300",
    ring: "ring-amber-500/25",
    dot: "bg-amber-400",
  },
  orange: {
    bg: "bg-orange-500/[0.08]",
    text: "text-orange-300",
    ring: "ring-orange-500/25",
    dot: "bg-orange-400",
  },
  rose: {
    bg: "bg-rose-500/[0.08]",
    text: "text-rose-300",
    ring: "ring-rose-500/25",
    dot: "bg-rose-400",
  },
  cyan: {
    bg: "bg-cyan-500/[0.08]",
    text: "text-cyan-300",
    ring: "ring-cyan-500/25",
    dot: "bg-cyan-400",
  },
  violet: {
    bg: "bg-violet-500/[0.08]",
    text: "text-violet-300",
    ring: "ring-violet-500/25",
    dot: "bg-violet-400",
  },
  slate: {
    bg: "bg-white/[0.04]",
    text: "text-slate-400",
    ring: "ring-white/[0.06]",
    dot: "bg-slate-400",
  },
};

export function StatusPill({
  tone,
  children,
  size = "md",
}: {
  tone: PillTone;
  children: React.ReactNode;
  size?: "sm" | "md";
}) {
  const t = PILL_TONES[tone];
  const padding =
    size === "sm" ? "px-2 py-0.5 text-[10.5px]" : "px-2.5 py-1 text-[12px]";
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full font-medium ring-1 ring-inset ${t.bg} ${t.text} ${t.ring} ${padding}`}
    >
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${t.dot}`} />
      {children}
    </span>
  );
}

export function Chip({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full bg-white/[0.04] px-2 py-0.5 text-[11.5px] text-slate-300 ring-1 ring-inset ring-white/[0.06] ${className ?? ""}`}
    >
      {children}
    </span>
  );
}

export function CountBadge({
  count,
  tone = "slate",
}: {
  count: number;
  tone?: "rose" | "amber" | "slate";
}) {
  const tones = {
    rose: "bg-rose-500/10 text-rose-300 ring-rose-500/15",
    amber: "bg-amber-500/10 text-amber-300 ring-amber-500/15",
    slate: "bg-white/[0.04] text-slate-400 ring-white/[0.06]",
  } as const;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-semibold tabular-nums ring-1 ring-inset ${tones[tone]}`}
    >
      {count}
    </span>
  );
}

// ─── Stat tile ───────────────────────────────────────────────────────────

export function StatTile({
  label,
  value,
  icon: Icon,
  tone = "slate",
}: {
  label: string;
  value: number | string;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  tone?: "emerald" | "amber" | "rose" | "slate";
}) {
  const tones = {
    emerald: {
      icon: "text-emerald-400",
      iconBg: "bg-emerald-500/10 ring-emerald-500/15",
    },
    amber: {
      icon: "text-amber-400",
      iconBg: "bg-amber-500/10 ring-amber-500/15",
    },
    rose: { icon: "text-rose-400", iconBg: "bg-rose-500/10 ring-rose-500/15" },
    slate: {
      icon: "text-slate-400",
      iconBg: "bg-white/[0.04] ring-white/[0.06]",
    },
  } as const;
  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-gradient-to-b from-white/[0.025] to-white/[0.012] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          {label}
        </span>
        {Icon ? (
          <span
            className={`flex h-6 w-6 items-center justify-center rounded-md ring-1 ring-inset ${tones[tone].iconBg}`}
          >
            <Icon className={`h-3 w-3 ${tones[tone].icon}`} />
          </span>
        ) : null}
      </div>
      <div className="mt-3 text-[26px] font-semibold tabular-nums leading-none tracking-tight text-slate-50">
        {value}
      </div>
    </div>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────

export function EmptyState({
  icon: Icon,
  title,
  description,
  cta,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  title: string;
  description?: React.ReactNode;
  cta?: { label: string; href: string };
}) {
  return (
    <div className="px-5 py-10 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.04] ring-1 ring-inset ring-white/[0.06]">
        <Icon className="h-5 w-5 text-slate-500" />
      </div>
      <h3 className="text-[14px] font-semibold text-slate-100">{title}</h3>
      {description ? (
        <p className="mx-auto mt-1.5 max-w-md text-[12.5px] leading-relaxed text-slate-400">
          {description}
        </p>
      ) : null}
      {cta ? (
        <Link
          href={cta.href}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 py-2 text-[13px] font-semibold text-emerald-950 transition hover:bg-emerald-400"
        >
          {cta.label}
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      ) : null}
    </div>
  );
}

// ─── Primary CTA button (Link) ───────────────────────────────────────────

export function PrimaryActionLink({
  href,
  children,
  icon: Icon,
}: {
  href: string;
  children: React.ReactNode;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}) {
  return (
    <Link
      href={href}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 py-2 text-[13px] font-semibold text-emerald-950 transition hover:bg-emerald-400"
    >
      {Icon ? <Icon className="h-3.5 w-3.5" strokeWidth={2.2} /> : null}
      {children}
    </Link>
  );
}

export function SecondaryActionLink({
  href,
  children,
  icon: Icon,
}: {
  href: string;
  children: React.ReactNode;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}) {
  return (
    <Link
      href={href}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.025] px-3.5 py-2 text-[13px] font-medium text-slate-200 transition hover:border-white/[0.14] hover:bg-white/[0.05]"
    >
      {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
      {children}
    </Link>
  );
}
