import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Rocket } from "lucide-react";
import { auth } from "@/lib/auth";
import { resolveComplyUiVersion } from "@/lib/comply-ui-version.server";
import { NewMissionForm } from "./NewMissionForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "New mission — Caelex Comply",
  description:
    "Create a new mission. Group spacecraft by program, customer, or compliance scope.",
};

export default async function NewMissionPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?next=/dashboard/missions/new");
  }
  const ui = await resolveComplyUiVersion();
  if (ui === "v1") redirect("/dashboard");

  const sansFont =
    'var(--font-inter), -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif';
  const displayFont =
    'var(--font-inter), -apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif';

  return (
    <div
      className="mx-auto max-w-6xl px-6 py-8 sm:px-8"
      style={{ fontFamily: sansFont }}
    >
      <nav className="mb-5 flex items-center gap-2 text-[11px] font-medium tracking-wide text-slate-500">
        <Link
          href="/dashboard/missions"
          className="inline-flex items-center gap-1.5 text-slate-400 transition hover:text-slate-200"
        >
          <ArrowLeft className="h-3 w-3" />
          Missions
        </Link>
        <span aria-hidden className="text-slate-600">
          /
        </span>
        <span className="truncate text-slate-300">New mission</span>
      </nav>

      <header className="mb-8 flex flex-col gap-3 border-b border-white/[0.06] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/[0.08] px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-emerald-300 ring-1 ring-inset ring-emerald-500/20">
            <Rocket className="h-3 w-3" />
            New mission
          </div>
          <h1
            className="text-[28px] font-semibold text-slate-50"
            style={{
              fontFamily: displayFont,
              letterSpacing: "-0.022em",
              lineHeight: 1.15,
            }}
          >
            Create a new mission
          </h1>
          <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-slate-400">
            A mission groups one or more spacecraft serving the same operational
            program — constellations, single satellites, launch campaigns, or
            multi-mission hardware. Only the{" "}
            <em className="not-italic font-medium text-slate-300">name</em> is
            required; you can edit everything else later and assign spacecraft
            from the mission&apos;s detail page.
          </p>
        </div>
      </header>

      <NewMissionForm />
    </div>
  );
}
