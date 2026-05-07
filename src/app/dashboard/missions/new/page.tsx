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
      className="mx-auto max-w-3xl px-6 py-8"
      style={{ fontFamily: sansFont }}
    >
      <nav className="mb-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-slate-500">
        <Link
          href="/dashboard/missions"
          className="inline-flex items-center gap-1 transition hover:text-emerald-300"
        >
          <ArrowLeft className="h-3 w-3" />
          Missions
        </Link>
        <span aria-hidden>·</span>
        <span className="truncate text-slate-300">New mission</span>
      </nav>

      <header className="mb-6 border-b border-white/[0.06] pb-4">
        <div className="mb-1.5 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-400">
          <Rocket className="h-3 w-3" />
          NEW MISSION
        </div>
        <h1
          className="text-[24px] font-semibold text-slate-100"
          style={{
            fontFamily: displayFont,
            letterSpacing: "-0.022em",
            lineHeight: 1.15,
          }}
        >
          Create a new mission
        </h1>
        <p className="mt-1.5 max-w-xl text-[13px] text-slate-400">
          A mission groups one or more spacecraft serving the same operational
          program. You can assign spacecraft after creating the mission. All
          fields except <em>name</em> are optional and editable later.
        </p>
      </header>

      <NewMissionForm />
    </div>
  );
}
