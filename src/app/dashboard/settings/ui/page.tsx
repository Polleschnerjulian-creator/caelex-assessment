import Link from "next/link";
import { ArrowLeft, CheckCircle2, Sparkles } from "lucide-react";
import {
  resolveComplyUiVersion,
  type ComplyUiVersion,
} from "@/lib/comply-ui-version.server";
import { getDensity, type Density } from "@/lib/comply-v2/density.server";
import { setComplyUiVersion, setDensity } from "./actions";

export const metadata = {
  title: "Comply UI version — Settings",
  description: "Switch between Caelex Comply v1 (legacy) and v2 (redesign).",
};

interface PageProps {
  searchParams: Promise<{ changed?: string; density?: string }>;
}

export default async function ComplyUiSettingsPage({
  searchParams,
}: PageProps) {
  const sp = await searchParams;
  const justChanged = sp.changed === "1";
  const densityChanged = sp.density === "1";
  const [current, currentDensity] = await Promise.all([
    resolveComplyUiVersion(),
    getDensity(),
  ]);
  const _ui: ComplyUiVersion = current;
  void _ui;

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Link
        href="/dashboard/settings"
        className="mb-4 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-slate-500 transition hover:text-emerald-400"
      >
        <ArrowLeft className="h-3 w-3" />
        BACK TO SETTINGS
      </Link>

      <header className="mb-6 border-b border-white/[0.06] pb-4">
        <div className="mb-1.5 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-400">
          <Sparkles className="h-3 w-3" />
          SETTINGS · UI
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-100">
          Comply UI version
        </h1>
        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-500">
          Comply v2 is the default Comply experience. The legacy v1 view is kept
          available as an emergency fallback — switch back if v2 is broken for
          you, otherwise stay on v2. This setting only affects the dashboard at{" "}
          <code className="rounded bg-white/[0.04] px-1 py-0.5 font-mono text-[11px] text-emerald-300 ring-1 ring-inset ring-white/10">
            /dashboard
          </code>
          ; Atlas, Pharos, and Assure are unaffected.
        </p>
      </header>

      {justChanged ? (
        <div className="palantir-stripe-emerald mb-6 flex items-start gap-3 rounded-md bg-emerald-500/[0.08] p-3 text-[12px] text-emerald-100 ring-1 ring-inset ring-emerald-500/30">
          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div>
            Saved. You&apos;re now on{" "}
            <strong className="font-mono uppercase tracking-wider">
              COMPLY {current.toUpperCase()}
            </strong>
            . Reload any dashboard tab to see the change.
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <VersionCard
          version="v2"
          current={current}
          title="Comply (v2)"
          tag="Default"
          description="The current Comply experience — Posture overview, Today inbox, Triage queue, AstraProposal trust layer, Cmd-K command palette."
          recommended="Recommended for everyone."
          accent="emerald"
        />
        <VersionCard
          version="v1"
          current={current}
          title="Legacy (v1)"
          tag="Fallback"
          description="The pre-redesign client-side dashboard. Kept as an emergency fallback only — most surfaces have been rebuilt and improved in v2."
          recommended="Use only if v2 is broken for you."
          accent="slate"
        />
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-slate-500">
        Your choice is stored on your account and synced across devices. If your
        organization sets a default later, your personal choice wins.
      </p>

      <div className="mt-10 border-t border-white/[0.06] pt-6">
        <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-slate-300">
          DENSITY
        </h2>
        <p className="mt-1 max-w-2xl text-xs text-slate-500">
          How tightly do you want the V2 surfaces to render? Affects card
          padding, list-row heights, and font sizes across /dashboard/today,
          /dashboard/triage, and item detail pages.
        </p>
        {densityChanged ? (
          <div className="palantir-stripe-emerald mt-4 flex items-start gap-3 rounded-md bg-emerald-500/[0.08] p-3 text-[11px] text-emerald-100 ring-1 ring-inset ring-emerald-500/30">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            Density saved. Reload any V2 page to see the change.
          </div>
        ) : null}
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <DensityCard
            density="cozy"
            current={currentDensity}
            title="Cozy"
            description="Linear-spacious. Generous padding, comfortable reading distance."
          />
          <DensityCard
            density="compact"
            current={currentDensity}
            title="Compact"
            description="Middle ground. Best for power-users mixing reading and scanning."
          />
          <DensityCard
            density="dense"
            current={currentDensity}
            title="Dense"
            description="Bloomberg-tight. Maximum info per viewport. Mission-Control style."
          />
        </div>
      </div>
    </div>
  );
}

function DensityCard({
  density,
  current,
  title,
  description,
}: {
  density: Density;
  current: Density;
  title: string;
  description: string;
}) {
  const active = density === current;
  return (
    <form
      action={setDensity}
      className={`flex flex-col gap-2 rounded-md p-3 transition palantir-surface ${
        active
          ? "ring-1 ring-inset ring-emerald-500/40 palantir-stripe-emerald"
          : "hover:bg-white/[0.03]"
      }`}
    >
      <input type="hidden" name="density" value={density} />
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-slate-200">
          {title}
        </h3>
        {active ? (
          <span className="inline-flex items-center gap-1 font-mono text-[9px] font-medium uppercase tracking-wider text-emerald-300">
            <CheckCircle2 className="h-3 w-3" />
            ACTIVE
          </span>
        ) : null}
      </div>
      <p className="text-[11px] leading-relaxed text-slate-500">
        {description}
      </p>
      {!active ? (
        <button
          type="submit"
          className="mt-auto inline-flex items-center justify-center rounded bg-white/[0.04] px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-wider text-slate-200 ring-1 ring-inset ring-white/10 transition hover:bg-white/[0.08]"
        >
          USE {title.toUpperCase()}
        </button>
      ) : null}
    </form>
  );
}

function VersionCard({
  version,
  current,
  title,
  tag,
  description,
  recommended,
  accent,
}: {
  version: ComplyUiVersion;
  current: ComplyUiVersion;
  title: string;
  tag: string;
  description: string;
  recommended: string;
  accent: "slate" | "emerald";
}) {
  const active = current === version;
  const stripe = active
    ? accent === "emerald"
      ? "palantir-stripe-emerald ring-1 ring-inset ring-emerald-500/40"
      : "ring-1 ring-inset ring-slate-500/40"
    : "";
  const tagClasses =
    accent === "emerald"
      ? "bg-emerald-500/10 text-emerald-300 ring-1 ring-inset ring-emerald-500/30"
      : "bg-white/[0.04] text-slate-300 ring-1 ring-inset ring-white/10";

  return (
    <form
      action={setComplyUiVersion}
      className={`palantir-surface flex flex-col gap-3 rounded-md p-4 transition ${stripe}`}
    >
      <input type="hidden" name="version" value={version} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[14px] font-semibold text-slate-100">{title}</h2>
          <p className="mt-0.5 text-[11px] text-slate-500">{recommended}</p>
        </div>
        <span
          className={`rounded-sm px-1.5 py-0.5 font-mono text-[9px] font-medium uppercase tracking-wider ${tagClasses}`}
        >
          {tag}
        </span>
      </div>
      <p className="text-[12px] leading-relaxed text-slate-400">
        {description}
      </p>
      <div className="mt-auto">
        {active ? (
          <div className="inline-flex items-center gap-1.5 font-mono text-[10px] font-medium uppercase tracking-wider text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            CURRENTLY ACTIVE
          </div>
        ) : (
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded bg-white/[0.04] px-3 py-1.5 font-mono text-[10px] font-medium uppercase tracking-wider text-slate-200 ring-1 ring-inset ring-white/10 transition hover:bg-white/[0.08]"
          >
            SWITCH TO {title.toUpperCase()}
          </button>
        )}
      </div>
    </form>
  );
}
