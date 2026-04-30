"use client";

import * as React from "react";
import {
  Send,
  Bot,
  User as UserIcon,
  Wrench,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/v2/button";
import { Badge } from "@/components/ui/v2/badge";
import { sendV2AstraMessage, sendInConversation } from "./server-actions";
import type {
  V2AstraMessage,
  V2ToolCall,
} from "@/lib/comply-v2/astra-engine.server";

/**
 * Comply V2 Astra chat UI — isolated from the legacy Astra panel.
 *
 * Single-column message thread. Tool calls render inline as cards
 * showing the action name, parameters, and result (success/error/
 * proposal-queued). When Astra creates an AstraProposal, the result
 * card links to /dashboard/proposals so the user can approve it.
 *
 * No persistence — history lives in component state. Refreshing
 * starts over. Phase 2 wires V2AstraConversation Prisma model.
 */

interface ProposalDeferralLike {
  status: "PROPOSED";
  proposalId: string;
  expiresAt: string | Date;
}

function isProposalDeferral(value: unknown): value is ProposalDeferralLike {
  return (
    typeof value === "object" &&
    value !== null &&
    "status" in value &&
    (value as { status: unknown }).status === "PROPOSED" &&
    "proposalId" in value
  );
}

const INITIAL_MESSAGE: V2AstraMessage = {
  role: "assistant",
  content:
    "Hi — I'm Astra V2. I can help you triage compliance items, snooze pending work, request additional evidence, or propose attestations for review. High-impact actions get queued as proposals you approve from /dashboard/proposals. What's up?",
  toolCalls: [],
};

const SUGGESTIONS = [
  "Show me what's due this week",
  "Snooze NIS2 article 32 for 30 days",
  "What approval-gated actions can you take?",
  "Open the Proposals page",
];

export interface AstraV2ChatProps {
  /** When provided, all sends go through the persisted-conversation
   *  path; engine-side fetch ensures we always work against the
   *  authoritative DB history. When null, the chat is ephemeral
   *  ("scratchpad" mode). */
  initialConversationId?: string | null;
  /** Pre-loaded messages for the conversation, server-rendered. */
  initialMessages?: V2AstraMessage[] | null;
}

export function AstraV2Chat({
  initialConversationId = null,
  initialMessages = null,
}: AstraV2ChatProps = {}) {
  const seedHistory =
    initialMessages && initialMessages.length > 0
      ? initialMessages
      : [INITIAL_MESSAGE];
  const [history, setHistory] = React.useState<V2AstraMessage[]>(seedHistory);
  const [input, setInput] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // When the user clicks a different conversation in the sidebar
  // (Server Component re-renders with new initialMessages), reset
  // local state to match.
  React.useEffect(() => {
    setHistory(seedHistory);
    setError(null);
    setInput("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialConversationId]);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [history, pending]);

  const submit = React.useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || pending) return;
      setError(null);
      setPending(true);
      // Optimistically show the user message.
      setHistory((prev) => [...prev, { role: "user", content: trimmed }]);
      setInput("");
      try {
        // Persisted path: conversation lives in DB. Server loads
        // history itself so we don't have to round-trip it.
        // Ephemeral path: send the local history.
        const result = initialConversationId
          ? await sendInConversation(initialConversationId, trimmed)
          : await sendV2AstraMessage(history, trimmed);
        if (result.ok) {
          setHistory(result.history);
        } else {
          setError(result.error);
          // Roll back the optimistic user message — it was never
          // actually sent in a way the engine recorded.
          setHistory((prev) => prev.slice(0, prev.length - 1));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Send failed");
        setHistory((prev) => prev.slice(0, prev.length - 1));
      } finally {
        setPending(false);
      }
    },
    [history, pending, initialConversationId],
  );

  return (
    <div className="palantir-surface flex h-[calc(100vh-180px)] max-w-3xl flex-col rounded-md">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-5">
        <div className="flex flex-col gap-5">
          {history.map((msg, i) => (
            <MessageBubble key={i} message={msg} />
          ))}
          {pending ? (
            <div className="ml-9 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-emerald-400">
              <Loader2 className="h-3 w-3 animate-spin" />
              ASTRA · THINKING
            </div>
          ) : null}
        </div>

        {history.length <= 1 && !pending ? (
          <div className="mt-6 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                disabled={pending}
                onClick={() => submit(s)}
                className="rounded bg-white/[0.02] px-2.5 py-1.5 text-[11px] text-slate-300 ring-1 ring-inset ring-white/[0.06] transition hover:bg-emerald-500/10 hover:text-emerald-300 hover:ring-emerald-500/30 disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="border-t border-red-500/30 bg-red-500/[0.06] px-5 py-2 font-mono text-[11px] text-red-300">
          <AlertCircle className="mr-1 inline-block h-3 w-3 align-text-bottom" />
          {error}
        </div>
      ) : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
        className="flex items-center gap-2 border-t border-white/[0.06] p-3"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={pending}
          placeholder="Ask Astra to triage compliance, snooze items, request evidence…"
          className="flex-1 rounded bg-black/30 px-3 py-2 text-[13px] text-slate-100 placeholder:text-slate-600 ring-1 ring-inset ring-white/[0.06] focus:outline-none focus:ring-1 focus:ring-emerald-500/60 disabled:opacity-50"
        />
        <Button
          type="submit"
          variant="emerald"
          size="default"
          disabled={pending || input.trim().length === 0}
        >
          <Send />
          Send
        </Button>
      </form>
    </div>
  );
}

function MessageBubble({ message }: { message: V2AstraMessage }) {
  if (message.role === "user") {
    return (
      <div className="flex items-start gap-3">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm bg-white/[0.06] text-slate-300 ring-1 ring-inset ring-white/10">
          <UserIcon className="h-3 w-3" />
        </div>
        <div className="flex-1 pt-0.5">
          <div className="font-mono text-[9px] font-medium uppercase tracking-[0.2em] text-slate-500">
            YOU
          </div>
          <p className="mt-1 whitespace-pre-wrap text-[13px] text-slate-100">
            {message.content}
          </p>
        </div>
      </div>
    );
  }

  // Assistant
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-500/30">
        <Bot className="h-3 w-3" />
      </div>
      <div className="flex-1 space-y-3 pt-0.5">
        <div className="font-mono text-[9px] font-medium uppercase tracking-[0.2em] text-emerald-400">
          ASTRA
        </div>
        {message.content.length > 0 ? (
          <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-slate-200">
            {message.content}
          </p>
        ) : null}
        {message.toolCalls.length > 0 ? (
          <div className="space-y-2">
            {message.toolCalls.map((tc) => (
              <ToolCallCard
                key={tc.id}
                name={tc.name}
                input={tc.input}
                result={tc.result}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ToolCallCard({
  name,
  input,
  result,
}: {
  name: string;
  input: Record<string, unknown>;
  result: V2ToolCall["result"];
}) {
  const isProposal = result?.ok && isProposalDeferral(result.data);
  const isError = result && !result.ok;

  return (
    <div
      className={`rounded-md p-3 text-xs ring-1 ring-inset ${
        isError
          ? "bg-red-500/[0.06] ring-red-500/30"
          : isProposal
            ? "bg-amber-500/[0.06] ring-amber-500/30 palantir-stripe-amber"
            : "bg-white/[0.02] ring-white/[0.06]"
      }`}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1.5 font-mono text-[11px] font-medium text-slate-200">
          <Wrench className="h-3 w-3 text-emerald-400" />
          {name}
        </div>
        {isProposal ? (
          <Badge variant="underReview">Proposal queued</Badge>
        ) : isError ? (
          <Badge variant="expired">Failed</Badge>
        ) : result?.ok ? (
          <Badge variant="attested">Done</Badge>
        ) : (
          <Badge variant="pending">In flight</Badge>
        )}
      </div>

      <details className="text-[10px] text-slate-500">
        <summary className="cursor-pointer select-none font-mono uppercase tracking-wider">
          parameters
        </summary>
        <pre className="mt-1 overflow-x-auto rounded bg-black/40 px-2 py-1 font-mono leading-relaxed text-emerald-200 ring-1 ring-inset ring-white/[0.06]">
          {JSON.stringify(input, null, 2)}
        </pre>
      </details>

      {result?.ok ? (
        isProposal && isProposalDeferral(result.data) ? (
          <div className="mt-2 flex items-center gap-2 rounded bg-amber-500/[0.08] px-3 py-2 text-amber-100 ring-1 ring-inset ring-amber-500/30">
            <ShieldCheck className="h-4 w-4 shrink-0 text-amber-300" />
            <div className="flex-1">
              <div className="font-mono text-[11px] font-medium uppercase tracking-wider text-amber-200">
                PROPOSAL QUEUED
              </div>
              <div className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-amber-400">
                Approve · expires{" "}
                {new Date(result.data.expiresAt).toLocaleDateString()}
              </div>
            </div>
            <a
              href={`/dashboard/proposals?tab=pending`}
              className="rounded bg-amber-500/15 px-2 py-1 font-mono text-[10px] font-medium uppercase tracking-wider text-amber-200 ring-1 ring-inset ring-amber-500/40 transition hover:bg-amber-500/25"
            >
              Review
            </a>
          </div>
        ) : (
          <div className="mt-2 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            tool ran successfully
          </div>
        )
      ) : isError ? (
        <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-red-300">
          <AlertCircle className="h-3 w-3" />
          {result.error}
        </div>
      ) : null}
    </div>
  );
}
