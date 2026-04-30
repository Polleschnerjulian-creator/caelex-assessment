import { redirect } from "next/navigation";
import Link from "next/link";
import { Bot, Plus, MessageSquare, Trash2 } from "lucide-react";
import { auth } from "@/lib/auth";
import { resolveComplyUiVersion } from "@/lib/comply-ui-version.server";
import { getAstraToolDefinitions } from "@/lib/comply-v2/actions/astra-bridge.server";
import {
  listConversations,
  loadConversation,
} from "@/lib/comply-v2/conversation-service.server";
import { Badge } from "@/components/ui/v2/badge";
import { AstraV2Chat } from "./AstraV2Chat";
import {
  createNewConversation,
  archiveConversationAction,
} from "./server-actions";

export const metadata = {
  title: "Astra V2 — Caelex Comply",
  description:
    "AI compliance copilot with the V2 action layer. High-impact actions go through the Proposal trust layer.",
};

// Always render fresh after revalidatePath() from server actions.
export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ c?: string }>;
}

/**
 * Comply V2 Astra surface — persisted chat with sidebar history.
 *
 * URL `?c=<id>` selects a conversation. Without it, the chat is in
 * "scratchpad" mode (ephemeral, no DB writes) — same UX as before
 * Phase 1 Day 5. Sending the first message in scratchpad mode does
 * NOT auto-create a conversation; users explicitly click "New chat"
 * to persist. This avoids junk rows from accidental visits.
 */
export default async function AstraV2Page({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?next=/dashboard/astra-v2");
  }
  const ui = await resolveComplyUiVersion();
  if (ui === "v1") {
    redirect("/dashboard/astra");
  }

  const sp = await searchParams;
  const activeConversationId = sp.c;

  const [tools, conversations, activeConv] = await Promise.all([
    Promise.resolve(getAstraToolDefinitions()),
    listConversations(session.user.id),
    activeConversationId
      ? loadConversation(activeConversationId, session.user.id)
      : Promise.resolve(null),
  ]);

  const apiKeyConfigured = Boolean(process.env.ANTHROPIC_API_KEY);

  // If the user requested a specific conversation but it doesn't
  // exist (or isn't theirs), bounce back to the scratchpad.
  if (activeConversationId && !activeConv) {
    redirect("/dashboard/astra-v2");
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-80px)] max-w-screen-2xl gap-6 px-6 py-6">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col lg:flex">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Conversations
          </div>
          <form action={createNewConversation}>
            <button
              type="submit"
              className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/60"
            >
              <Plus className="h-3 w-3" />
              New
            </button>
          </form>
        </div>
        <nav className="flex-1 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1.5 dark:border-slate-800 dark:bg-slate-900">
          {conversations.length === 0 ? (
            <p className="px-2 py-4 text-center text-xs text-slate-400 dark:text-slate-500">
              No saved chats yet.
              <br />
              Click <strong>New</strong> to start one.
            </p>
          ) : (
            <ul className="space-y-0.5">
              {conversations.map((c) => {
                const isActive = c.id === activeConversationId;
                return (
                  <li key={c.id}>
                    <div className="group/conv flex items-center gap-1">
                      <Link
                        href={`/dashboard/astra-v2?c=${c.id}`}
                        className={
                          isActive
                            ? "flex-1 rounded-md bg-emerald-100 px-2.5 py-1.5 text-xs font-medium text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
                            : "flex-1 rounded-md px-2.5 py-1.5 text-xs text-slate-700 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                        }
                      >
                        <div className="line-clamp-1 flex items-center gap-1.5">
                          <MessageSquare className="h-3 w-3 shrink-0" />
                          <span className="truncate">{c.title}</span>
                        </div>
                        <div className="mt-0.5 pl-4 text-[10px] text-slate-400 dark:text-slate-500">
                          {c.messageCount} msg · {formatRelative(c.updatedAt)}
                        </div>
                      </Link>
                      <form action={archiveConversationAction}>
                        <input
                          type="hidden"
                          name="conversationId"
                          value={c.id}
                        />
                        <button
                          type="submit"
                          aria-label="Archive conversation"
                          className="opacity-0 transition group-hover/conv:opacity-100 rounded-md p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </form>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </nav>
      </aside>

      {/* Main */}
      <section className="flex flex-1 flex-col">
        <header className="mb-4 flex items-end justify-between gap-6">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              <Bot className="h-3.5 w-3.5" />
              Astra V2
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
              {activeConv ? activeConv.title : "Compliance copilot"}
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
              {activeConv
                ? "This conversation is saved. Continue where you left off."
                : "High-impact tools (mark attested, request evidence) write proposals to your review queue instead of executing directly."}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Badge variant="default">{tools.length} tools</Badge>
            {apiKeyConfigured ? (
              <Badge variant="attested">API key</Badge>
            ) : (
              <Badge variant="expired">Missing API key</Badge>
            )}
          </div>
        </header>

        {!apiKeyConfigured ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
            <strong>ANTHROPIC_API_KEY is not set.</strong> Add it to your Vercel
            environment to enable Astra V2.
          </div>
        ) : (
          <AstraV2Chat
            initialConversationId={activeConv?.id ?? null}
            initialMessages={activeConv?.messages ?? null}
          />
        )}
      </section>
    </div>
  );
}

function formatRelative(date: Date): string {
  const diff = Date.now() - date.getTime();
  const sec = diff / 1000;
  if (sec < 60) return "just now";
  if (sec < 3600) return `${Math.round(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.round(sec / 3600)}h ago`;
  return `${Math.round(sec / 86400)}d ago`;
}
