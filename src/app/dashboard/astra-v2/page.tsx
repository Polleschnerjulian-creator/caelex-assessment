import { redirect } from "next/navigation";
import Link from "next/link";
import { Bot, ArrowRight } from "lucide-react";
import { auth } from "@/lib/auth";
import { resolveComplyUiVersion } from "@/lib/comply-ui-version.server";
import { getAstraToolDefinitions } from "@/lib/comply-v2/actions/astra-bridge.server";
import { Badge } from "@/components/ui/v2/badge";
import { Button } from "@/components/ui/v2/button";
import { AstraV2Chat } from "./AstraV2Chat";

export const metadata = {
  title: "Astra V2 — Caelex Comply",
  description:
    "AI compliance copilot with the V2 action layer. High-impact actions go through the Proposal trust layer.",
};

/**
 * Comply V2 Astra surface — isolated chat that uses the new
 * defineAction() registry. Existing /dashboard/astra (V1) is
 * untouched. Atlas-Astra and Pharos-Astra are unaffected.
 */
export default async function AstraV2Page() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?next=/dashboard/astra-v2");
  }
  const ui = await resolveComplyUiVersion();
  if (ui === "v1") {
    redirect("/dashboard/astra");
  }

  const tools = getAstraToolDefinitions();
  const apiKeyConfigured = Boolean(process.env.ANTHROPIC_API_KEY);

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <header className="mb-6 flex items-end justify-between gap-6">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            <Bot className="h-3.5 w-3.5" />
            Astra V2
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            Compliance copilot — preview
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            Astra V2 talks to the new action layer. High-impact tools (mark
            attested, request evidence) write proposals to your review queue
            instead of executing directly.
          </p>
        </div>
        <Button variant="outline" asChild size="sm">
          <Link href="/dashboard/proposals">
            Open proposals
            <ArrowRight />
          </Link>
        </Button>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Badge variant="default">{tools.length} tools registered</Badge>
        {apiKeyConfigured ? (
          <Badge variant="attested">API key configured</Badge>
        ) : (
          <Badge variant="expired">ANTHROPIC_API_KEY missing</Badge>
        )}
        <span>
          Conversations are not persisted (Phase 1 demo). Refresh to start over.
        </span>
      </div>

      {!apiKeyConfigured ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
          <strong>ANTHROPIC_API_KEY is not set.</strong> Add it to your Vercel
          environment to enable Astra V2. Without it, sending a message will
          return an error.
        </div>
      ) : (
        <AstraV2Chat />
      )}
    </div>
  );
}
