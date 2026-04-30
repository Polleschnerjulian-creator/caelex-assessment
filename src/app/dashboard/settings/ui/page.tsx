import Link from "next/link";
import { ArrowLeft, CheckCircle2, Sparkles } from "lucide-react";
import {
  resolveComplyUiVersion,
  type ComplyUiVersion,
} from "@/lib/comply-ui-version.server";
import { setComplyUiVersion } from "./actions";

export const metadata = {
  title: "Comply UI version — Settings",
  description: "Switch between Caelex Comply v1 (legacy) and v2 (redesign).",
};

interface PageProps {
  searchParams: Promise<{ changed?: string }>;
}

export default async function ComplyUiSettingsPage({
  searchParams,
}: PageProps) {
  const sp = await searchParams;
  const justChanged = sp.changed === "1";
  const current: ComplyUiVersion = await resolveComplyUiVersion();

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Link
        href="/dashboard/settings"
        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Settings
      </Link>

      <header className="mb-8">
        <div className="mb-3 flex items-center gap-3">
          <Sparkles className="h-6 w-6 text-emerald-500" />
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
            Comply UI version
          </h1>
        </div>
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          We&apos;re rebuilding the Comply (operator) workspace into a faster,
          more focused experience. While we ship the new surfaces, you can opt
          in early — or stay on the proven legacy view. Switching back is a
          single click. This setting only affects the dashboard at{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs dark:bg-slate-800">
            /dashboard
          </code>
          ; Atlas, Pharos, and Assure are unaffected.
        </p>
      </header>

      {justChanged ? (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-700/50 dark:bg-emerald-950/30 dark:text-emerald-100">
          <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <div>
            Saved. You&apos;re now on{" "}
            <strong>Comply {current.toUpperCase()}</strong>. Reload any
            dashboard tab to see the change.
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <VersionCard
          version="v1"
          current={current}
          title="Legacy (v1)"
          tag="Stable"
          description="The Comply experience you've been using. 96 routes, 15 modules, the existing sidebar. Nothing changes."
          recommended="Recommended for production work today."
          accent="slate"
        />
        <VersionCard
          version="v2"
          current={current}
          title="Redesign (v2)"
          tag="Preview"
          description="The new shell — Today inbox, Cmd-K palette, AstraProposal queue, Bloomberg-density toggle. Surfaces ship over the next 12 weeks."
          recommended="For pilot users who want to follow along."
          accent="emerald"
        />
      </div>

      <p className="mt-6 text-xs leading-relaxed text-slate-500 dark:text-slate-500">
        Your choice is stored on your account and synced across devices. If your
        organization sets a default later, your personal choice wins.
      </p>
    </div>
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
  const ring = active
    ? accent === "emerald"
      ? "ring-2 ring-emerald-500 border-emerald-300 dark:border-emerald-600"
      : "ring-2 ring-slate-500 border-slate-300 dark:border-slate-600"
    : "border-slate-200 dark:border-slate-800";
  const tagBg =
    accent === "emerald"
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
      : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";

  return (
    <form
      action={setComplyUiVersion}
      className={`flex flex-col gap-4 rounded-xl border bg-white p-5 transition dark:bg-slate-900 ${ring}`}
    >
      <input type="hidden" name="version" value={version} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
            {title}
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {recommended}
          </p>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${tagBg}`}
        >
          {tag}
        </span>
      </div>
      <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
        {description}
      </p>
      <div className="mt-auto">
        {active ? (
          <div className="inline-flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            Currently active
          </div>
        ) : (
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50 dark:hover:bg-slate-700"
          >
            Switch to {title}
          </button>
        )}
      </div>
    </form>
  );
}
